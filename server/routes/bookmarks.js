const express = require("express");
const Bookmark = require("../models/Bookmark");
const Thought = require("../models/Thought");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const { decorateThoughts } = require("../utils/decorate");

const router = express.Router();
router.use(requireAuth);

async function state(thoughtId, userId) {
  const saved = await Bookmark.exists({ thoughtId, userId });
  return { saved: !!saved };
}

// GET /api/bookmarks — every thought the current user has saved, newest first
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const bookmarks = await Bookmark.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const ids = bookmarks.map((b) => b.thoughtId);

    const raw = await Thought.find({ _id: { $in: ids } }).lean();

    // decorateThoughts adds author, liked, saved, likeCount, commentCount,
    // iFollowAuthor, poll — same shape every other feed returns.
    const decorated = await decorateThoughts(raw, req.user._id);

    // Preserve bookmark order (newest saved first)
    const byId = new Map(decorated.map((t) => [String(t._id), t]));
    const ordered = ids.map((id) => byId.get(String(id))).filter(Boolean);

    res.json({ thoughts: ordered });
  })
);

// GET /api/bookmarks/:thoughtId — has the current user saved this?
router.get(
  "/:thoughtId",
  asyncHandler(async (req, res) => {
    res.json(await state(req.params.thoughtId, req.user._id));
  })
);

// POST /api/bookmarks/:thoughtId — save (idempotent)
router.post(
  "/:thoughtId",
  asyncHandler(async (req, res) => {
    const exists = await Thought.exists({ _id: req.params.thoughtId });
    if (!exists) return res.status(404).json({ message: "Thought not found" });

    await Bookmark.updateOne(
      { userId: req.user._id, thoughtId: req.params.thoughtId },
      { $setOnInsert: { userId: req.user._id, thoughtId: req.params.thoughtId } },
      { upsert: true }
    );

    res.json(await state(req.params.thoughtId, req.user._id));
  })
);

// DELETE /api/bookmarks/:thoughtId — unsave (idempotent)
router.delete(
  "/:thoughtId",
  asyncHandler(async (req, res) => {
    await Bookmark.deleteOne({ userId: req.user._id, thoughtId: req.params.thoughtId });
    res.json(await state(req.params.thoughtId, req.user._id));
  })
);

module.exports = router;