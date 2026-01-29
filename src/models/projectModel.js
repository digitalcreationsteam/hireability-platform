const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    projectName: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
      required: false,
    },
    outcome: {
      type: String,
      required: false,
    },
    link: {
      type: String,
      required: true,
    },
    projectScore: {
      type: Number,
      default: 3, // each project = 3 points
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Project", projectSchema);
