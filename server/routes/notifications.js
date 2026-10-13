const express = require("express");
const Notification = require("../models/Notification");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const { AUTHOR_FIELDS } = require("../utils/helpers");

const router = express.Router();
router.use(requireAuth);

// List my notifications, newest first
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("actor", AUTHOR_FIELDS)
      .populate("thought", "content")
      .populate("comment", "content")
      .lean();
    res.json({ notifications });
  })
);

// Unread count (for the badge)
router.get(
  "/unread-count",
  asyncHandler(async (req, res) => {
    const count = await Notification.countDocuments({ recipient: req.user._id, read: false });
    res.json({ count });
  })
);

// Mark one as read
router.patch(
  "/:id/read",
  asyncHandler(async (req, res) => {
    await Notification.updateOne(
      { _id: req.params.id, recipient: req.user._id },
      { read: true }
    );
    res.json({ ok: true });
  })
);

// Mark all as read
router.patch(
  "/read-all",
  asyncHandler(async (req, res) => {
    await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
    res.json({ ok: true });
  })
);

module.exports = router;