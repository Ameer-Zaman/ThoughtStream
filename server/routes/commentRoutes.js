const express = require("express");

const {
  createComment,
  getComments,
  getCommentCount
} = require("../controllers/commentController");

const authMiddleware = require("../middleware/userMiddleware");

const router = express.Router();

// Create a comment on a thought
router.post(
  "/thoughts/:thoughtId",
  authMiddleware,
  createComment
);

// Get comments for a thought
router.get(
  "/thoughts/:thoughtId",
  authMiddleware,
  getComments
);

router.get(
  "/thoughts/:thoughtId/count",
  authMiddleware,
  getCommentCount,
);

module.exports = router;