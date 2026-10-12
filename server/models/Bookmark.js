const mongoose = require("mongoose");

const bookmarkSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    thoughtId: { type: mongoose.Schema.Types.ObjectId, ref: "Thought", required: true },
  },
  { timestamps: true }
);

bookmarkSchema.index({ userId: 1, thoughtId: 1 }, { unique: true });
bookmarkSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Bookmark", bookmarkSchema);