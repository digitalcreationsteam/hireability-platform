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
    /*planProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      required: true,
    },*/
    status: {
      type: String,
      enum: ["pending", "active", "canceled", "expired", "past_due"],
      default: "pending",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },

    // Billing period
    billingPeriod: {
      type: String,
      enum: ["monthly", "yearly", "oneTime"],
      required: true,
    },

    currentPeriodStart: {
      type: Date,
      default: null,
    },

    currentPeriodEnd: {
      type: Date,
      default: null, // null = oneTime
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
    productId: {
      type: String,
      required: true,
    },
    dodoOrderId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
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
//subscriptionSchema.index({ dodoOrderId: 1 });

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
