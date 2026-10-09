const User = require("../models/User");
const Like = require("../models/Like");
const Comment = require("../models/Comment");
const Follow = require("../models/Follow");
const { AUTHOR_FIELDS } = require("./helpers");

// Takes lean thoughts (authorId is a plain ObjectId, NOT populated) and adds:
// author, likeCount, commentCount, liked, iFollowAuthor
// Authors, like/comment counts and my likes/follows are all fetched in ONE parallel step.
async function decorateThoughts(thoughts, meId) {
  if (!thoughts.length) return [];

  const ids = thoughts.map((t) => t._id);
  const authorIds = [...new Set(thoughts.map((t) => String(t.authorId)))];

  const [authors, likeAgg, commentAgg, myLikes, myFollows] = await Promise.all([
    User.find({ _id: { $in: authorIds } }).select(AUTHOR_FIELDS).lean(),
    Like.aggregate([{ $match: { thoughtId: { $in: ids } } }, { $group: { _id: "$thoughtId", n: { $sum: 1 } } }]),
    Comment.aggregate([{ $match: { thoughtId: { $in: ids } } }, { $group: { _id: "$thoughtId", n: { $sum: 1 } } }]),
    Like.find({ userId: meId, thoughtId: { $in: ids } }).select("thoughtId").lean(),
    Follow.find({ follower: meId, following: { $in: authorIds } }).select("following").lean(),
  ]);

  const authorMap = new Map(authors.map((a) => [String(a._id), a]));
  const likeMap = new Map(likeAgg.map((x) => [String(x._id), x.n]));
  const commentMap = new Map(commentAgg.map((x) => [String(x._id), x.n]));
  const likedSet = new Set(myLikes.map((x) => String(x.thoughtId)));
  const followSet = new Set(myFollows.map((x) => String(x.following)));

  return thoughts
    .filter((t) => authorMap.has(String(t.authorId)))
    .map((t) => ({
      ...t,
      author: authorMap.get(String(t.authorId)),
      authorId: String(t.authorId),
      likeCount: likeMap.get(String(t._id)) || 0,
      commentCount: commentMap.get(String(t._id)) || 0,
      liked: likedSet.has(String(t._id)),
      iFollowAuthor: followSet.has(String(t.authorId)),
    }));
}

module.exports = { decorateThoughts };
