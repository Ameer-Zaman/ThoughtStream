const Follow = require("../models/Follow");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const { relationship } = require("../utils/follow");

const USER_FIELDS = "fullName username profilePicture bio";

exports.follow = asyncHandler(async (req, res) => {
  const targetId = req.params.userId;
  if (String(req.user._id) === String(targetId)) {
    return res.status(400).json({ message: "You can't follow yourself" });
  }
  const target = await User.findById(targetId).select("_id");
  if (!target) return res.status(404).json({ message: "User not found" });

  await Follow.updateOne(
    { follower: req.user._id, following: targetId },
    { $setOnInsert: { follower: req.user._id, following: targetId } },
    { upsert: true }
  );
  res.json(await relationship(req.user._id, targetId));
});

exports.unfollow = asyncHandler(async (req, res) => {
  await Follow.deleteOne({ follower: req.user._id, following: req.params.userId });
  res.json(await relationship(req.user._id, req.params.userId));
});

async function withIFollow(users, meId) {
  const ids = users.map((u) => u._id);
  const mine = await Follow.find({ follower: meId, following: { $in: ids } }).select("following").lean();
  const set = new Set(mine.map((f) => String(f.following)));
  return users.map((u) => ({ ...u, iFollow: set.has(String(u._id)) }));
}

exports.followers = asyncHandler(async (req, res) => {
  const rows = await Follow.find({ following: req.params.userId })
    .sort({ createdAt: -1 })
    .populate("follower", USER_FIELDS)
    .lean();
  const users = rows.map((r) => r.follower).filter(Boolean);
  res.json({ users: await withIFollow(users, req.user._id) });
});

exports.following = asyncHandler(async (req, res) => {
  const rows = await Follow.find({ follower: req.params.userId })
    .sort({ createdAt: -1 })
    .populate("following", USER_FIELDS)
    .lean();
  const users = rows.map((r) => r.following).filter(Boolean);
  res.json({ users: await withIFollow(users, req.user._id) });
});

exports.status = asyncHandler(async (req, res) => {
  res.json(await relationship(req.user._id, req.params.userId));
});
