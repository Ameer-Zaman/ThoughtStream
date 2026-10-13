const express = require("express");
const Like = require("../models/Like");
const Thought = require("../models/Thought");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const { notify, unnotify, emitTo } = require("../utils/notify");

const router = express.Router();
router.use(requireAuth);

async function state(thoughtId, userId) {
  const [likeCount, mine] = await Promise.all([
    Like.countDocuments({ thoughtId }),
    Like.exists({ thoughtId, userId }),
  ]);
  return { liked: !!mine, likeCount };
}

router.get(
  "/:thoughtId",
  asyncHandler(async (req, res) => {
    res.json(await state(req.params.thoughtId, req.user._id));
  })
);

router.post(
  "/:thoughtId",
  asyncHandler(async (req, res) => {
    const thought = await Thought.findById(req.params.thoughtId).select("authorId").lean();
    if (!thought) return res.status(404).json({ message: "Thought not found" });

    const result = await Like.updateOne(
      { userId: req.user._id, thoughtId: req.params.thoughtId },
      { $setOnInsert: { userId: req.user._id, thoughtId: req.params.thoughtId } },
      { upsert: true }
    );

    // Only notify if this was a NEW like (upsert actually inserted)
    if (result.upsertedCount > 0) {
      const n = await notify({
        recipient: thought.authorId,
        actor: req.user._id,
        type: "like",
        thought: req.params.thoughtId,
      });
      if (n) emitTo(req.app, thought.authorId, "notification", n);
    }

    res.json(await state(req.params.thoughtId, req.user._id));
  })
);

router.delete(
  "/:thoughtId",
  asyncHandler(async (req, res) => {
    const thought = await Thought.findById(req.params.thoughtId).select("authorId").lean();
    if (!thought) return res.status(404).json({ message: "Thought not found" });

    await Like.deleteOne({ userId: req.user._id, thoughtId: req.params.thoughtId });

    await unnotify({
      recipient: thought.authorId,
      actor: req.user._id,
      type: "like",
      thought: req.params.thoughtId,
    });

    res.json(await state(req.params.thoughtId, req.user._id));
  })
);

module.exports = router;
