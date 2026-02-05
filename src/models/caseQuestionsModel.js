const mongoose = require("mongoose");

const caseQuestionSchema = new mongoose.Schema({
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
  order: {
    type: Number,
    required: true
  },
  contextText: String,
  questionText: {
    type: String,
    required: true
  },
  dataTables: Object,
  options: [
    {
      key: String,
      text: String
    }
  ],
  correctOption: {
    type: String,
    required: true,
    select: false
  }
});

module.exports = mongoose.model("CaseQuestion", caseQuestionSchema);
