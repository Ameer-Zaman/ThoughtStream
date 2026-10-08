const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");

const User = require("../models/User");
const PasswordResetToken = require("../models/passwordResetToken");
const OTP = require("../models/otp");
const transporter = require("../config/mail");
const Session = require("../models/Session");

// SignUp Controller
const signup = async (req, res) => {
  try {
    const { fullName, username, email, password } = req.body;
    console.log("LOGIN BODY: ", req.body);

    // Validating Each Fileds
    if (!fullName || !username || !email || !password) {
      return res.status(400).json({
        message: "All Fileds are required",
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    }); // Checking wheather if the username or email is already existed or not

    if (existingUser) {
      return res.status(400).json({
        message: "This email or username already exists",
      });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      fullName,
      username,
      email,
      password: hashPassword,
    });
    // This tells Mongoose to create a new document

    return res.status(201).json({
      message: "Account Created Successfully",
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        username: newUser.username,
        email: newUser.email,
      },
    });
    // This sending the sucess response to the front end
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

// Login Controller
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validating
    if (!email || !password) {
      return res.status(400).json({
        message: "Invalid Email or Password",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        // Unauthorize
        message: "Invalid Email or Password",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid Email or Password",
      });
    }

    // OTP SECTION
    const otp = crypto.randomInt(100000, 1000000).toString();
    // This Generate Number from 100000 -> 999999
    // So we always get 6 digit number

    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await OTP.deleteMany({
      userId: user._id,
    });

    await OTP.create({
      userId: user._id,
      otpHash,
      expiresAt,
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Your ThoughtStream Email",
      text: `Your ThoughtStream OTP is ${otp}. It will expires within 5 minutes`,
    });

    return res.status(200).json({
      message: "OTP GENERATED SUCCESSFULLY",
      userId: user._id,
    });
  } catch (error) {
    console.error(error);
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

    // const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    // const otpRecord = await OTP.findOne({
    //   userId,
    //   otpHash,
    // });

    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    const otpRecord = await OTP.findOne({ userId });

    console.log("User ID:", userId);
    console.log("OTP record found:", !!otpRecord);
    console.log("OTP matches:", otpRecord?.otpHash === otpHash);

    if (!otpRecord) {
      return res.status(401).json({
        message: "Invalid OTP",
      });
    }

    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({
        _id: otpRecord._id,
      });

      return res.status(401).json({
        message: "OTP has expired",
      });
    }

    await OTP.deleteOne({
      _id: otpRecord._id,
    });

    const sessionToken = crypto.randomBytes(32).toString("hex");

    const sessionTokenHash = crypto
      .createHash("sha256")
      .update(sessionToken)
      .digest("hex");

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await Session.create({
      userId: otpRecord.userId,
      sessionTokenHash,
      expiresAt,
    });

    res.cookie("session", sessionToken, {
      httpOnly: true,
      secure: false, // making it flase cuz of using localhost
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Login successful",
    });
  } catch (error) {
    console.error(error);

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

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not Found",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    // First it generates 32 random bytes , 32 bite = 256 bits of randomness
    // Then it converts the bytes into hexadecimal character like : a91f73c4d8e20b7a4f6c...
    // Reset token is the actual secret token

    const tokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    // sha256 takes the token and produces a fixed length of hash
    // Then the .update(resetToken) means hash this reset token
    // Finishes the hash and conversts the result into a hexadecimal string.
    // Take the reset token > SHA-256 hash it > give me the hash as a hexadecimal string.

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    // This creates the time when the reset token should expire
    // First returns the current time in milliseconds
    // 15 min x 60 sec x 1000 millisec = 900,000 milliseconds
    // Current time + 15 min that it means

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
    console.error(error);

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

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const resetToken = await PasswordResetToken.findOne({
      tokenHash,
    });

    if (!resetToken) {
      return res.status(400).json({
        message: "Invalid or expired reset token",
      });
    }

    if (resetToken.expiresAt < new Date()) {
      await PasswordResetToken.deleteOne({
        _id: resetToken._id,
      });

      return res.status(400).json({
        message: "Reset token has expired",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await User.findByIdAndUpdate(resetToken.userId, {
      password: hashedPassword,
    });

    await PasswordResetToken.deleteOne({
      _id: resetToken._id,
    });

    return res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateUniqueUsername = async (email) => {
  const baseUsername = email.split("@")[0].toLowerCase();

  let username = baseUsername;
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

    let user = await User.findOne({
      googleId: sub,
    });

    if (!user) {
      user = await User.findOne({
        email,
      });
    }

    if (!user) {
      user = await User.create({
        fullName: name,
        username: await generateUniqueUsername(email),
        email,
        googleId: sub,
        profilePicture: picture,
      });
    } else if (!user.googleId) {
      user.googleId = sub;
      user.profilePicture = picture;

      await user.save();
    }

    // Create a new session for this Google user
    const sessionToken = crypto.randomBytes(32).toString("hex");

    const sessionTokenHash = crypto
      .createHash("sha256")
      .update(sessionToken)
      .digest("hex");

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Remove old sessions for this user
    await Session.deleteMany({
      userId: user._id,
    });

    // Create new session
    await Session.create({
      userId: user._id,
      sessionTokenHash,
      expiresAt,
    });

    // Send the session cookie
    res.cookie("session", sessionToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
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
    console.error(error);

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

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
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
    console.error(error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

const logout = async (req, res) => {
  try {
    const sessionToken = req.cookies.session;

    if (sessionToken) {
      const crypto = require("crypto");

      const sessionTokenHash = crypto
        .createHash("sha256")
        .update(sessionToken)
        .digest("hex");

      await Session.deleteOne({ sessionTokenHash });
    }

    res.clearCookie("session", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
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
  logout
};
