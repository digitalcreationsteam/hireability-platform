const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },

    plan: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "SubscriptionPlan",
      required: true,
    },

    planName: {
      type:     String,
      required: true,
    },

    status: {
      type:    String,
      enum:    ["pending", "active", "canceled", "expired", "past_due"],
      default: "pending",
      index:   true,
    },

    paymentStatus: {
      type:    String,
      enum:    ["pending", "success", "failed"],
      default: "pending",
    },

    billingPeriod: {
      type:     String,
      enum:     ["monthly", "yearly", "oneTime"],
      required: true,
    },

    currentPeriodStart: {
      type:    Date,
      default: null,
    },

    // null = lifetime access (oneTime plans).
    // isActive virtual: (!currentPeriodEnd || currentPeriodEnd >= now)
    currentPeriodEnd: {
      type:    Date,
      default: null,
      index:   true,
    },

    cancelAtPeriodEnd: {
      type:    Boolean,
      default: false,
    },

    canceledAt: {
      type:    Date,
      default: null,
    },

    isTrial: {
      type:    Boolean,
      default: false,
    },

    trialStart: { type: Date, default: null },
    trialEnd:   { type: Date, default: null },

    paymentMethod: {
      type:     String,
      enum:     ["dodo", "razorpay", "stripe", "paypal", "free", "upi", "card"],
      required: true,
    },

    // Snapshot of amount at purchase time (plan price can change later)
    amount: {
      type:    Number,
      default: 0,
    },

    currency: {
      type:    String,
      default: "INR",
    },

    failureReason: {
      type:    String,
      default: null,
    },

    // ?? Dodo-specific fields ????????????????????

    // From plan.dodo[mode].productId — used for Tier 4 webhook fallback lookup
    productId: {
      type:     String,
      required: true,
    },

    // Our own generated order ID: ORD_timestamp_hex
    dodoOrderId: {
      type:   String,
      unique: true,
      sparse: true,
      index:  true,
    },

    // Dodo's payment ID (pay_0NZT…) — set after webhook confirms payment
    // Used for idempotency (Tier 1 webhook lookup)
    dodoPaymentId: {
      type:   String,
      index:  true,
      sparse: true,
    },

    // Dodo's own subscription ID (sub_0NZT…) — present in data.subscription_id
    // on every webhook event for subscription products.
    // This is the PRIMARY lookup key for subscription plans (Tier 2 webhook lookup)
    // because URL ?metadata[] params are NOT forwarded to webhooks by Dodo.
    dodoSubscriptionId: {
      type:   String,
      index:  true,
      sparse: true,
    },

    dodoMode: {
      type:     String,
      enum:     ["test", "live"],
      required: true,
      index:    true,
    },

    dodoSignature: {
      type:    String,
      default: null,
    },

    // One entry per payment attempt
    invoices: [
      {
        invoiceId:     { type: String,  default: null },
        invoiceURL:    { type: String,  default: null },
        amount:        { type: Number,  default: 0 },
        currency:      { type: String,  default: "INR" },
        status:        { type: String },
        paid:          { type: Boolean, default: false },
        paymentId:     { type: String },
        customerEmail: { type: String },
        createdAt:     { type: Date,    default: Date.now },
      },
    ],

    metadata: {
      type: Map,
      of:   String,
    },

    autoRenew: {
      type:    Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// ?? Indexes ??????????????????????????????????
subscriptionSchema.index({ user: 1, status: 1 });
// Used for Tier 4 time-window fallback in webhook
subscriptionSchema.index({ productId: 1, paymentStatus: 1, dodoMode: 1, createdAt: -1 });

// ?? Virtuals ?????????????????????????????????

// isActive:
//   - status must be "active"
//   - oneTime plans: currentPeriodEnd=null ? always active once paid
//   - recurring plans: currentPeriodEnd must be in the future
subscriptionSchema.virtual("isActive").get(function () {
  const now = new Date();
  return (
    this.status === "active" &&
    (this.currentPeriodEnd === null || this.currentPeriodEnd >= now)
  );
});

subscriptionSchema.virtual("inTrial").get(function () {
  if (!this.trialStart || !this.trialEnd) return false;
  const now = new Date();
  return now >= this.trialStart && now <= this.trialEnd;
});

subscriptionSchema.set("toJSON",   { virtuals: true });
subscriptionSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Subscription", subscriptionSchema);