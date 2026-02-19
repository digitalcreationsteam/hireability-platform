// models/CaseAttempt.js

const mongoose = require("mongoose")

const caseAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    caseStudyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CaseStudy",
      required: true
    },
    attemptNumber: {
      type: Number,
      required: true
    },
    answers: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Question"
        },
        selectedOption: String,
        isCorrect: Boolean,
        pointsEarned: Number
      }
    ],
    totalScore: {
      type: Number,
      default: 0
    },
    isCompleted: {
      type: Boolean,
      default: false
    },
    revealViewed: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
)

module.exports = mongoose.model("CaseAttempt", caseAttemptSchema)
