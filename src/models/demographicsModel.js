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
      required: [true, "Full name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      unique: true,
      validate: {
        validator: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: "Invalid email format",
      },
    },

    phoneNumber: {
      type: String,
      unique: true,
      sparse: true, // ⭐ allows multiple NULL values
      trim: true,
      validate: {
        validator: v => !v || /^(\+?\d{1,3}[- ]?)?\d{10}$/.test(v),
        message: "Invalid phone number",
      },
    },

    phoneVisibleToRecruiters: {
      type: Boolean,
      default: false,
    },

    city: String,
    state: String,
    country: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Demographics", demographicsSchema);
