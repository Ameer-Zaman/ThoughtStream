const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");

const User = require("../models/User");
const Session = require("../models/Session");
const OTP = require("../models/OTP");
const PasswordResetToken = require("../models/PasswordResetToken");
const Thought = require("../models/Thought");
const Follow = require("../models/Follow");

const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const { createSession, clearSessionCookie, hashToken } = require("../utils/session");
const { sendMail } = require("../utils/mailer");
const { toUser } = require("../utils/helpers");
const { relationship } = require("../utils/follow");
const followCtl = require("../controllers/follow");
const { invalidateToken, invalidateUser } = require("../utils/authCache");

const router = express.Router();
const isProd = () => process.env.NODE_ENV === "production";

// ---------- Signup ----------
router.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const { fullName, username, email, password } = req.body;
    if (!fullName || !username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const uname = String(username).toLowerCase().trim();
    if (!/^[a-z0-9_]{3,20}$/.test(uname)) {
      return res.status(400).json({ message: "Username must be 3-20 characters: letters, numbers, underscore" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    const mail = String(email).toLowerCase().trim();
    const exists = await User.findOne({ $or: [{ email: mail }, { username: uname }] });
    if (exists) {
      return res.status(409).json({
        message: exists.email === mail ? "Email already registered" : "Username already taken",
      });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ fullName: String(fullName).trim(), username: uname, email: mail, password: hashed });
    res.status(201).json({ message: "Account created. Please log in.", userId: user._id });
  })
);

// ---------- Login (step 1): check password, send OTP ----------
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) return res.status(400).json({ message: "Invalid email or password" });
    if (!user.password) {
      return res.status(400).json({ message: "This account uses Google sign-in. Please continue with Google." });
    }
    if (!user.isActive) return res.status(403).json({ message: "This account is disabled" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: "Invalid email or password" });

    const otp = String(crypto.randomInt(100000, 1000000));
    await OTP.deleteMany({ userId: user._id });
    await OTP.create({
      userId: user._id,
      otpHash: hashToken(otp),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    await sendMail({
      to: user.email,
      subject: "Your ThoughtStream login code",
      text: `Your verification code is ${otp}. It expires in 10 minutes.`,
      html: `<p>Your ThoughtStream verification code is:</p><h2>${otp}</h2><p>It expires in 10 minutes.</p>`,
    });

    res.json({ message: "OTP sent to your email", userId: user._id });
  })
);

// ---------- Login (step 2): verify OTP, create session ----------
router.post(
  "/verify-otp",
  asyncHandler(async (req, res) => {
    const { userId, otp } = req.body;
    if (!userId || !otp) return res.status(400).json({ message: "userId and otp are required" });

    const record = await OTP.findOne({ userId, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });
    if (!record || record.otpHash !== hashToken(String(otp).trim())) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }
    await OTP.deleteMany({ userId });

    const user = await User.findById(userId);
    if (!user || !user.isActive) return res.status(400).json({ message: "Invalid or expired code" });

    await createSession(res, user._id);
    res.json({ user: toUser(user, { withEmail: true }) });
  })
);

// ---------- Google login / signup ----------
async function uniqueUsername(base) {
  const clean = base.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 15) || "user";
  let candidate = clean.length >= 3 ? clean : clean + "_user";
  while (await User.exists({ username: candidate })) {
    candidate = `${clean}${crypto.randomInt(100, 9999)}`;
  }
  return candidate;
}

router.post(
  "/google-login",
  asyncHandler(async (req, res) => {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ message: "Missing Google credential" });
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ message: "Google login is not configured on the server" });
    }

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    let payload;
    try {
      const ticket = await client.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ message: "Invalid Google token" });
    }
    if (!payload.email || !payload.email_verified) {
      return res.status(400).json({ message: "Google email is not verified" });
    }

    const email = payload.email.toLowerCase();
    let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email }] });

    if (user) {
      if (!user.isActive) return res.status(403).json({ message: "This account is disabled" });
      if (!user.googleId) {
        user.googleId = payload.sub;
        if (!user.profilePicture && payload.picture) user.profilePicture = payload.picture;
        await user.save();
      }
    } else {
      user = await User.create({
        fullName: payload.name || email.split("@")[0],
        username: await uniqueUsername(email.split("@")[0]),
        email,
        googleId: payload.sub,
        profilePicture: payload.picture || "",
      });
    }

    await createSession(res, user._id);
    res.json({ user: toUser(user, { withEmail: true }) });
  })
);

