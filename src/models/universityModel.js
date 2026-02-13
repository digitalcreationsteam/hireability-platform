const mongoose = require("mongoose");

const universitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
   
  },
  { timestamps: true }
);

// helpful compound index for fast search
universitySchema.index({ name: "text", country: 1 });

module.exports = mongoose.model("University", universitySchema);
