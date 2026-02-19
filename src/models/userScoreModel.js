const mongoose = require("mongoose");

const userScoreSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    unique: true,
    required: true
  },

  // Personal Info
  city: String,
  state: String,
  country: String,
  university: String,

  // Years of Experience (Critical for cohorts!)
  yearsOfExperience: {
    type: Number,
    default: 0,
    min: 0,
    max: 50
  },

  // Experience Cohort (derived field)
  experienceCohort: {
    type: String,
    enum: ['0-1', '1-2', '2-3', '3-4', '4-5', '5+']
  },

  // Primary Domain (main profession)
  primaryDomain: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Domain"
  },

  primaryDomainName: String,

  // Ranking Fields
  globalRank: Number,
  countryRank: Number,
  stateRank: Number,
  cityRank: Number,
  universityRank: Number,

  // Domain-specific scores
  domainScores: [{
    domainId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Domain"
    },
    domainName: String,
    skillScore: { type: Number, default: 0 },
    domainRank: Number,
    domainCohortRank: Number
  }],

  // Score Components
  educationScore: { type: Number, default: 0 },
  workScore: { type: Number, default: 0 },
  certificationScore: { type: Number, default: 0 },
  awardScore: { type: Number, default: 0 },
  projectScore: { type: Number, default: 0 },
  caseStudyScore: { type: Number, default: 0 },

  // Composite Scores
  experienceIndexScore: { type: Number, default: 0 },
  skillIndexScore: { type: Number, default: 0 },
  hireabilityIndex: { type: Number, default: 0 }

}, { timestamps: true });

// Helper method to determine cohort
userScoreSchema.methods.getCohort = function (years) {
  if (years < 1) return '0-1';
  if (years < 2) return '1-2';
  if (years < 3) return '2-3';
  if (years < 4) return '3-4';
  if (years < 5) return '4-5';
  return '5+';
};

// Pre-save middleware to set experience cohort
userScoreSchema.pre('save', function (next) {
  if (this.yearsOfExperience !== undefined) {
    this.experienceCohort = this.getCohort(this.yearsOfExperience);
  }
  next();
});

// Compound indexes for efficient ranking queries
userScoreSchema.index({ primaryDomain: 1, experienceCohort: 1, hireabilityIndex: -1 });
userScoreSchema.index({ primaryDomain: 1, experienceCohort: 1, country: 1, hireabilityIndex: -1 });
userScoreSchema.index({ primaryDomain: 1, experienceCohort: 1, state: 1, hireabilityIndex: -1 });
userScoreSchema.index({ primaryDomain: 1, experienceCohort: 1, city: 1, hireabilityIndex: -1 });
userScoreSchema.index({ primaryDomain: 1, experienceCohort: 1, university: 1, hireabilityIndex: -1 });
userScoreSchema.index({ "domainScores.domainId": 1, "domainScores.skillScore": -1 });

module.exports = mongoose.model("UserScore", userScoreSchema);