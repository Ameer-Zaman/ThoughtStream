const mongoose = require("mongoose");

const thoughtSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, maxlength: 500, trim: true },
    images: [{ type: String }],
    hashtags: [{ type: String }],
    // Optional poll: 2-4 text options and a closing time. The votes live in the PollVote collection.
    pollOptions: [{ type: String, maxlength: 60 }],
    pollEndsAt: { type: Date },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    isEdited: { type: Boolean, default: false },
    moderationStatus: { type: String, enum: ["visible", "hidden"], default: "visible" },
  },
  { timestamps: true }
);

thoughtSchema.index({ createdAt: -1 });
thoughtSchema.index({ authorId: 1, createdAt: -1 });
thoughtSchema.index({ content: "text" });

module.exports = mongoose.model("Thought", thoughtSchema);
