const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/userMiddleware");

const {
  getOrCreateConversation,
  getConversations,
  getMessages,
  getMutualFollowers
} = require("../controllers/messageContoller");

// List users I mutually follow (people I can message)
router.get("/mutual-followers", authMiddleware, getMutualFollowers);

// Start (or fetch) a conversation with another user
router.post("/conversations", authMiddleware, getOrCreateConversation);

// List my conversations
router.get("/conversations", authMiddleware, getConversations);

// Get messages inside one conversation
router.get("/conversations/:id", authMiddleware, getMessages);

module.exports = router;