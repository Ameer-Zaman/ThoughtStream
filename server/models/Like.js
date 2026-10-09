const mongoose = require("mongoose");

const likeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    thoughtId: { type: mongoose.Schema.Types.ObjectId, ref: "Thought", required: true },
  },
  { timestamps: true }
);

likeSchema.index({ userId: 1, thoughtId: 1 }, { unique: true });
likeSchema.index({ thoughtId: 1 });

module.exports = mongoose.model("Like", likeSchema);
