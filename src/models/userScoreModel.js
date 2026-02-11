const mongoose = require("mongoose");

const userScoreSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    unique: true,
    required: true
  },

  city: String,
  cityRank: Number,

  state: String,
  stateRank: Number,

  country: String,
  countryRank: Number,

  global: String,
  globalRank: Number,

  educationScore: { type: Number, default: 0 },
  workScore: { type: Number, default: 0 },
  certificationScore: { type: Number, default: 0 },
  awardScore: { type: Number, default: 0 },
  projectScore: { type: Number, default: 0 },
  caseStudyScore: { type: Number, default: 0 },

  experienceIndexScore: { type: Number, default: 0 },
  skillIndexScore: { type: Number, default: 0 },
  hireabilityIndex: { type: Number, default: 0 }

}, { timestamps: true });

/* 🔥 Trigger rank recalculation AFTER save/update */
userScoreSchema.post("save", async function () {
  const { recalculateRanks } = require("../services/rankService");
  await recalculateRanks(this.userId);
});

userScoreSchema.post("findOneAndUpdate", async function (doc) {
  if (doc) {
    const { recalculateRanks } = require("../services/rankService");
    await recalculateRanks(doc.userId);
  }
});

module.exports = mongoose.model("UserScore", userScoreSchema);