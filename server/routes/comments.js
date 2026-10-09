const express = require("express");
const Comment = require("../models/Comment");
const Thought = require("../models/Thought");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const { AUTHOR_FIELDS } = require("../utils/helpers");

const router = express.Router();
router.use(requireAuth);

router.post(
  "/thoughts/:thoughtId",
  asyncHandler(async (req, res) => {
    const content = String(req.body.content || "").trim();
    if (!content) return res.status(400).json({ message: "Comment can't be empty" });
    if (content.length > 500) return res.status(400).json({ message: "Max 500 characters" });

    const thought = await Thought.exists({ _id: req.params.thoughtId });
    if (!thought) return res.status(404).json({ message: "Thought not found" });

    let parentComment = null;
    if (req.body.parentComment) {
      const parent = await Comment.findById(req.body.parentComment);
      if (!parent || String(parent.thoughtId) !== String(req.params.thoughtId)) {
        return res.status(400).json({ message: "Invalid parent comment" });
      }
      parentComment = parent._id;
    }

    const created = await Comment.create({
      authorId: req.user._id,
      thoughtId: req.params.thoughtId,
      content,
      parentComment,
    });
    const comment = await Comment.findById(created._id).populate("authorId", AUTHOR_FIELDS).lean();
    res.status(201).json({ comment });
  })
);

// Flat list, oldest first. The frontend groups replies under their parent.
router.get(
  "/thoughts/:thoughtId",
  asyncHandler(async (req, res) => {
    const comments = await Comment.find({ thoughtId: req.params.thoughtId })
      .sort({ createdAt: 1 })
      .populate("authorId", AUTHOR_FIELDS)
      .lean();
    res.json({ comments: comments.filter((c) => c.authorId) });
  })
);

router.get(
  "/thoughts/:thoughtId/count",
  asyncHandler(async (req, res) => {
    res.json({ count: await Comment.countDocuments({ thoughtId: req.params.thoughtId }) });
  })
);

module.exports = router;
