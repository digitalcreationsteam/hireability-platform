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

    features: {
      type: [String], // Array of feature descriptions
      required: true,
      default: [],
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

    dodoMode: {
      type: String,
      enum: ["test", "live"],
      default: "test",
      required: true,
    },

    dodo: {
      test: {
        productId: {
          type: String,
        },
        paymentLink: {
          type: String,
        },
        successUrl: {
          type: String,
        },
        failedUrl: {
          type: String,
        },
        cancelledUrl: {
          type: String,
        },
        webhookSecret: {
          type: String,
        },
      },
      live: {
        productId: {
          type: String,
        },
        paymentLink: {
          type: String,
        },
        successUrl: {
          type: String,
        },
        failedUrl: {
          type: String,
        },
        cancelledUrl: {
          type: String,
        },
        webhookSecret: {
          type: String,
        },
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
