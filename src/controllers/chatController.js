const Chat = require("../models/chatModel");

/**
 * GET chat history between current user and other user
 */
exports.getChatHistory = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId; // support both patterns
    const { otherUserId } = req.params;

    if (!userId || !otherUserId) {
      return res.status(400).json({ message: "Invalid users" });
    }

    const chat = await Chat.findOne({
      participants: { $all: [userId, otherUserId] },
    }).populate("messages.senderId", "name");

    res.status(200).json(chat?.messages || []);
  } catch (error) {
    console.error("Get chat history error:", error);
    res.status(500).json({ message: "Failed to load chat history" });
  }
};
