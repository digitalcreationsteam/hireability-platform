const mongoose = require("mongoose");

const attemptLimitSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    domainId: { type: mongoose.Schema.Types.ObjectId, required: true },
    subDomainId: { type: mongoose.Schema.Types.ObjectId, required: true },

    defaultUsed: { type: Boolean, default: false },
    freeRetakeUsed: { type: Boolean, default: false },
    paidRetakeUsed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

attemptLimitSchema.index(
  { userId: 1, domainId: 1, subDomainId: 1 },
  { unique: true }
);

module.exports = mongoose.model("AttemptLimit", attemptLimitSchema);
