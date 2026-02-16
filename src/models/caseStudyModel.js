// models/CaseStudy.js

const mongoose = require("mongoose")

const caseStudySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },
    slug: {
      type: String,
      required: true,
      unique: true
    },
    openingImageUrl: {
      type: String,
      required: true
    },
    revealImageUrl: {
      type: String,
      required: true
    },
    totalQuestions: {
      type: Number,
      default: 10
    },
    maxAttempts: {
      type: Number,
      default: 2
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
)

module.exports = mongoose.model("CaseStudy", caseStudySchema)
