const mongoose = require("mongoose");

const likeSchema = new mongoose.Schema(
  {
    thoughtId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Thought",
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent a user from liking the same thought twice
likeSchema.index(
  { thoughtId: 1, userId: 1 },
  { unique: true }
);

module.exports = mongoose.model("Like", likeSchema);