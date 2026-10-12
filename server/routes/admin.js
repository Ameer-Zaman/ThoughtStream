const express = require("express");
const User = require("../models/User");
const Thought = require("../models/Thought");
const Comment = require("../models/Comment");
const Like = require("../models/Like");
const Message = require("../models/Message");
const PollVote = require("../models/PollVote");
const Session = require("../models/Session");
const { requireAuth } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");
const asyncHandler = require("../utils/asyncHandler");
const { invalidateUser } = require("../utils/authCache");
const { escapeRegex } = require("../utils/helpers");

const router = express.Router();
router.use(requireAuth, requireAdmin);

// ---------- Overview numbers ----------
router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const [users, newUsers, disabledUsers, thoughts, newThoughts, hiddenThoughts, polls, comments, likes, messages] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ createdAt: { $gte: weekAgo } }),
        User.countDocuments({ isActive: false }),
        Thought.countDocuments(),
        Thought.countDocuments({ createdAt: { $gte: weekAgo } }),
        Thought.countDocuments({ moderationStatus: "hidden" }),
        Thought.countDocuments({ "pollOptions.0": { $exists: true } }),
        Comment.countDocuments(),
        Like.countDocuments(),
        Message.countDocuments(),
      ]);
    res.json({ users, newUsers, disabledUsers, thoughts, newThoughts, hiddenThoughts, polls, comments, likes, messages });
  })
);

// ---------- Session analytics ----------
// Per-day session count and average duration for the last N days (1–90, default 7).
// Days with no sessions still appear with zeros, so the chart has no gaps.
router.get(
  "/sessions/daily",
  asyncHandler(async (req, res) => {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 7, 1), 90);

    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (days - 1));

    const rows = await Session.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $project: {
          day: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" },
          },
          durationMinutes: {
            $divide: [{ $subtract: ["$lastActiveAt", "$createdAt"] }, 60000],
          },
        },
      },
      {
        $group: {
          _id: "$day",
          sessions: { $sum: 1 },
          avgDurationMinutes: { $avg: "$durationMinutes" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const map = new Map(rows.map((r) => [r._id, r]));
    const data = [];

    for (let i = 0; i < days; i += 1) {
      const d = new Date(since);
      d.setUTCDate(since.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      const found = map.get(key);

      data.push({
        date: key,
        sessions: found ? found.sessions : 0,
        avgDurationMinutes: found ? Math.round(found.avgDurationMinutes * 10) / 10 : 0,
      });
    }

    res.json({ days, data });
  })
);

// ---------- Users ----------
router.get(
  "/users",
  asyncHandler(async (req, res) => {
    const filter = {};
    const q = String(req.query.q || "").trim();
    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ username: rx }, { fullName: rx }, { email: rx }];
    }
    const users = await User.find(filter)
      .select("fullName username email role isActive profilePicture createdAt")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ users });
  })
);

// Change a user's role or disable/enable them. Admins can't change themselves (so you can't lock yourself out).
router.patch(
  "/users/:id",
  asyncHandler(async (req, res) => {
    if (String(req.params.id) === String(req.user._id)) {
      return res.status(400).json({ message: "You can't change your own account here" });
    }
    const changes = {};
    if (req.body.role !== undefined) {
      if (!["user", "admin"].includes(req.body.role)) return res.status(400).json({ message: "Invalid role" });
      changes.role = req.body.role;
    }
    if (req.body.isActive !== undefined) changes.isActive = !!req.body.isActive;
    if (!Object.keys(changes).length) return res.status(400).json({ message: "Nothing to change" });

    const user = await User.findByIdAndUpdate(req.params.id, changes, { new: true })
      .select("fullName username email role isActive profilePicture createdAt")
      .lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    // Disabled people are logged out everywhere straight away
    if (changes.isActive === false) await Session.deleteMany({ userId: user._id });
    invalidateUser(user._id);
    res.json({ user });
  })
);

// ---------- Thoughts ----------
router.get(
  "/thoughts",
  asyncHandler(async (req, res) => {
    const filter = {};
    const q = String(req.query.q || "").trim();
    if (q) filter.content = new RegExp(escapeRegex(q), "i");
    if (req.query.status === "hidden") filter.moderationStatus = "hidden";
    const thoughts = await Thought.find(filter).sort({ createdAt: -1 }).limit(50).lean();

    const authors = await User.find({ _id: { $in: thoughts.map((t) => t.authorId) } })
      .select("fullName username")
      .lean();
    const map = new Map(authors.map((a) => [String(a._id), a]));
    res.json({
      thoughts: thoughts.map((t) => ({
        _id: t._id,
        content: t.content,
        createdAt: t.createdAt,
        moderationStatus: t.moderationStatus,
        isPoll: !!(t.pollOptions && t.pollOptions.length),
        author: map.get(String(t.authorId)) || { fullName: "Deleted user", username: "unknown" },
      })),
    });
  })
);

// Hide (removed from every feed) or show again
router.patch(
  "/thoughts/:id",
  asyncHandler(async (req, res) => {
    const status = req.body.moderationStatus;
    if (!["visible", "hidden"].includes(status)) return res.status(400).json({ message: "Invalid status" });
    const thought = await Thought.findByIdAndUpdate(req.params.id, { moderationStatus: status }, { new: true })
      .select("moderationStatus")
      .lean();
    if (!thought) return res.status(404).json({ message: "Thought not found" });
    res.json({ moderationStatus: thought.moderationStatus });
  })
);

// Delete any thought (and its likes, comments and poll votes)
router.delete(
  "/thoughts/:id",
  asyncHandler(async (req, res) => {
    const thought = await Thought.findById(req.params.id);
    if (!thought) return res.status(404).json({ message: "Thought not found" });
    await Promise.all([
      Like.deleteMany({ thoughtId: thought._id }),
      Comment.deleteMany({ thoughtId: thought._id }),
      PollVote.deleteMany({ thoughtId: thought._id }),
      thought.deleteOne(),
    ]);
    res.json({ message: "Deleted" });
  })
);

module.exports = router;