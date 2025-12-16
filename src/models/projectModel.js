const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  projectName: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: false,
  },
  summary: {
    type: String,
    required: true
  },
  outcome: {
    type: String,
    required: false
  },
  link: {
    type: String,
    default: null
  },
  points: {
    type: Number,
    default: 25   // each project = 25 points
  }
}, { timestamps: true });

module.exports = mongoose.model("Project", projectSchema);
