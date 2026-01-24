const mongoose = require("mongoose");

const userDomainSkillSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    domainId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Domain",
      required: true,
    },

    subDomainId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubDomain",
      required: false,
    },

    skills: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

// Prevent duplicate domain per user
userDomainSkillSchema.index({ userId: 1, domainId: 1 }, { unique: true });

module.exports = mongoose.model("UserDomainSkill", userDomainSkillSchema);

