const mongoose = require("mongoose");

const skillAssessmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    domain: {
      type: String,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["scheduled", "active", "completed", "expired"],
      default: "scheduled",
    },

    scheduledAt: Date,
    startedAt: Date,
    completedAt: Date,

    totalQuestions: {
      type: Number,
      default: 0,
    },

    correctAnswers: {
      type: Number,
      default: 0,
    },

    skillIndexScore: {
      type: Number, // 0 – 350
      default: 0,
      index: true,
    },

    percentile: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SkillAssessment", skillAssessmentSchema);
