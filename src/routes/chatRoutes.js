const express = require("express");
const router = express.Router();
const { getChatHistory } = require("../controllers/chatController");

// If you have auth middleware, use it
// const { protect } = require("../middleware/authMiddleware");

router.get("/:otherUserId", /* protect, */ getChatHistory);

module.exports = router;
