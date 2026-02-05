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
    // Logical grouping
    planName: {
      type: String,
      enum: ["Free", "Basic", "Premium", "Enterprise"],
      required: true,
      index: true,
    },

    // Product identity (DODO-style)
    productName: {
      type: String, // e.g. "Basic USD"
      required: true,
      unique: true,
    },

    description: {
      type: String,
      required: true,
    },

    billingPeriod: {
      type: String,
      enum: ["monthly", "yearly", "oneTime"],
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      enum: ["USD", "INR", "EUR", "GBP"],
      required: true,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    order: {
      type: Number,
      default: 0,
    },

    // ===============================
    // 🔥 DODO PRODUCT DATA
    // ===============================
    dodo: {
      mode: {
        type: String,
        enum: ["test", "live"],
        default: "test",
      },
      productId: {
        type: String,
        sparse: true,
      },
      paymentLink: {
        type: String,
      },
    },

    // ===============================
    // LIMITS
    // ===============================
    maxAssessments: { type: Number, default: 0 },
    maxCandidates: { type: Number, default: 0 },

    // ===============================
    // FEATURES
    // ===============================
    skillIndexAccess: { type: Boolean, default: false },
    advancedAnalytics: { type: Boolean, default: false },
    prioritySupport: { type: Boolean, default: false },
    customBranding: { type: Boolean, default: false },
    apiAccess: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// subscriptionPlanSchema.index({
//   planName: 1,
//   currency: 1,
//   billingPeriod: 1,
// });

subscriptionPlanSchema.index(
  { planName: 1, currency: 1, billingPeriod: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "SubscriptionPlan",
  subscriptionPlanSchema,
  "subscriptionPlan"
);
