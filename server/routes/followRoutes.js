const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/userMiddleware");

const {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFollowStatus
} = require("../controllers/followController");

router.get("/status/:userId", authMiddleware, getFollowStatus);

router.post("/:userId", authMiddleware, followUser);

router.delete("/:userId", authMiddleware, unfollowUser);

router.get("/:userId/followers", authMiddleware, getFollowers);

router.get("/:userId/following", authMiddleware, getFollowing);

module.exports = router;