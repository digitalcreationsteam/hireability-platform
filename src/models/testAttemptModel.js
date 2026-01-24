const mongoose = require("mongoose");

const testAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    domainId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Domain",
      required: true,
    },

    subDomainId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubDomain",
      required: false,
    },

    totalQuestions: {
      type: Number,
      default: 20,
    },

    durationMinutes: {
      type: Number,
      default: 25,
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["in_progress", "completed", "expired"],
      default: "in_progress",
      index: true,
    },

    questions: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "McqQuestion",
          required: true,
        },
        selectedOption: {
          type: Number,
          default: null,
        },
        isCorrect: {
          type: Boolean,
          default: null,
        },
        marks: {
          type: Number,
          required: true,
        },
      },
    ],
    skillIndex: {
      type: Number, // 0 – 350
      default: 0,
      index: true,
    },
    rawSkillScore: {
      type: Number,
      default: 0,
    },

    testStatus: {
      type: String,
      enum: ["free", "paid"],
      default: "free",
    },

    normalizedSkillScore: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TestAttempt", testAttemptSchema);
