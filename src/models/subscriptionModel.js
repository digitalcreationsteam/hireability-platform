const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    // -------------------- CORE RELATIONS --------------------
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Link to SubscriptionPlan (single source of truth)
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      required: true,
    },

    // Snapshot of plan name (for history / analytics)
    planName: {
      type: String,
      required: true,
    },

    // -------------------- STATUS --------------------
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

    // -------------------- BILLING --------------------
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
      default: null, // null for oneTime plans
      index: true,
    },

    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },

    canceledAt: {
      type: Date,
    },

    // -------------------- TRIAL --------------------
    isTrial: {
      type: Boolean,
      default: false,
    },

    trialStart: {
      type: Date,
    },

    trialEnd: {
      type: Date,
    },

    // -------------------- PAYMENT --------------------
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
      default: "INR",
    },

    // -------------------- DODO (PAYMENT INSTANCE DATA ONLY) --------------------
    // ❌ DO NOT store dodoProductId / dodoPaymentLink here
    // ✅ Those belong to SubscriptionPlan

    dodoOrderId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    dodoPaymentId: {
      type: String,
    },

    dodoSignature: {
      type: String,
    },

    // -------------------- INVOICES --------------------
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

    // -------------------- METADATA --------------------
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
