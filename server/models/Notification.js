const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["like", "comment", "reply", "follow"],
      required: true,
    },
    thought: { type: mongoose.Schema.Types.ObjectId, ref: "Thought", default: null },
    comment: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Dedup: one notification per (recipient, actor, type, thought)
notificationSchema.index(
  { recipient: 1, actor: 1, type: 1, thought: 1 },
  { unique: true, partialFilterExpression: { thought: { $type: "objectId" } } }
);

// For follow: dedup per (recipient, actor, type) when thought is null
notificationSchema.index(
  { recipient: 1, actor: 1, type: 1 },
  { unique: true, partialFilterExpression: { thought: null } }
);

// List query
notificationSchema.index({ recipient: 1, createdAt: -1 });
// Unread count query
notificationSchema.index({ recipient: 1, read: 1 });
// TTL: auto-delete after 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model("Notification", notificationSchema);