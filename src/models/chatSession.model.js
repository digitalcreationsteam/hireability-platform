const mongoose = require("mongoose");

const chatSessionSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  role: String,
  messages: [
    {
      role: String,
      content: String,
      createdAt: { type: Date, default: Date.now }
    }
  ]
});

module.exports = mongoose.model("ChatSession", chatSessionSchema);
