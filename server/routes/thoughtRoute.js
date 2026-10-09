const express = require("express");

const {
  createThought,
  getThoughts,
  updateThought,
  deleteThought,
  getTrendingThoughts,
  getFollowingThoughts,
  getThoughtsByTopic
} = require("../controllers/thoughtController");

const authMiddleware = require("../middleware/userMiddleware");

const router = express.Router();

router.post("/", authMiddleware, createThought);
router.get("/", authMiddleware, getThoughts);
router.get("/trending", authMiddleware, getTrendingThoughts);
router.get("/following", authMiddleware, getFollowingThoughts);
router.get("/topic/:topic", authMiddleware, getThoughtsByTopic);
router.put("/:id", authMiddleware, updateThought);
router.delete("/:id", authMiddleware, deleteThought);

module.exports = router;