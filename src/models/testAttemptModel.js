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


    // Add this in TestAttempt schema (top-level)
violations: [
  {
    type: {
      type: String,
      enum: [
        "TAB_SWITCH",
        "WINDOW_BLUR",
        "FULLSCREEN_EXIT",
        "COPY",
        "PASTE",
        "CONTEXT_MENU",
        "DEVTOOLS",
        "IDLE",
        "OTHER",
      ],
      required: true,
      index: true,
    },
    severity: {
      type: Number, // 1 (low) -> 5 (high)
      default: 1,
      min: 1,
      max: 5,
    },
    meta: {
      type: Object, // { url, key, userAgent, etc }
      default: {},
    },
    at: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
],
cheatAlertSent: {
  type: Boolean,
  default: false
},

integrity: {
  score: { type: Number, default: 100 },   // 0–100
  level: { type: String, default: "Excellent" }
},

violations: [
  {
    type: {
      type: String,
      enum: ["COPY", "PASTE", "TAB_SWITCH"],
      required: true
    },
    at: { type: Date, default: Date.now }
  }
],


  },
  { timestamps: true }
);

module.exports = mongoose.model("TestAttempt", testAttemptSchema);
