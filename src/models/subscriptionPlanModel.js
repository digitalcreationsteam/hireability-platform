const mongoose = require("mongoose");

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      enum: ["Free", "Basic", "Premium", "Enterprise"],
      unique: true,
    },

    description: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      enum: ["USD", "EUR", "GBP", "INR"],
      default: "USD",
    },

    billingPeriod: {
      type: String,
      enum: ["monthly", "yearly", "lifetime"],
      default: "monthly",
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    maxAssessments: {
      type: Number,
      default: 0, // 999999 = unlimited
    },

    maxCandidates: {
      type: Number,
      default: 0,
    },

    skillIndexAccess: Boolean,
    advancedAnalytics: Boolean,
    prioritySupport: Boolean,
    customBranding: Boolean,
    apiAccess: Boolean,

    trialPeriod: {
      type: Number,
      default: 0,
    },

    order: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  { timestamps: true },
);

subscriptionPlanSchema.index({ isActive: 1, order: 1 });

// module.exports = mongoose.model("SubscriptionPlan", subscriptionPlanSchema);

module.exports = mongoose.model("SubscriptionPlan", subscriptionPlanSchema, "subscriptionPlan",);
