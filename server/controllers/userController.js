const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");

const User = require("../models/User");
const PasswordResetToken = require("../models/PasswordResetToken");
const OTP = require("../models/OTP");
const transporter = require("../config/mail");
const Session = require("../models/Session");

// SignUp Controller
const signup = async (req, res) => {
  try {
    const { fullName, username, email, password } = req.body;

    if (!fullName || !username || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsername = username.toLowerCase().trim();

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
    });

    if (existingUser) {
      return res.status(400).json({
        message: "This email or username already exists",
      });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      fullName: fullName.trim(),
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashPassword,
    });

    return res.status(201).json({
      message: "Account created successfully",
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        username: newUser.username,
        email: newUser.email,
      },
    });
  } catch (error) {
    console.error("signup error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

// Login Controller
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Guard: Google accounts have no password
    if (!user.password) {
      return res.status(401).json({
        message:
          "This account was created with Google. Please log in with Google.",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // OTP SECTION
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await OTP.deleteMany({ userId: user._id });

    await OTP.create({
      userId: user._id,
      otpHash,
      expiresAt,
    });

    // Send OTP — do not await, so slow SMTP doesn't block the response
    transporter
      .sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Your ThoughtStream Email",
        text: `Your ThoughtStream OTP is ${otp}. It will expire within 5 minutes.`,
      })
      .catch((mailError) => {
        console.error("Failed to send OTP email:", mailError);
      });

    return res.status(200).json({
      message: "OTP generated successfully",
      userId: user._id,
    });
  } catch (error) {
    console.error("login error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

// Verify OTP Controller
const verifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({
        message: "User ID and OTP are required",
      });
    }

    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    const otpRecord = await OTP.findOne({ userId });

    if (!otpRecord) {
      return res.status(401).json({
        message: "Invalid OTP",
      });
    }

    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: otpRecord._id });

      return res.status(401).json({
        message: "OTP has expired",
      });
    }

    if (otpRecord.otpHash !== otpHash) {
      return res.status(401).json({
        message: "Invalid OTP",
      });
    }

    await OTP.deleteOne({ _id: otpRecord._id });

    const sessionToken = crypto.randomBytes(32).toString("hex");

    const sessionTokenHash = crypto
      .createHash("sha256")
      .update(sessionToken)
      .digest("hex");

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await Session.deleteMany({ userId: otpRecord.userId });

    await Session.create({
      userId: otpRecord.userId,
      sessionTokenHash,
      expiresAt,
    });

    res.cookie("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Login successful",
    });
  } catch (error) {
    console.error("verifyOTP error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

// Forgot Password Controller
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    const tokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await PasswordResetToken.deleteMany({ userId: user._id });

    await PasswordResetToken.create({
      userId: user._id,
      tokenHash,
      expiresAt,
    });

    return res.status(200).json({
      message: "Password reset token created",
      resetToken,
    });
  } catch (error) {
    console.error("forgotPassword error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

// Reset Password Controller
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        message: "Token and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const resetToken = await PasswordResetToken.findOne({ tokenHash });

    if (!resetToken) {
      return res.status(400).json({
        message: "Invalid or expired reset token",
      });
    }

    if (resetToken.expiresAt < new Date()) {
      await PasswordResetToken.deleteOne({ _id: resetToken._id });

      return res.status(400).json({
        message: "Reset token has expired",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await User.findByIdAndUpdate(resetToken.userId, {
      password: hashedPassword,
    });

    await PasswordResetToken.deleteOne({ _id: resetToken._id });

    // Invalidate all existing sessions — force re-login
    await Session.deleteMany({ userId: resetToken.userId });

    return res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("resetPassword error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateUniqueUsername = async (email) => {
  const baseUsername = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "");

  let username = baseUsername || "user";
  let count = 1;

  while (await User.findOne({ username })) {
    username = `${baseUsername}${count}`;
    count++;
  }

  return username;
};

const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        message: "Google credential is required",
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const { sub, email, name, picture } = payload;

    let user = await User.findOne({ googleId: sub });

    if (!user) {
      user = await User.findOne({ email: email.toLowerCase().trim() });
    }

    if (!user) {
      user = await User.create({
        fullName: name,
        username: await generateUniqueUsername(email),
        email: email.toLowerCase().trim(),
        googleId: sub,
        profilePicture: picture,
      });
    } else if (!user.googleId) {
      user.googleId = sub;
      if (!user.profilePicture) {
        user.profilePicture = picture;
      }

      await user.save();
    }

    const sessionToken = crypto.randomBytes(32).toString("hex");

    const sessionTokenHash = crypto
      .createHash("sha256")
      .update(sessionToken)
      .digest("hex");

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await Session.deleteMany({ userId: user._id });

    await Session.create({
      userId: user._id,
      sessionTokenHash,
      expiresAt,
    });

    res.cookie("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Google login successful",
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error("googleLogin error:", error);

    return res.status(401).json({
      message: "Google authentication failed",
    });
  }
};

// Change Password Controller
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!user.password) {
      return res.status(400).json({
        message: "This account uses Google login and has no password.",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Current password is incorrect",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;

    await user.save();

    return res.status(200).json({
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("changePassword error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

// Logout Controller
const logout = async (req, res) => {
  try {
    const sessionToken = req.cookies.session;

    if (sessionToken) {
      const sessionTokenHash = crypto
        .createHash("sha256")
        .update(sessionToken)
        .digest("hex");

      await Session.deleteOne({ sessionTokenHash });
    }

    res.clearCookie("session", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    return res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("logout error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  signup,
  login,
  verifyOTP,
  forgotPassword,
  resetPassword,
  googleLogin,
  changePassword,
  logout,
};