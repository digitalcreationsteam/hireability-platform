// models/Question.js

const mongoose = require("mongoose")

const questionSchema = new mongoose.Schema(
  {
    caseStudyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CaseStudy",
      required: true
    },
    questionNumber: {
      type: Number,
      required: true
    },
    questionImageUrl: {
      type: String,
      required: true
    },
    options: [
      {
        key: String,   // A, B, C, D
        text: String
      }
    ],
    correctOption: {
      type: String,   // A, B, C, D
      required: true
    },
    points: {
      type: Number,
      default: 2
    }
  },
  { timestamps: true }
)

questionSchema.index({ caseStudyId: 1, questionNumber: 1 }, { unique: true })

module.exports = mongoose.model("Question", questionSchema)