// ---------- Forgot / reset password ----------
router.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    const response = { message: "If that email exists, a reset link has been sent." };

    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      await PasswordResetToken.deleteMany({ userId: user._id });
      await PasswordResetToken.create({
        userId: user._id,
        tokenHash: hashToken(resetToken),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      const frontend = (process.env.FRONTEND_URL || "http://localhost:5173").split(",")[0].trim();
      const link = `${frontend}/reset-password/${resetToken}`;
      await sendMail({
        to: user.email,
        subject: "Reset your ThoughtStream password",
        text: `Click the link to reset your password (valid for 1 hour): ${link}`,
        html: `<p>Click the link to reset your password (valid for 1 hour):</p><p><a href="${link}">${link}</a></p>`,
      });
      // Returning the token is handy while developing, but never do it in production.
      if (!isProd()) response.resetToken = resetToken;
    }
    res.json(response);
  })
);

router.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: "Token and new password are required" });
    if (String(password).length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

    const record = await PasswordResetToken.findOne({
      tokenHash: hashToken(String(token)),
      expiresAt: { $gt: new Date() },
    });
    if (!record) return res.status(400).json({ message: "Reset link is invalid or has expired" });

    await User.updateOne({ _id: record.userId }, { password: await bcrypt.hash(password, 10) });
    await PasswordResetToken.deleteMany({ userId: record.userId });
    await Session.deleteMany({ userId: record.userId }); // log out everywhere
    invalidateUser(record.userId);
    res.json({ message: "Password updated. You can log in now." });
  })
);

// ---------- Logout ----------
router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const token = req.cookies && req.cookies.session;
    if (token) {
      await Session.deleteOne({ sessionTokenHash: hashToken(token) });
      invalidateToken(token);
    }
    clearSessionCookie(res);
    res.json({ message: "Logged out" });
  })
);

// ---------- Current user / profile ----------
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: toUser(req.user, { withEmail: true }) });
});

router.put(
  "/profile",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { fullName, bio, profilePicture, coverImage } = req.body;
    const update = {};
    if (fullName !== undefined) {
      if (!String(fullName).trim()) return res.status(400).json({ message: "Name can't be empty" });
      update.fullName = String(fullName).trim();
    }
    if (bio !== undefined) {
      if (String(bio).length > 160) return res.status(400).json({ message: "Bio must be 160 characters or less" });
      update.bio = String(bio);
    }
    if (profilePicture !== undefined) update.profilePicture = String(profilePicture).trim();
    if (coverImage !== undefined) update.coverImage = String(coverImage).trim();

    const updated = await User.findByIdAndUpdate(req.user._id, update, { new: true, runValidators: true }).lean();
    invalidateUser(req.user._id);
    res.json({ user: toUser(updated, { withEmail: true }) });
  })
);

// ---------- Follow routes (same handlers as /api/follows) ----------
router.post("/follow/:userId", requireAuth, followCtl.follow);
router.delete("/unfollow/:userId", requireAuth, followCtl.unfollow);
router.get("/followers/:userId", requireAuth, followCtl.followers);
router.get("/following/:userId", requireAuth, followCtl.following);

// ---------- Public profile (keep LAST so it doesn't swallow other routes) ----------
router.get(
  "/:username",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ username: String(req.params.username).toLowerCase() });
    if (!user || !user.isActive) return res.status(404).json({ message: "User not found" });

    const [thoughtsCount, followersCount, followingCount, rel] = await Promise.all([
      Thought.countDocuments({ authorId: user._id, moderationStatus: { $ne: "hidden" } }),
      Follow.countDocuments({ following: user._id }),
      Follow.countDocuments({ follower: user._id }),
      relationship(req.user._id, user._id),
    ]);

    res.json({
      user: toUser(user),
      stats: { thoughtsCount, followersCount, followingCount },
      relationship: rel,
    });
  })
);

module.exports = router;
