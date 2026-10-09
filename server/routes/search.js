const express = require("express");
const Thought = require("../models/Thought");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const { decorateThoughts } = require("../utils/decorate");
const { AUTHOR_FIELDS, escapeRegex } = require("../utils/helpers");

const router = express.Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || "").trim();
    if (!q) return res.json({ thoughts: [], users: [] });

    const rx = new RegExp(escapeRegex(q.replace(/^#/, "")), "i");

    const [users, rawThoughts] = await Promise.all([
      User.find({ isActive: true, $or: [{ fullName: rx }, { username: rx }] })
        .select(`${AUTHOR_FIELDS} bio`)
        .limit(10)
        .lean(),
      Thought.find({ moderationStatus: { $ne: "hidden" }, content: rx })
        .sort({ createdAt: -1 })
        .limit(30)
        .lean(),
    ]);

    res.json({ users, thoughts: await decorateThoughts(rawThoughts, req.user._id) });
  })
);

module.exports = router;
