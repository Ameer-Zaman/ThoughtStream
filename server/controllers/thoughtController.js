const mongoose = require("mongoose");
const Thought = require("../models/Thought");
const User = require("../models/User");

// ---------------------------------------------------------
// Shared pipeline: attaches likeCount, commentCount and
// whether the current user liked each thought, in a single
// database round trip (instead of the client calling
// /api/likes/:id and /api/comments/thoughts/:id once per
// thought, which is what made every feed slow).
// ---------------------------------------------------------
const withEngagement = async (matchStage, currentUserId, { sort, limit } = {}) => {
  const pipeline = [
    { $match: matchStage },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "thoughtId",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "thoughtId",
        as: "comments",
      },
    },
    {
      $addFields: {
        likeCount: { $size: "$likes" },
        commentCount: { $size: "$comments" },
        liked: currentUserId
          ? { $in: [currentUserId, "$likes.userId"] }
          : false,
      },
    },
    { $project: { likes: 0, comments: 0 } },
  ];

  if (sort) pipeline.push({ $sort: sort });
  if (limit) pipeline.push({ $limit: limit });

  const thoughts = await Thought.aggregate(pipeline);

  await Thought.populate(thoughts, {
    path: "authorId",
    select: "fullName username profilePicture",
  });

  return thoughts;
};

// Create a thought
const createThought = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        message: "Thought cannot be empty",
      });
    }

    if (content.length > 500) {
      return res.status(400).json({
        message: "Thought cannot exceed 500 characters",
      });
    }

    const thought = await Thought.create({
      authorId: req.user._id,
      content: content.trim(),
    });

    res.status(201).json({
      message: "Thought created successfully",
      thought,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create thought",
    });
  }
};

// Get thoughts — supports an optional ?username= filter (used by
// the Profile page) so the client no longer has to download every
// thought in the system and filter it locally.
const getThoughts = async (req, res) => {
  try {
    const matchStage = {};

    if (req.query.username) {
      const author = await User.findOne({
        username: String(req.query.username).toLowerCase(),
      }).select("_id");

      if (!author) {
        return res.status(200).json({ thoughts: [] });
      }

      matchStage.authorId = author._id;
    }

    const thoughts = await withEngagement(matchStage, req.user._id, {
      sort: { createdAt: -1 },
      limit: 50,
    });

    res.status(200).json({ thoughts });
  } catch (error) {
    console.error("getThoughts error:", error);

    res.status(500).json({
      message: "Failed to load thoughts",
    });
  }
};

// Update a thought
const updateThought = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (typeof content !== "string" || !content.trim()) {
      return res.status(400).json({
        message: "Thought cannot be empty",
      });
    }

    if (content.trim().length > 500) {
      return res.status(400).json({
        message: "Thought cannot exceed 500 characters",
      });
    }

    const thought = await Thought.findById(id);

    if (!thought) {
      return res.status(404).json({
        message: "Thought not found",
      });
    }

    if (thought.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You can only edit your own thoughts",
      });
    }

    thought.content = content.trim();
    thought.isEdited = true;

    await thought.save();

    res.status(200).json({
      message: "Thought updated successfully",
      thought,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update thought",
    });
  }
};

// Delete a thought
const deleteThought = async (req, res) => {
  try {
    const { id } = req.params;

    const thought = await Thought.findById(id);

    if (!thought) {
      return res.status(404).json({
        message: "Thought not found",
      });
    }

    if (thought.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You can only delete your own thoughts",
      });
    }

    await thought.deleteOne();

    res.status(200).json({
      message: "Thought deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete thought",
    });
  }
};

const getTrendingThoughts = async (req, res) => {
  try {
    const pipeline = [
      { $match: {} },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "thoughtId",
          as: "likes",
        },
      },
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "thoughtId",
          as: "comments",
        },
      },
      {
        $addFields: {
          likeCount: { $size: "$likes" },
          commentCount: { $size: "$comments" },
          liked: { $in: [req.user._id, "$likes.userId"] },
          score: {
            $add: [
              { $multiply: [{ $size: "$likes" }, 2] },
              { $size: "$comments" },
            ],
          },
        },
      },
      { $sort: { score: -1, createdAt: -1 } },
      { $limit: 30 },
      { $project: { likes: 0, comments: 0 } },
    ];

    const thoughts = await Thought.aggregate(pipeline);

    await Thought.populate(thoughts, {
      path: "authorId",
      select: "fullName username profilePicture",
    });

    return res.status(200).json({ thoughts });
  } catch (error) {
    console.error("getTrendingThoughts error:", error);

    return res.status(500).json({
      message: "Failed to load trending thoughts",
    });
  }
};

const getFollowingThoughts = async (req, res) => {
  try {
    const Follow = require("../models/Follow");

    const followingRecords = await Follow.find({
      follower: req.user._id,
    }).select("following");

    const followingIds = followingRecords.map((r) => r.following);

    if (followingIds.length === 0) {
      return res.status(200).json({ thoughts: [] });
    }

    const thoughts = await withEngagement(
      { authorId: { $in: followingIds } },
      req.user._id,
      { sort: { createdAt: -1 }, limit: 50 },
    );

    return res.status(200).json({ thoughts });
  } catch (error) {
    console.error("getFollowingThoughts error:", error);

    return res.status(500).json({
      message: "Failed to load following thoughts",
    });
  }
};

const getThoughtsByTopic = async (req, res) => {
  try {
    const { topic } = req.params;

    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return res.status(400).json({
        message: "Topic is required",
      });
    }

    // Escape regex special chars
    const safeTopic = topic
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Match #topic as a whole word: preceded by start/space/punctuation,
    // followed by end/space/punctuation. Case-insensitive.
    const hashtagPattern = new RegExp(
      `#${safeTopic}(?![A-Za-z0-9_])`,
      "i",
    );

    const thoughts = await withEngagement(
      { content: hashtagPattern },
      req.user._id,
      { sort: { createdAt: -1 }, limit: 50 },
    );

    return res.status(200).json({ thoughts });
  } catch (error) {
    console.error("getThoughtsByTopic error:", error);

    return res.status(500).json({
      message: "Failed to load topic thoughts",
    });
  }
};

module.exports = {
  createThought,
  getThoughts,
  updateThought,
  deleteThought,
  getTrendingThoughts,
  getFollowingThoughts,
  getThoughtsByTopic
};
