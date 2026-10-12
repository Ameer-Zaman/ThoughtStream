const User = require("../models/User");
const Like = require("../models/Like");
const Comment = require("../models/Comment");
const Follow = require("../models/Follow");
const PollVote = require("../models/PollVote");
const Bookmark = require("../models/Bookmark");
const { AUTHOR_FIELDS } = require("./helpers");

// Turns raw vote rows into the poll object the client shows.
// counts: array of vote totals per option, myVote: option index or null
function buildPoll(t, counts, myVote) {
  const total = counts.reduce((a, b) => a + b, 0);
  return {
    options: t.pollOptions.map((text, i) => ({ text, votes: counts[i] || 0 })),
    total,
    myVote: myVote === undefined ? null : myVote,
    endsAt: t.pollEndsAt || null,
    closed: !!t.pollEndsAt && new Date(t.pollEndsAt) <= new Date(),
  };
}

// Takes lean thoughts (authorId is a plain ObjectId, NOT populated) and adds:
// author, likeCount, commentCount, liked, saved, iFollowAuthor
// Authors, like/comment counts, my likes/follows and my bookmarks are all fetched in ONE parallel step.
async function decorateThoughts(thoughts, meId) {
  if (!thoughts.length) return [];

  const ids = thoughts.map((t) => t._id);
  const authorIds = [...new Set(thoughts.map((t) => String(t.authorId)))];

  const pollIds = thoughts.filter((t) => t.pollOptions && t.pollOptions.length).map((t) => t._id);

  const [authors, likeAgg, commentAgg, myLikes, myFollows, myBookmarks, voteAgg, myVotes] = await Promise.all([
    User.find({ _id: { $in: authorIds } }).select(AUTHOR_FIELDS).lean(),
    Like.aggregate([{ $match: { thoughtId: { $in: ids } } }, { $group: { _id: "$thoughtId", n: { $sum: 1 } } }]),
    Comment.aggregate([{ $match: { thoughtId: { $in: ids } } }, { $group: { _id: "$thoughtId", n: { $sum: 1 } } }]),
    Like.find({ userId: meId, thoughtId: { $in: ids } }).select("thoughtId").lean(),
    Follow.find({ follower: meId, following: { $in: authorIds } }).select("following").lean(),
    Bookmark.find({ userId: meId, thoughtId: { $in: ids } }).select("thoughtId").lean(),
    pollIds.length
      ? PollVote.aggregate([
          { $match: { thoughtId: { $in: pollIds } } },
          { $group: { _id: { t: "$thoughtId", o: "$optionIndex" }, n: { $sum: 1 } } },
        ])
      : [],
    pollIds.length ? PollVote.find({ userId: meId, thoughtId: { $in: pollIds } }).select("thoughtId optionIndex").lean() : [],
  ]);

  const authorMap = new Map(authors.map((a) => [String(a._id), a]));
  const likeMap = new Map(likeAgg.map((x) => [String(x._id), x.n]));
  const commentMap = new Map(commentAgg.map((x) => [String(x._id), x.n]));
  const likedSet = new Set(myLikes.map((x) => String(x.thoughtId)));
  const followSet = new Set(myFollows.map((x) => String(x.following)));
  const savedSet = new Set(myBookmarks.map((x) => String(x.thoughtId)));
  const voteCounts = new Map(); // thoughtId -> [count per option]
  voteAgg.forEach((x) => {
    const key = String(x._id.t);
    if (!voteCounts.has(key)) voteCounts.set(key, []);
    voteCounts.get(key)[x._id.o] = x.n;
  });
  const myVoteMap = new Map(myVotes.map((x) => [String(x.thoughtId), x.optionIndex]));

  return thoughts
    .filter((t) => authorMap.has(String(t.authorId)))
    .map((t) => ({
      ...t,
      author: authorMap.get(String(t.authorId)),
      authorId: String(t.authorId),
      likeCount: likeMap.get(String(t._id)) || 0,
      commentCount: commentMap.get(String(t._id)) || 0,
      liked: likedSet.has(String(t._id)),
      saved: savedSet.has(String(t._id)),
      iFollowAuthor: followSet.has(String(t.authorId)),
      poll: t.pollOptions && t.pollOptions.length ? buildPoll(t, voteCounts.get(String(t._id)) || [], myVoteMap.get(String(t._id))) : null,
    }));
}

module.exports = { decorateThoughts, buildPoll };