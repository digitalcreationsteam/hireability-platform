const mongoose = require("mongoose");

const mcqQuestionSchema = new mongoose.Schema(
  {
    domainId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Domain",
      required: true,
      index: true,
    },

    subDomainId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubDomain",
      required: false,
      index: true,
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

    option1: { type: String, required: true },
    option2: { type: String, required: true },
    option3: { type: String, required: true },
    option4: { type: String, required: true },

    correctAnswer: {
      type: Number, // 1 | 2 | 3 | 4
      required: true,
      enum: [1, 2, 3, 4],
    },
     difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },
  },
  { timestamps: true }
);

// Prevent duplicate questions per subdomain
mcqQuestionSchema.index(
  { domainId: 1, subDomainId: 1, question: 1 },
  { unique: true }
);

module.exports = mongoose.model("McqQuestion", mcqQuestionSchema);
