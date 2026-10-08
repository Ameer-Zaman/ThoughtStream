const Thought = require("../models/Thought");

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

// Get all thoughts
const getThoughts = async (req, res) => {
  try {
    const thoughts = await Thought.find()
  .populate("authorId", "fullName username profilePicture")
  .sort({ createdAt: -1 });

    res.status(200).json({ thoughts });
  } catch (error) {
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
    const thoughts = await Thought.aggregate([
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
    ]);

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

    const thoughts = await Thought.find({
      authorId: { $in: followingIds },
    })
      .populate("authorId", "fullName username profilePicture")
      .sort({ createdAt: -1 })
      .limit(50);

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

    const thoughts = await Thought.find({
      content: hashtagPattern,
    })
      .populate("authorId", "fullName username profilePicture")
      .sort({ createdAt: -1 })
      .limit(50);

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