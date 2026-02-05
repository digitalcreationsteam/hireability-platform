const mongoose = require("mongoose");

const caseRevealSchema = new mongoose.Schema({
  caseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CaseStudy",
    required: true
  },
  caseCode: {
  type: String,
  required: true,
  uppercase: true,
  trim: true
},
  realCompanyName: String,
  fullStory: String,
  decisionBreakdown: [
    {
      questionOrder: Number,
      correctAnswer: String,
      explanation: String,
      lesson: String
    }
  ]
});

module.exports = mongoose.model("CaseReveal", caseRevealSchema);
