const mongoose = require("mongoose");

const awardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  awardName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: null
  },
  year: {
    type: Number,
    required: true
  },
  awardScore: {
    type: Number,
    default: 5   // each award = 50 points
  }
}, { timestamps: true });

module.exports = mongoose.model("Award", awardSchema);
