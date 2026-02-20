const mongoose = require("mongoose");

const universitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    normalizedName: { type: String, index: true }, // For searching
    country: String,
    countryCode: String,
    alphaTwoCode: String,
    stateProvince: String,
    domains: [String], // Email domains
    webPages: [String]
  },
  { timestamps: true }
);

universitySchema.index({ name: "text" });
universitySchema.index({ normalizedName: 1 });

module.exports = mongoose.model("University", universitySchema);