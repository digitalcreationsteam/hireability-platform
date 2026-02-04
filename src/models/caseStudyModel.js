const mongoose = require("mongoose");

const caseStudySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
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
}, { timestamps: true });

module.exports = mongoose.model("CaseStudy", caseStudySchema);
