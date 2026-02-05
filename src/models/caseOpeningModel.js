const mongoose = require("mongoose");

const caseOpeningSchema = new mongoose.Schema({
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
  caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CaseStudy",
        required: true
    },
  openingText: {
    type: String,
    required: true
  },
  year: String,
  marketContext: String,
  metrics: Object,
  companyHidden: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model("CaseOpening", caseOpeningSchema);
