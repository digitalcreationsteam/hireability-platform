const mongoose = require("mongoose");

const userScoreSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    unique: true,
    required: true
  },

  educationScore: { type: Number, default: 0 },
  workScore: { type: Number, default: 0 },
  certificationScore: { type: Number, default: 0 },
  awardScore: { type: Number, default: 0 },
  projectScore: { type: Number, default: 0 },

  experienceIndexScore: { type: Number, default: 0 },
  skillIndexScore: { type: Number, default: 0 },
  hireabilityIndex: { type: Number, default: 0 }

}, { timestamps: true });

module.exports = mongoose.model("UserScore", userScoreSchema);
