const mongoose = require("mongoose");

const WorkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    jobTitle: {
      type: String,
      required: true,
      trim: true,
    },

    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    startYear: {
      type: Number,
      required: true,
    },

    startMonth: {
      type: Number,
      required: true,
    },

    endYear: {
      type: Number,
      required: true,
    },

    endMonth: {
      type: Number,
      required: true,
    },

    currentlyWorking: {
      type: Boolean,
      default: false,
    },

    description: {
      type: String,
      required: false,
      trim: true,
    },
    typeOfRole: {
      type: String,
      required: true,
      trim: true,
    },
    workScore: {
      type: Number,
      default: 0,
    },
    // Duration auto-calculated if needed
    duration: {
      type: Number, // in months
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WorkExperience", WorkSchema);
