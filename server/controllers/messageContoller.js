const mongoose = require("mongoose");

const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Follow = require("../models/Follow");
const User = require("../models/User");

// ---------------------------------------------------------
// Here check if two users mutually follow each other
// ---------------------------------------------------------
const areMutualFollowers = async (userIdA, userIdB) => {
  const [aFollowsB, bFollowsA] = await Promise.all([
    Follow.findOne({ follower: userIdA, following: userIdB }),
    Follow.findOne({ follower: userIdB, following: userIdA }),
  ]);

  return Boolean(aFollowsB && bFollowsA);
};

// ---------------------------------------------------------
// Helper: sort two ids so [A, B] and [B, A] match
// ---------------------------------------------------------
const sortParticipantIds = (idA, idB) => {
  return [String(idA), String(idB)].sort();
};

// ---------------------------------------------------------
// POST /api/messages/conversations
// Body: { userId }
// Get or create a conversation with another user.
// ---------------------------------------------------------
const getOrCreateConversation = async (req, res) => {
  try {
    const myId = req.user._id;
    const otherUserId = req.body.userId;

    if (!otherUserId) {
      return res.status(400).json({
        message: "userId is required",
      });
    }

    if (String(myId) === String(otherUserId)) {
      return res.status(400).json({
        message: "You cannot message yourself",
      });
    }

    const otherUser = await User.findById(otherUserId);

    if (!otherUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const mutual = await areMutualFollowers(myId, otherUserId);

    if (!mutual) {
      return res.status(403).json({
        message: "You can only message users who mutually follow you",
      });
    }

    const participants = sortParticipantIds(myId, otherUserId);

    let conversation = await Conversation.findOne({
      participants: { $all: participants, $size: 2 },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants,
      });
    }

    await conversation.populate([
      { path: "participants", select: "fullName username profilePicture" },
      { path: "lastMessage" },
    ]);

    return res.status(200).json({
      message: "Conversation ready",
      conversation,
    });
  } catch (error) {
    console.error("getOrCreateConversation error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

// ---------------------------------------------------------
// GET /api/messages/conversations
// List all conversations for the logged-in user.
// ---------------------------------------------------------
const getConversations = async (req, res) => {
  try {
    const myId = req.user._id;

    const conversations = await Conversation.find({
      participants: myId,
    })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .populate([
        {
          path: "participants",
          select: "fullName username profilePicture",
        },
        {
          path: "lastMessage",
        },
      ]);

    return res.status(200).json({
      message: "Conversations fetched successfully",
      conversations,
    });
  } catch (error) {
    console.error("getConversations error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

// ---------------------------------------------------------
// GET /api/messages/conversations/:id
// Fetch messages for one conversation.
// ---------------------------------------------------------
const getMessages = async (req, res) => {
  try {
    const myId = req.user._id;
    const conversationId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({
        message: "Invalid conversation id",
      });
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        message: "Conversation not found",
      });
    }

    const isParticipant = conversation.participants.some(
      (id) => String(id) === String(myId)
    );

    if (!isParticipant) {
      return res.status(403).json({
        message: "You are not part of this conversation",
      });
    }

    const messages = await Message.find({
      conversationId,
    })
      .sort({ createdAt: 1 })
      .populate({
        path: "senderId",
        select: "fullName username profilePicture",
      });

    return res.status(200).json({
      message: "Messages fetched successfully",
      messages,
    });
  } catch (error) {
    console.error("getMessages error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

// ---------------------------------------------------------
// GET /api/messages/mutual-followers
// List users with whom I have a mutual follow.
// ---------------------------------------------------------
const getMutualFollowers = async (req, res) => {
  try {
    const myId = req.user._id;

    const [myFollowing, myFollowers] = await Promise.all([
      Follow.find({ follower: myId }).select("following"),
      Follow.find({ following: myId }).select("follower"),
    ]);

    const followingIds = myFollowing.map((f) => String(f.following));
    const followerIds = myFollowers.map((f) => String(f.follower));

    // Intersection: users I follow AND who follow me
    const mutualIds = followingIds.filter((id) => followerIds.includes(id));

    const users = await User.find({
      _id: { $in: mutualIds },
    }).select("fullName username profilePicture");

    return res.status(200).json({
      message: "Mutual followers fetched successfully",
      users,
    });
  } catch (error) {
    console.error("getMutualFollowers error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  getOrCreateConversation,
  getConversations,
  getMessages,
  getMutualFollowers
};