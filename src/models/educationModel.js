const mongoose = require("mongoose");

const EducationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    degree: {
      type: String,
      required: true,
      trim: true,
    },

    fieldOfStudy: {
      type: String,
      required: true,
      trim: true,
    },

    schoolName: {
      type: String,
      required: true,
      trim: true,
    },

    startYear: {
      type: Number,
      required: true,
    },

    endYear: {
      type: Number,
    },

    duration: {
        type: Number, 
        required: true,
    },

    currentlyStudying: {
      type: Boolean,
      default: false,
    },

    gpa: {
      type: String,
      default: null,
      trim: true,
    },
    educationScore: {
          type: Number,
          default: 0
        },
    // To store image/logo if needed (optional)
    schoolImage: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Education", EducationSchema);
