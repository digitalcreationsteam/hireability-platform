const mongoose = require("mongoose");

const userDomainSkillSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  domainId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Domain",
    required: true
  },
  subDomainId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SubDomain"
  },
  skills: [{
    type: String
  }]
}, { timestamps: true });

// Compound index to ensure unique combination
userDomainSkillSchema.index({ userId: 1, domainId: 1, subDomainId: 1 }, { unique: true });

module.exports = mongoose.model("UserDomainSkill", userDomainSkillSchema);