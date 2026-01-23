const mongoose = require("mongoose");
const { type } = require("os");

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
    startMonth: {
      type: Number,
      required: true,
    },
    startYear: {
      type: Number,
      required: true,
    },

    endYear: {
      type: Number,
    },
    endMonth:{
      type: Number,
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
          required: false,
          trim: true,
        },
    workScore: {
      type: Number,
      default: 0,
    },
    // Duration auto-calculated if needed
    duration: {
      type: Number, // in years
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WorkExperience", WorkSchema);





