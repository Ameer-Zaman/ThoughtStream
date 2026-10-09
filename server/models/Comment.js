const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    thoughtId: { type: mongoose.Schema.Types.ObjectId, ref: "Thought", required: true },
    content: { type: String, required: true, trim: true, maxlength: 500 },
    parentComment: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null },
  },
  { timestamps: true }
);

commentSchema.index({ thoughtId: 1, createdAt: 1 });
commentSchema.index({ parentComment: 1 });

module.exports = mongoose.model("Comment", commentSchema);
