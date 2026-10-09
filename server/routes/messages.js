const express = require("express");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Follow = require("../models/Follow");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const { areMutual } = require("../utils/follow");
const sendMessage = require("../utils/sendMessage");
const { AUTHOR_FIELDS } = require("../utils/helpers");

const router = express.Router();
router.use(requireAuth);

function shape(conv, meId) {
  const other = conv.participants.find((p) => String(p._id) !== String(meId));
  return {
    _id: conv._id,
    otherUser: other,
    lastMessage: conv.lastMessage || null,
    lastMessageAt: conv.lastMessageAt || conv.createdAt,
  };
}

// My conversations, most recent first
router.get(
  "/conversations",
  asyncHandler(async (req, res) => {
    const convs = await Conversation.find({ participants: req.user._id })
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .populate("participants", AUTHOR_FIELDS)
      .populate("lastMessage")
      .lean();
    const conversations = convs
      .filter((c) => c.participants.every(Boolean))
      .map((c) => shape(c, req.user._id));
    res.json({ conversations });
  })
);

// Get or create a conversation with { userId } (must be mutual followers)
router.post(
  "/conversations",
  asyncHandler(async (req, res) => {
    const otherId = req.body.userId;
    if (!otherId) return res.status(400).json({ message: "userId is required" });
    if (String(otherId) === String(req.user._id)) {
      return res.status(400).json({ message: "You can't message yourself" });
    }
    const other = await User.exists({ _id: otherId });
    if (!other) return res.status(404).json({ message: "User not found" });
    if (!(await areMutual(req.user._id, otherId))) {
      return res.status(403).json({ message: "You can only message people who follow you back" });
    }

    let conv = await Conversation.findOne({
      participants: { $all: [req.user._id, otherId], $size: 2 },
    });
    if (!conv) conv = await Conversation.create({ participants: [req.user._id, otherId] });

    const full = await Conversation.findById(conv._id)
      .populate("participants", AUTHOR_FIELDS)
      .populate("lastMessage")
      .lean();
    res.json({ conversation: shape(full, req.user._id) });
  })
);

// Messages in a conversation (oldest first)
router.get(
  "/conversations/:id",
  asyncHandler(async (req, res) => {
    const conv = await Conversation.findById(req.params.id).lean();
    if (!conv || !conv.participants.some((p) => String(p) === String(req.user._id))) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    const messages = await Message.find({ conversationId: conv._id }).sort({ createdAt: -1 }).limit(200).lean();
    res.json({ messages: messages.reverse() });
  })
);

// Send a message over plain HTTP (used when the live socket connection is down)
router.post(
  "/conversations/:id/messages",
  asyncHandler(async (req, res) => {
    const result = await sendMessage(req.app.get("io"), req.user._id, req.params.id, req.body.content);
    if (!result.ok) return res.status(result.status).json({ message: result.error });
    res.status(201).json({ message: result.message });
  })
);

// Users who follow me AND I follow them
router.get(
  "/mutual-followers",
  asyncHandler(async (req, res) => {
    const iFollow = await Follow.find({ follower: req.user._id }).select("following").lean();
    const ids = iFollow.map((f) => f.following);
    const back = await Follow.find({ follower: { $in: ids }, following: req.user._id }).select("follower").lean();
    const mutualIds = back.map((f) => f.follower);
    const users = await User.find({ _id: { $in: mutualIds }, isActive: true }).select(AUTHOR_FIELDS).lean();
    res.json({ users });
  })
);

module.exports = router;
