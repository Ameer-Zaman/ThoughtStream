const express = require("express");
const Thought = require("../models/Thought");
const Like = require("../models/Like");
const Comment = require("../models/Comment");
const Follow = require("../models/Follow");
const PollVote = require("../models/PollVote");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const { decorateThoughts } = require("../utils/decorate");
const User = require("../models/User");
const { extractHashtags } = require("../utils/helpers");

const router = express.Router();
router.use(requireAuth);

const visible = { moderationStatus: { $ne: "hidden" } };

async function findFeed(filter, meId, limit = 100) {
  const thoughts = await Thought.find({ ...visible, ...filter })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return decorateThoughts(thoughts, meId);
}

// Create
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const content = String(req.body.content || "").trim();
    if (!content) return res.status(400).json({ message: "Thought can't be empty" });
    if (content.length > 500) return res.status(400).json({ message: "Max 500 characters" });

    // Optional poll: { options: ["A", "B", ...], hours: 24 }
    let pollOptions = [];
    let pollEndsAt;
    if (req.body.poll) {
      pollOptions = (req.body.poll.options || []).map((o) => String(o || "").trim()).filter(Boolean);
      if (pollOptions.length < 2 || pollOptions.length > 4) {
        return res.status(400).json({ message: "A poll needs 2 to 4 options" });
      }
      if (pollOptions.some((o) => o.length > 60)) return res.status(400).json({ message: "Poll options can be 60 characters at most" });
      if (new Set(pollOptions.map((o) => o.toLowerCase())).size !== pollOptions.length) {
        return res.status(400).json({ message: "Poll options must be different" });
      }
      const hours = Math.min(Math.max(Number(req.body.poll.hours) || 24, 1), 24 * 7);
      pollEndsAt = new Date(Date.now() + hours * 3600 * 1000);
    }

    const created = await Thought.create({
      authorId: req.user._id,
      content,
      hashtags: extractHashtags(content),
      pollOptions,
      pollEndsAt,
    });
    const full = await Thought.findById(created._id).lean();
    const [thought] = await decorateThoughts([full], req.user._id);
    res.status(201).json({ thought });
  })
);

// All thoughts, newest first. Optional ?author=<userId> or ?username=<name> for profile pages.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.author) filter.authorId = req.query.author;
    if (req.query.username) {
      const u = await User.findOne({ username: String(req.query.username).toLowerCase() }).select("_id").lean();
      if (!u) return res.json({ thoughts: [] });
      filter.authorId = u._id;
    }
    res.json({ thoughts: await findFeed(filter, req.user._id) });
  })
);

// Trending: likes*2 + comments
router.get(
  "/trending",
  asyncHandler(async (req, res) => {
    const recent = await findFeed({}, req.user._id, 200);
    const scored = recent
      .map((t) => ({ ...t, score: t.likeCount * 2 + t.commentCount }))
      .sort((a, b) => b.score - a.score || new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 50);
    res.json({ thoughts: scored });
  })
);

// Only people I follow
router.get(
  "/following",
  asyncHandler(async (req, res) => {
    const rows = await Follow.find({ follower: req.user._id }).select("following").lean();
    const ids = rows.map((r) => r.following);
    res.json({ thoughts: await findFeed({ authorId: { $in: ids } }, req.user._id) });
  })
);

// Thoughts containing #topic
router.get(
  "/topic/:topic",
  asyncHandler(async (req, res) => {
    const topic = String(req.params.topic).replace(/^#/, "").toLowerCase();
    res.json({ thoughts: await findFeed({ hashtags: topic }, req.user._id) });
  })
);

// Vote in a poll (one vote per person, can't be changed)
router.post(
  "/:id/vote",
  asyncHandler(async (req, res) => {
    const thought = await Thought.findById(req.params.id).lean();
    if (!thought || !thought.pollOptions || !thought.pollOptions.length) {
      return res.status(404).json({ message: "Poll not found" });
    }
    if (thought.pollEndsAt && new Date(thought.pollEndsAt) <= new Date()) {
      return res.status(400).json({ message: "This poll has ended" });
    }
    const optionIndex = Number(req.body.optionIndex);
    if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= thought.pollOptions.length) {
      return res.status(400).json({ message: "Invalid option" });
    }
    // Insert only if this person has not voted yet; otherwise the old vote stays
    await PollVote.updateOne(
      { thoughtId: thought._id, userId: req.user._id },
      { $setOnInsert: { thoughtId: thought._id, userId: req.user._id, optionIndex } },
      { upsert: true }
    );
    const [decorated] = await decorateThoughts([thought], req.user._id);
    res.json({ poll: decorated.poll });
  })
);

// Update own
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const thought = await Thought.findById(req.params.id);
    if (!thought) return res.status(404).json({ message: "Thought not found" });
    if (String(thought.authorId) !== String(req.user._id)) {
      return res.status(403).json({ message: "You can only edit your own thoughts" });
    }
    const content = String(req.body.content || "").trim();
    if (!content) return res.status(400).json({ message: "Thought can't be empty" });
    if (content.length > 500) return res.status(400).json({ message: "Max 500 characters" });

    thought.content = content;
    thought.hashtags = extractHashtags(content);
    thought.isEdited = true;
    await thought.save();
    res.json({ thought: { _id: thought._id, content: thought.content, hashtags: thought.hashtags, isEdited: true } });
  })
);

// Delete own (also removes its likes and comments)
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const thought = await Thought.findById(req.params.id);
    if (!thought) return res.status(404).json({ message: "Thought not found" });
    if (String(thought.authorId) !== String(req.user._id)) {
      return res.status(403).json({ message: "You can only delete your own thoughts" });
    }
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
