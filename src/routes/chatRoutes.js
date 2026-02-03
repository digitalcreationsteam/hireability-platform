const express = require("express");
const router = express.Router();
const { getChatHistory, markMessagesAsRead } = require("../controllers/chatController");

// If you have auth middleware, use it
// const { protect } = require("../middleware/authMiddleware");

router.get("/:otherUserId", /* protect, */ getChatHistory);
router.post("/mark-read", markMessagesAsRead);

module.exports = router;
