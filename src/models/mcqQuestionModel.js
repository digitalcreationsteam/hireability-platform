const mongoose = require("mongoose");

const mcqQuestionSchema = new mongoose.Schema(
  {
    domainId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Domain",
      required: true,
    },

    question: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    option1: {
      type: String,
      required: true,
    },
    option2: {
      type: String,
      required: true,
    },
    option3: {
      type: String,
      required: true,
    },
    option4: {
      type: String,
      required: true,
    },

    // store option number OR value
    correctAnswer: {
      type: Number, // 1 | 2 | 3 | 4
      required: true,
      enum: [1, 2, 3, 4],
    },
  },
  { timestamps: true }
);

// Prevent duplicate questions per domain
mcqQuestionSchema.index(
  { domainId: 1, question: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "McqQuestion",
  mcqQuestionSchema
);
