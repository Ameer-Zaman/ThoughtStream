const User = require("../models/User");
const Thought = require("../models/Thought");
const Follow = require("../models/Follow");

// Get a user's public profile
const getUserProfile = async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username }).select(
      "fullName username profilePicture coverImage bio createdAt"
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const thoughtCount = await Thought.countDocuments({
      authorId: user._id,
      moderationStatus: "visible",
    });

    const followersCount = await Follow.countDocuments({
      following : user._id
    })

    const followingCount = await Follow.countDocuments({
      follower : user._id
    })

    return res.status(200).json({
      user,
      thoughtCount,
      followersCount,
      followingCount
    });
    
  } catch (error) {
    console.error("Get user profile error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

// Get the logged-in user's profile
const getMyProfile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;

    const user = await User.findById(userId).select(
      "fullName username email profilePicture coverImage bio createdAt"
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const followersCount = await Follow.countDocuments({
      following : userId
    })

    const followingCount = await Follow.countDocuments({
      follower : userId
    })

    return res.status(200).json({
      user,
      followersCount,
      followingCount
    });
  } catch (error) {
    console.error("Get my profile error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

// Update the logged-in user's profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const { fullName, bio, profilePicture, coverImage } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (fullName !== undefined) {
      if (typeof fullName !== "string" || !fullName.trim()) {
        return res.status(400).json({
          message: "Full name cannot be empty",
        });
      }

      user.fullName = fullName.trim();
    }

    if (bio !== undefined) {
      if (typeof bio !== "string" || bio.length > 160) {
        return res.status(400).json({
          message: "Bio must be a string with at most 160 characters",
        });
      }

      user.bio = bio.trim();
    }

    if (profilePicture !== undefined) {
      if (typeof profilePicture !== "string") {
        return res.status(400).json({
          message: "Profile picture must be a string",
        });
      }

      user.profilePicture = profilePicture.trim();
    }

    if (coverImage !== undefined) {
      if (typeof coverImage !== "string") {
        return res.status(400).json({
          message: "Cover image must be a string",
        });
      }

      user.coverImage = coverImage.trim();
    }

    await user.save();

    return res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        coverImage: user.coverImage,
        bio: user.bio,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  getUserProfile,
  getMyProfile,
  updateProfile,
};