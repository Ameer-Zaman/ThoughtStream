const Follow = require("../models/Follow");
const User = require("../models/User");

const followUser = async (req, res) => {
  try {
    const followerId = req.user._id; // Logged in user iid
    const followingId = req.params.userId; // Target user's id

    if (followerId.toString() === followingId.toString()) {
      return res.status(400).json({
        message: "You cant follow your self",
      });
    }

    const targetUser = await User.findById(followingId);

    if (!targetUser) {
      return res.status(404).json({
        message: "User Not Found",
      });
    }

    const existingFollow = await Follow.findOne({
      follower: followerId,
      following: followingId,
    });

    if (existingFollow) {
      return res.status(400).json({
        message: "You are Already Follwing this User",
      });
    }

    const newFollow = await Follow.create({
      follower: followerId,
      following: followingId,
    });

    return res.status(201).json({
      message: "User Followed Succesfully",
      follow: newFollow,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

const unfollowUser = async (req, res) => {
    try {

        const followerId = req.user._id;
        const followingId = req.params.userId;

        const existingFollow = await Follow.findOne({
            follower : followerId,
            following : followingId
        })

        if(!existingFollow){
            return res.status(404).json({
                message : "You are not follownig this user"
            })
        }

        const deleteResult = await existingFollow.deleteOne();

        return res.status(200).json({
            message : "User unfollowed Successfullu",
            deleteResult
        })

    } catch(error){
        return res.status(500).json({
            message: "Internal Server Error"
        })
    }
}

const getFollowers = async (req, res) => {
    try {

        const userId = req.params.userId;

        const followers = await Follow.find({
            following : userId
        }).populate("follower")
        // populate using that refernce to replace the followers ID with the 
        // corresponding user document

        return res.status(200).json({
          message : "Followers fetched successfully",
          followers
        })

    }catch(error){
        return res.status(500).json({
            message : "Internal Server Error"
        })
    }
}

const getFollowing = async (req, res) => {
  try {
    const userId = req.params.userId;

    const following = await Follow.find({
      follower: userId
    }).populate("following");

    return res.status(200).json({
      message: "Following fetched successfully",
      following
    });

  } catch (error) {
    console.error("Failed to load following users:", error);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
};

const getFollowStatus = async (req, res) => {
  try {
    const myId = req.user._id;
    const otherUserId = req.params.userId;

    if (String(myId) === String(otherUserId)) {
      return res.status(400).json({
        message: "Cannot check follow status with yourself",
      });
    }

    const [iFollowThem, theyFollowMe] = await Promise.all([
      Follow.findOne({ follower: myId, following: otherUserId }),
      Follow.findOne({ follower: otherUserId, following: myId }),
    ]);

    return res.status(200).json({
      iFollowThem: Boolean(iFollowThem),
      theyFollowMe: Boolean(theyFollowMe),
      mutual: Boolean(iFollowThem && theyFollowMe),
    });
  } catch (error) {
    console.error("getFollowStatus error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

module.exports = {
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    getFollowStatus
}