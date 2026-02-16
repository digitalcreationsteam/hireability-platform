const mongoose = require("mongoose");

// Plan Feature Schema
const planFeatureSchema = new mongoose.Schema(
  {
    subscriptionPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan", // Reference to your existing model
      required: true,
    },

    features: [
      {
        type: String,
        required: true,
      },
    ],
  },
  { timestamps: true }
);

// Limit to exactly 4 features using a pre-save hook
planFeatureSchema.pre("save", function (next) {
  if (this.features.length !== 4) {
    return next(new Error("Exactly 4 features are required"));
  }
  next();
});

module.exports = mongoose.model(
  "PlanFeature",
  planFeatureSchema,
  "planFeature"
);
