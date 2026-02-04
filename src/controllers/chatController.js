const Chat = require("../models/chatModel");
const mongoose = require("mongoose");

exports.getChatHistory = async (req, res) => {
  try {
    const myId = req.user?.id || req.user?._id;
    const { otherUserId } = req.params;

    if (!myId) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!otherUserId) return res.status(400).json({ success: false, message: "otherUserId required" });

    const chat = await Chat.findOne({
      participants: {
        $all: [
          new mongoose.Types.ObjectId(myId),
          new mongoose.Types.ObjectId(otherUserId),
        ],
      },
    }).lean();

    const messages = (chat?.messages || []).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (err) {
    console.error("getChatHistory error:", err);
    return res.status(500).json({ success: false, message: "Failed to get chat history" });
  }
};
