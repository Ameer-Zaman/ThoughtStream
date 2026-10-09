const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      required: true,
      validate: [(arr) => arr.length === 2, "A conversation needs exactly 2 participants"],
    },
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    lastMessageAt: { type: Date },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1, lastMessageAt: -1 });

module.exports = mongoose.model("Conversation", conversationSchema);
