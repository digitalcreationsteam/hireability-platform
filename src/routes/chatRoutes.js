const express = require("express");
const router = express.Router();
const { getChatHistory, markMessagesAsRead } = require("../controllers/chatController");
const { protect } = require("../middleware/authMiddleware");

// ✅ static first
router.post("/mark-read", protect, markMessagesAsRead);
router.get("/:otherUserId", protect, getChatHistory);

module.exports = router;
