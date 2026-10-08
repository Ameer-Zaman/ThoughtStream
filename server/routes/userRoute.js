const express = require("express");

const {
  signup,
  login,
  verifyOTP,
  forgotPassword,
  resetPassword,
  googleLogin,
  changePassword,
  logout
} = require("../controllers/userController");

const {
  getUserProfile,
  getMyProfile,
  updateProfile,
} = require("../controllers/profileController");

const {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing
} = require("../controllers/followController");

const authMiddleware = require("../middleware/userMiddleware");

const router = express.Router();

// Authentication routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/verify-otp", verifyOTP);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/google-login", googleLogin);

// Logged-in user's profile
router.get("/me", authMiddleware, getMyProfile);
router.put("/profile", authMiddleware, updateProfile);

// Logout
router.post("/logout", logout);

// Follow user
router.post("/follow/:userId", authMiddleware, followUser);
// Unfollow User
router.delete("/unfollow/:userId", authMiddleware, unfollowUser);

// Getting Followers
router.get("/followers/:userId", authMiddleware, getFollowers);
// Getting Following
router.get("/following/:userId", authMiddleware, getFollowing);

// Public user profile
router.get("/:username", authMiddleware, getUserProfile);

module.exports = router;
