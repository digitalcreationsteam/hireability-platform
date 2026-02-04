const mongoose = require("mongoose");

const userCaseAttemptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  caseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CaseStudy",
    required: true
  },
  attemptNumber: {
    type: Number,
    required: true
  },
  currentQuestion: {
    type: Number,
    default: 1
  },
  answers: [
    {
      questionId: mongoose.Schema.Types.ObjectId,
      selectedOption: String
    }
  ],
  score: {
    type: Number,
    default: 0
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  revealUnlocked: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model("UserCaseAttempt", userCaseAttemptSchema);
