const Thought = require("../models/Thought");
const User = require("../models/User");

const search = async (req, res) => {
  try {
    const rawQuery = req.query.q;

    if (!rawQuery || typeof rawQuery !== "string" || !rawQuery.trim()) {
      return res.status(200).json({
        thoughts: [],
        users: [],
      });
    }

    const query = rawQuery.trim();

    // Escape regex special characters so users can't inject patterns
    const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(safeQuery, "i");

    const [thoughts, users] = await Promise.all([
      Thought.aggregate([
        { $match: { content: regex } },
        {
          $lookup: {
            from: "likes",
            localField: "_id",
            foreignField: "thoughtId",
            as: "likes",
          },
        },
        {
          $lookup: {
            from: "comments",
            localField: "_id",
            foreignField: "thoughtId",
            as: "comments",
          },
        },
        {
          $addFields: {
            likeCount: { $size: "$likes" },
            commentCount: { $size: "$comments" },
            liked: { $in: [req.user._id, "$likes.userId"] },
          },
        },
        { $project: { likes: 0, comments: 0 } },
        { $sort: { createdAt: -1 } },
        { $limit: 30 },
      ]),

      User.find({
        $or: [{ username: regex }, { fullName: regex }],
      })
        .select("fullName username profilePicture bio")
        .limit(20),
    ]);

    await Thought.populate(thoughts, {
      path: "authorId",
      select: "fullName username profilePicture",
    });

    return res.status(200).json({
      thoughts,
      users,
    });
  } catch (error) {
    console.error("search error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  search,
};