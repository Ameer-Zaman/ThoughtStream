const express = require("express");
const { requireAuth } = require("../middleware/auth");
const ctl = require("../controllers/follow");

const router = express.Router();

router.use(requireAuth);

router.get("/status/:userId", ctl.status);
router.post("/:userId", ctl.follow);
router.delete("/:userId", ctl.unfollow);
router.get("/:userId/followers", ctl.followers);
router.get("/:userId/following", ctl.following);

module.exports = router;
