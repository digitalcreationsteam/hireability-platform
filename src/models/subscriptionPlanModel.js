const mongoose = require("mongoose");

const subscriptionPlanSchema = new mongoose.Schema(
  {
    planName: {
      type: String,
      enum: ["Free", "Basic", "Premium", "Enterprise"],
      required: true,
      index: true,
    },

    productName: {
      type: String,
      required: true,
      unique: true,
    },

    description: {
      type: String,
      required: true,
    },

    features: {
      hackathonAccess: { type: Boolean, default: false },
      caseStudyAccess: { type: Boolean, default: false },
    },

    billingPeriod: {
      type: String,
      enum: ["monthly", "yearly", "oneTime"],
      required: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
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

    // Tracks which Dodo environment this plan was last used in
    dodoMode: {
      type: String,
      enum: ["test", "live"],
      default: "test",
      required: true,
    },

    // Separate test/live configs — avoids ever mixing environments
    dodo: {
      test: {
        productId:    { type: String },
        paymentLink:  { type: String },
        successUrl:   { type: String },
        failedUrl:    { type: String },
        cancelledUrl: { type: String },
        webhookSecret:{ type: String },
      },
      live: {
        productId:    { type: String },
        paymentLink:  { type: String },
        successUrl:   { type: String },
        failedUrl:    { type: String },
        cancelledUrl: { type: String },
        webhookSecret:{ type: String },
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "SubscriptionPlan",
  subscriptionPlanSchema,
  "subscriptionPlan"
);