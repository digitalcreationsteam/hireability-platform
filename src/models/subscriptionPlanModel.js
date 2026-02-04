// const mongoose = require("mongoose");

// const subscriptionPlanSchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       required: true,
//       enum: ["Free", "Basic", "Premium", "Enterprise"],
//       unique: true,
//     },

//     description: {
//       type: String,
//       required: true,
//     },

//     price: {
//       type: Number,
//       required: true,
//       min: 0,
//     },

//     currency: {
//       type: String,
//       enum: ["USD", "EUR", "GBP", "INR"],
//       default: "USD",
//     },

//     billingPeriod: {
//       type: String,
//       enum: ["monthly", "yearly", "lifetime"],
//       default: "monthly",
//     },

//     isActive: {
//       type: Boolean,
//       default: true,
//       index: true,
//     },

//     maxAssessments: {
//       type: Number,
//       default: 0, // 999999 = unlimited
//     },

//     maxCandidates: {
//       type: Number,
//       default: 0,
//     },

//     skillIndexAccess: Boolean,
//     advancedAnalytics: Boolean,
//     prioritySupport: Boolean,
//     customBranding: Boolean,
//     apiAccess: Boolean,

//     trialPeriod: {
//       type: Number,
//       default: 0,
//     },

//     order: {
//       type: Number,
//       default: 0,
//       index: true,
//     },
//   },
//   { timestamps: true },
// );

// subscriptionPlanSchema.index({ isActive: 1, order: 1 });

// // module.exports = mongoose.model("SubscriptionPlan", subscriptionPlanSchema);

// module.exports = mongoose.model("SubscriptionPlan", subscriptionPlanSchema, "subscriptionPlan",);


const mongoose = require("mongoose");

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      enum: ["Free", "Basic", "Premium", "Enterprise"],
      required: true,
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
      enum: ["monthly", "yearly", "lifetime"], // lifetime = one-time
      default: "monthly",
    },

    trialPeriod: {
      type: Number, // in days
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    order: {
      type: Number,
      default: 0,
      index: true,
    },

    // Limits
    maxAssessments: {
      type: Number,
      default: 0, // 0 = unlimited
    },

    maxCandidates: {
      type: Number,
      default: 0,
    },

    // Feature flags
    skillIndexAccess: { type: Boolean, default: false },
    advancedAnalytics: { type: Boolean, default: false },
    prioritySupport: { type: Boolean, default: false },
    customBranding: { type: Boolean, default: false },
    apiAccess: { type: Boolean, default: false },
  },
  { timestamps: true }
);

subscriptionPlanSchema.index({ isActive: 1, order: 1 });

module.exports = mongoose.model(
  "SubscriptionPlan",
  subscriptionPlanSchema,
  "subscriptionPlan"
);
