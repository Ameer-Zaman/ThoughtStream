const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sessionTokenHash: { type: String, required: true, unique: true, index: true },
    // TTL index: MongoDB deletes the document when expiresAt passes
    expiresAt: { type: Date, required: true, expires: 0 },
    // Refreshed by authCache on each cache miss (at most once every 30s per session).
    // Used for "how long was the user on the site" analytics.
    lastActiveAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Session", sessionSchema);