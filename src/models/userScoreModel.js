const mongoose = require("mongoose");

const userScoreSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    unique: true,
    required: true
  },

  city: { type: String },
  countryRank: { type: Number },

  state: { type: String },
  stateRank: { type: Number },

  country: { type: String },
  cityRank: { type: Number },

  global: { type: String },
  globalRank: { type: Number },

  
  educationScore: { type: Number, default: 0 },
  workScore: { type: Number, default: 0 },
  certificationScore: { type: Number, default: 0 },
  awardScore: { type: Number, default: 0 },
  projectScore: { type: Number, default: 0 },

  experienceIndexScore: { type: Number, default: 0 },
  skillIndexScore: { type: Number, default: 0 },
  hireabilityIndex: { type: Number, default: 0 }

}, { timestamps: true });


// 🔥 Trigger after hireabilityIndex updates
userScoreSchema.post("save", async function (doc, next) {
  if (doc.isModified("hireabilityIndex")) {
    await recalculateRanks();
  }
  next();
});

module.exports = mongoose.model("UserScore", userScoreSchema);
