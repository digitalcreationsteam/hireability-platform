const mongoose = require("mongoose");

const caseStudySchema = new mongoose.Schema({
  caseCode: {
    type: String,
    required: true,
    unique: true,   // 🔥 very important
    uppercase: true,
    trim: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  
  domainId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Domain",
      required: true,
      index: true,
    },

    // 🔥 DOMAIN SNAPSHOT (denormalized)
    domainName: {
      type: String,
      required: true,
      trim: true,
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
}, { timestamps: true });

module.exports = mongoose.model("CaseStudy", caseStudySchema);
