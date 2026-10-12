const mongoose = require("mongoose");

// One row per person per poll. The unique index means nobody can vote twice.
const pollVoteSchema = new mongoose.Schema(
  {
    thoughtId: { type: mongoose.Schema.Types.ObjectId, ref: "Thought", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    optionIndex: { type: Number, required: true, min: 0, max: 3 },
  },
  { timestamps: true }
);

pollVoteSchema.index({ thoughtId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("PollVote", pollVoteSchema);
