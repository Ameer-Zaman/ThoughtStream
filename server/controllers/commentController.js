const Comment = require("../models/Comment");
const Thought = require("../models/Thought");

// Create a comment
// Create a comment
const createComment = async (req, res) => {
  try {
    const { thoughtId } = req.params;
    const { content, parentComment } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        message: "Comment cannot be empty",
      });
    }

    if (content.trim().length > 500) {
      return res.status(400).json({
        message: "Comment cannot exceed 500 characters",
      });
    }

    const thought = await Thought.findById(thoughtId);

    if (!thought) {
      return res.status(404).json({
        message: "Thought not found",
      });
    }

    if (parentComment) {
      const parent = await Comment.findById(parentComment);

      if (!parent) {
        return res.status(404).json({
          message: "Parent comment not found",
        });
      }

      if (String(parent.thoughtId) !== String(thoughtId)) {
        return res.status(400).json({
          message: "Invalid parent comment",
        });
      }
    }

    const comment = await Comment.create({
      thoughtId,
      authorId: req.user._id,
      content: content.trim(),
      parentComment: parentComment || null,
    });

    await comment.populate("authorId", "fullName username profilePicture");

    return res.status(201).json({
      message: "Comment added successfully",
      comment,
    });
  } catch (error) {
    console.error("Create comment error:", error);

    return res.status(500).json({
      message: "Failed to create comment",
    });
  }}

// Get comments for a thought
// Get comments for a thought
const getComments = async (req, res) => {
  try {
    const { thoughtId } = req.params;

    const thought = await Thought.findById(thoughtId);

    if (!thought) {
      return res.status(404).json({
        message: "Thought not found",
      });
    }

    const comments = await Comment.find({ thoughtId })
      .populate("authorId", "fullName username profilePicture")
      .sort({ createdAt: -1 });

    const commentCount = await Comment.countDocuments({
      thoughtId,
    });

    return res.status(200).json({
      comments,
      commentCount,
    });
  } catch (error) {
    console.error("Get comments error:", error);

    return res.status(500).json({
      message: "Failed to load comments",
    });
  }
};

// Get comment count for a thought
const getCommentCount = async (req, res) => {
  try {
    const { thoughtId } = req.params;

    const thought = await Thought.findById(thoughtId);

    if (!thought) {
      return res.status(404).json({
        message: "Thought not found",
      });
    }

    const commentCount = await Comment.countDocuments({
      thoughtId,
    });

    return res.status(200).json({
      commentCount,
    });
  } catch (error) {
    console.error("Get comment count error:", error);

    return res.status(500).json({
      message: "Failed to load comment count",
    });
  }
};

module.exports = {
  createComment,
  getComments,
  getCommentCount,
};
