const express = require("express");

const {
  likeThought,
  unlikeThought,
  getThoughtLikes,
} = require("../controllers/likeController");

const authMiddleware = require("../middleware/userMiddleware");

const router = express.Router();

// Like a thought
router.post("/:thoughtId", authMiddleware, likeThought);

// Unlike a thought
router.delete("/:thoughtId", authMiddleware, unlikeThought);

// Get like count and current user's like status
router.get("/:thoughtId", authMiddleware, getThoughtLikes);

module.exports = router;