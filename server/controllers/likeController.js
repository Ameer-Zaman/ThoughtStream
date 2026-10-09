const Like = require("../models/Like");
const Thought = require("../models/Thought");

// Like a thought
const likeThought = async (req, res) => {
  try {
    const { thoughtId } = req.params;
    const userId = req.user._id;

    const thought = await Thought.findById(thoughtId);

    if (!thought) {
      return res.status(404).json({
        message: "Thought not found",
      });
    }

    const existingLike = await Like.findOne({
      thoughtId,
      userId,
    });

    if (existingLike) {
      return res.status(409).json({
        message: "You have already liked this thought",
      });
    }

    await Like.create({
      thoughtId,
      userId,
    });

    const likeCount = await Like.countDocuments({ thoughtId });

    return res.status(201).json({
      message: "Thought liked successfully",
      liked: true,
      likeCount,
    });
  } catch (error) {
    console.error("Like thought error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "You have already liked this thought",
      });
    }

    return res.status(500).json({
      message: "Failed to like thought",
    });
  }
};

// Unlike a thought
const unlikeThought = async (req, res) => {
  try {
    const { thoughtId } = req.params;
    const userId = req.user._id;

    const like = await Like.findOneAndDelete({
      thoughtId,
      userId,
    });

    if (!like) {
      return res.status(404).json({
        message: "Like not found",
      });
    }

    const likeCount = await Like.countDocuments({ thoughtId });

    return res.status(200).json({
      message: "Thought unliked successfully",
      liked: false,
      likeCount,
    });
  } catch (error) {
    console.error("Unlike thought error:", error);

    return res.status(500).json({
      message: "Failed to unlike thought",
    });
  }
};

// Get likes for a thought
const getThoughtLikes = async (req, res) => {
  try {
    const { thoughtId } = req.params;
    const userId = req.user._id;

    const thought = await Thought.findById(thoughtId);

    if (!thought) {
      return res.status(404).json({
        message: "Thought not found",
      });
    }

    const likeCount = await Like.countDocuments({ thoughtId });

    const userLike = await Like.findOne({
      thoughtId,
      userId,
    });

    return res.status(200).json({
      likeCount,
      liked: Boolean(userLike),
    });
  } catch (error) {
    console.error("Get thought likes error:", error);

    return res.status(500).json({
      message: "Failed to get likes",
    });
  }
};

module.exports = {
  likeThought,
  unlikeThought,
  getThoughtLikes,
};