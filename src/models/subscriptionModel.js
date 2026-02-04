// // models/subscriptionModel.js - FIXED VERSION

// const mongoose = require("mongoose");

// const subscriptionSchema = new mongoose.Schema({
//   user: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     required: true,
//   },
//   plan: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "SubscriptionPlan",
//     required: true,
//   },
//   planName: {
//     type: String,
//     required: true,
//   },
//   status: {
//     type: String,
//     enum: ["active", "canceled", "expired", "pending", "past_due"],
//     default: "pending",
//   },
//   currentPeriodStart: {
//     type: Date,
//     default: null,
//   },
//   currentPeriodEnd: {
//     type: Date,
//     default: null,
//   },
//   cancelAtPeriodEnd: {
//     type: Boolean,
//     default: false,
//   },
//   canceledAt: Date,
//   trialStart: Date,
//   trialEnd: Date,
//   isTrial: {
//     type: Boolean,
//     default: false,
//   },
//   paymentMethod: {
//     type: String,
//     enum: ["card", "paypal", "bank_transfer", "cash", "razorpay", "free", "other"],
//   },
//   stripeSubscriptionId: String,
//   stripeCustomerId: String,
//   stripePriceId: String,
//   razorpayOrderId: String,
//   razorpayPaymentId: String,
//   razorpaySignature: String,
//   amount: {
//     type: Number,
//     required: true,
//   },
//   currency: {
//     type: String,
//     default: "USD",
//   },
//   billingPeriod: {
//     type: String,
//     enum: ["monthly", "quarterly", "yearly", "lifetime"],
//     default: "monthly",
//   },
//   metadata: {
//     type: Map,
//     of: String,
//   },
//   invoices: [
//     {
//       invoiceId: String,
//       amount: Number,
//       currency: String,
//       status: String,
//       paid: Boolean,
//       pdfUrl: String,
//       createdAt: Date,
//     },
//   ],
//   nextPaymentAttempt: Date,
//   autoRenew: {
//     type: Boolean,
//     default: true,
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now,
//   },
//   updatedAt: {
//     type: Date,
//     default: Date.now,
//   },
// });

// // Indexes for faster queries
// subscriptionSchema.index({ user: 1 });
// subscriptionSchema.index({ status: 1 });
// subscriptionSchema.index({ currentPeriodEnd: 1 });
// subscriptionSchema.index({ stripeSubscriptionId: 1 });

// // Virtual property to check if subscription is active
// subscriptionSchema.virtual("isActive").get(function () {
//   const now = new Date();
//   return (
//     this.status === "active" &&
//     (!this.currentPeriodStart || now >= this.currentPeriodStart) &&
//     (!this.currentPeriodEnd || now <= this.currentPeriodEnd)
//   );
// });

// // Virtual property to check if in trial
// subscriptionSchema.virtual("inTrial").get(function () {
//   if (!this.trialStart || !this.trialEnd) return false;
//   const now = new Date();
//   return now >= this.trialStart && now <= this.trialEnd;
// });

// // Pre-save middleware to update the updatedAt timestamp
// // subscriptionSchema.pre("save", function (next) {
// //   this.updatedAt = Date.now();
// //   next();
// // });

// // Enable virtuals in JSON and Object output
// subscriptionSchema.set("toJSON", { virtuals: true });
// subscriptionSchema.set("toObject", { virtuals: true });

// const Subscription = mongoose.model("Subscription", subscriptionSchema);
// module.exports = Subscription;


const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      required: true,
    },

    planName: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "active", "canceled", "expired", "past_due"],
      default: "pending",
      index: true,
    },

    // Billing period
    billingPeriod: {
      type: String,
      enum: ["monthly", "yearly", "lifetime"],
      required: true,
    },

    currentPeriodStart: {
      type: Date,
      default: null,
    },

    currentPeriodEnd: {
      type: Date,
      default: null, // null = lifetime
      index: true,
    },

    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },

    canceledAt: Date,

    // Trial
    isTrial: {
      type: Boolean,
      default: false,
    },

    trialStart: Date,
    trialEnd: Date,

    // Payment
    paymentMethod: {
      type: String,
      enum: ["dodo", "razorpay", "stripe", "paypal", "free"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "USD",
    },

    // 🔥 DODO FIELDS
    dodoOrderId: String,
    dodoPaymentId: String,
    dodoSignature: String,

    // Invoices
    invoices: [
      {
        invoiceId: String,
        amount: Number,
        currency: String,
        status: String,
        paid: Boolean,
        createdAt: Date,
      },
    ],

    metadata: {
      type: Map,
      of: String,
    },

    autoRenew: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// -------------------- INDEXES --------------------
subscriptionSchema.index({ user: 1, status: 1 });
subscriptionSchema.index({ dodoOrderId: 1 });

// -------------------- VIRTUALS --------------------
subscriptionSchema.virtual("isActive").get(function () {
  const now = new Date();
  return (
    this.status === "active" &&
    (!this.currentPeriodEnd || this.currentPeriodEnd >= now)
  );
});

subscriptionSchema.virtual("inTrial").get(function () {
  if (!this.trialStart || !this.trialEnd) return false;
  const now = new Date();
  return now >= this.trialStart && now <= this.trialEnd;
});

subscriptionSchema.set("toJSON", { virtuals: true });
subscriptionSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Subscription", subscriptionSchema);
