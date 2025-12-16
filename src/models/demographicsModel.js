const mongoose = require("mongoose");

const demographicsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    fullName: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
    },

    phoneNumber: {
      type: String,
    },

    phoneVisibleToRecruiters: {
      type: Boolean,
      default: false, // 🔐 privacy first
    },

    city: String,
    state: String,
    country: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Demographics", demographicsSchema);
