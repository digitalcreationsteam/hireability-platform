const mongoose = require("mongoose");

const universitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

universitySchema.index({ name: "text" });

module.exports = mongoose.model("University", universitySchema);
