const mongoose = require("mongoose");

const subDomainSchema = new mongoose.Schema(
  {
    domainId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Domain",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate subdomains under same domain
subDomainSchema.index(
  { domainId: 1, name: 1 },
  { unique: true }
);

module.exports = mongoose.model("SubDomain", subDomainSchema);
