const express = require("express");
const Like = require("../models/Like");
const Thought = require("../models/Thought");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

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
    const exists = await Thought.exists({ _id: req.params.thoughtId });
    if (!exists) return res.status(404).json({ message: "Thought not found" });
    await Like.updateOne(
      { userId: req.user._id, thoughtId: req.params.thoughtId },
      { $setOnInsert: { userId: req.user._id, thoughtId: req.params.thoughtId } },
      { upsert: true }
    );
    res.json(await state(req.params.thoughtId, req.user._id));
  })
);

router.delete(
  "/:thoughtId",
  asyncHandler(async (req, res) => {
    await Like.deleteOne({ userId: req.user._id, thoughtId: req.params.thoughtId });
    res.json(await state(req.params.thoughtId, req.user._id));
  })
);

module.exports = router;
