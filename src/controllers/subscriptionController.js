const Subscription = require("../models/subscriptionModel");
const SubscriptionPlan = require("../models/subscriptionPlanModel");
const UserScore = require("../models/userScoreModel");
const User = require("../models/userModel");
const crypto = require("crypto");
const planFeatureModel = require("../models/planFeatureModel");


// ─────────────────────────────────────────────
// HELPER: resolve DODO_MODE once from env
// ─────────────────────────────────────────────
const getDodoMode = () =>
  process.env.DODO_ENV === "live" ? "live" : "test";

// =============================================
// STEP 1 — CREATE SUBSCRIPTION
// POST /api/subscriptions/create
// Body: { planId }
// =============================================
exports.createSubscription = async (req, res) => {
  try {
    console.log("📥 CREATE SUBSCRIPTION - Request received:", {
      userId:    req.user?._id,
      body:      req.body,
      timestamp: new Date().toISOString(),
    });

    // ── Validate input ───────────────────────
    const { planId } = req.body;

    if (!planId) {
      console.warn("⚠️  Missing planId in request body");
      return res.status(400).json({ success: false, message: "planId is required" });
    }

    // ── Find plan ────────────────────────────
    const plan = await SubscriptionPlan.findById(planId);

    if (!plan) {
      console.warn("⚠️  Plan not found:", planId);
      return res.status(404).json({ success: false, message: "Plan not found" });
    }

    if (!plan.isActive) {
      console.warn("⚠️  Plan is inactive:", plan.planName);
      return res.status(400).json({ success: false, message: "This plan is currently unavailable" });
    }

    // ── Resolve Dodo config ──────────────────
    const DODO_MODE = getDodoMode();
    const dodoConfig = plan.dodo?.[DODO_MODE];

    if (!dodoConfig?.paymentLink) {
      console.error("❌ No Dodo payment link configured:", {
        planName: plan.planName,
        mode:     DODO_MODE,
      });
      return res.status(400).json({
        success: false,
        message: `Payment link not configured for "${plan.planName}" in ${DODO_MODE} mode`,
      });
    }

    // ── Block duplicate active / fresh-pending subscriptions ──
    const existingActiveSub = await Subscription.findOne({
      user:          req.user._id,
      plan:          plan._id,
      status:        { $in: ["active", "pending"] },
      paymentStatus: { $nin: ["failed"] },
    });

    if (existingActiveSub) {
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
      const isPendingAndStale =
        existingActiveSub.status === "pending" &&
        existingActiveSub.createdAt < tenMinAgo;

      if (!isPendingAndStale) {
        console.warn("⚠️  Duplicate subscription attempt blocked:", {
          existingId:    existingActiveSub._id,
          status:        existingActiveSub.status,
          paymentStatus: existingActiveSub.paymentStatus,
        });
        return res.status(400).json({
          success: false,
          message:
            existingActiveSub.status === "active"
              ? "You already have an active subscription for this plan"
              : "A payment is already in progress. Please complete it or wait 10 minutes.",
          existingSubscriptionId: existingActiveSub._id,
        });
      }

      // Stale pending — cancel it before creating fresh one
      existingActiveSub.status    = "canceled";
      existingActiveSub.canceledAt = new Date();
      await existingActiveSub.save();
      console.log("🔄 Stale pending subscription cancelled:", existingActiveSub._id);
    }

    // ── Generate unique order ID ─────────────
    const orderId = `ORD_${Date.now()}_${crypto
      .randomBytes(4)
      .toString("hex")
      .toUpperCase()}`;

    // ── Create subscription record ───────────
    // NOTE: amount is intentionally NOT set here.
    // It will be set from the real webhook data (data.total_amount) on payment.succeeded.
    const subscription = await Subscription.create({
      user:          req.user._id,
      plan:          plan._id,
      planName:      plan.planName,
      productId:     dodoConfig.productId,  // from plan.dodo[mode].productId
      currency:      plan.currency,
      billingPeriod: plan.billingPeriod,
      paymentMethod: "dodo",
      status:        "pending",
      paymentStatus: "pending",
      dodoOrderId:   orderId,
      dodoMode:      DODO_MODE,
     dodoPaymentLink: dodoConfig.paymentLink,
    });

    console.log("✅ Subscription created:", {
      subscriptionId: subscription._id,
      orderId,
      planName:      plan.planName,
      billingPeriod: plan.billingPeriod,
      productId:     subscription.productId,
      currency:      plan.currency,
      userId:        req.user._id,
      mode:          DODO_MODE,
     dodoPaymentLink: dodoConfig.paymentLink,
    });

    return res.status(201).json({
      success: true,
      data: {
        subscriptionId: subscription._id,
        orderId,
        mode:          DODO_MODE,
        billingPeriod: plan.billingPeriod,
        currency:      plan.currency,
      },
      message: "Subscription created successfully",
    });

  } catch (error) {
    console.error("❌ CREATE SUBSCRIPTION ERROR:", {
      message:   error.message,
      stack:     error.stack,
      userId:    req.user?._id,
      timestamp: new Date().toISOString(),
    });

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate order detected. Please try again.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create subscription",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};




// =====================================
// INITIATE DODO PAYMENT
// =====================================
exports.initiateDodoPayment = async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    
    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        message: "subscriptionId is required",
      });
    }

    const subscription = await Subscription.findById(subscriptionId);
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    if (subscription.paymentStatus === "success") {
      return res.status(400).json({
        success: false,
        message: "Payment already completed for this subscription",
      });
    }

    const plan = await SubscriptionPlan.findById(subscription.plan);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Subscription plan not found",
      });
    }

    const DODO_MODE = process.env.DODO_ENV === "live" ? "live" : "test";
    const dodoConfig = plan.dodo?.[DODO_MODE];

    if (!dodoConfig || !dodoConfig.paymentLink) {
      console.error(
        `❌ No Dodo payment link found for ${plan.planName} in ${DODO_MODE} mode`
      );
      return res.status(400).json({
        success: false,
        message: `Payment link not configured for ${plan.planName} in ${DODO_MODE} mode`,
      });
    }

    const FRONTEND_URL = process.env.CLIENT_URL || "http://localhost:3000";
    const redirectUrl = `${FRONTEND_URL}/payment-processing`;

    const basePaymentUrl = dodoConfig.paymentLink;
    const params = new URLSearchParams();
    
    params.append("redirect_url", redirectUrl);
    params.append("metadata[subscription_id]", subscriptionId);
    params.append("metadata[order_id]", subscription.dodoOrderId);
    
    const paymentUrl = `${basePaymentUrl}${
      basePaymentUrl.includes("?") ? "&" : "?"
    }${params.toString()}`;

    console.log("📤 Payment Initiation:", {
      planName: plan.planName,
      amount: subscription.amount,
      subscriptionId: subscriptionId,
      orderId: subscription.dodoOrderId,
      mode: DODO_MODE,
      redirectUrl: redirectUrl,
    });

    return res.json({
      success: true,
      paymentUrl: paymentUrl,
      redirectUrl: redirectUrl,
      mode: DODO_MODE,
      subscriptionId: subscriptionId,
      message: `Redirecting to Dodo payment gateway (${DODO_MODE})`,
    });

  } catch (error) {
    console.error("❌ PAYMENT INIT ERROR:", {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    
    return res.status(500).json({
      success: false,
      message: "Unable to initiate payment",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};


exports.getAllPlans = async (req, res) => {
  try {
    const userId = req.user?.id;

    let currency = "USD";

    if (userId) {
      // 🔥 Check country from UserScore instead of User
      const userScore = await UserScore.findOne({ userId })
        .select("country")
        .lean();

      if (userScore?.country === "India") {
        currency = "INR";
      }
    }

    const plans = await SubscriptionPlan.find({
      currency,
      isActive: true,
    })
      .sort({ order: 1 })
      .lean();

    if (!plans.length) {
      return res.status(200).json({
        success: true,
        currency,
        count: 0,
        data: [],
      });
    }

    const planIds = plans.map(plan => plan._id);

    const planFeatures = await planFeatureModel.find({
      subscriptionPlanId: { $in: planIds },
    }).lean();

    // 🔥 Create fast lookup map
    const featureMap = {};

    planFeatures.forEach(feature => {
      featureMap[feature.subscriptionPlanId.toString()] =
        feature.features;
    });

    const plansWithFeatures = plans.map(plan => ({
      ...plan,
      features:
        featureMap[plan._id.toString()] || [],
    }));

    res.status(200).json({
      success: true,
      currency,
      count: plansWithFeatures.length,
      data: plansWithFeatures,
    });

  } catch (error) {
    console.error("❌ GET PLANS ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Unable to fetch plans",
    });
  }
};

exports.getPlansByCurrency = async (req, res) => {
  try {
    const { currency } = req.query;

    // ✅ Validate currency
    if (!currency || !["USD", "INR"].includes(currency)) {
      return res.status(400).json({
        success: false,
        message: "Invalid currency. Allowed values: USD, INR",
      });
    }

    const plans = await SubscriptionPlan.find({
      currency,
      isActive: true,
    })
      .sort({ order: 1 })
      .lean();

    if (!plans.length) {
      return res.status(200).json({
        success: true,
        currency,
        count: 0,
        data: [],
      });
    }

    const planIds = plans.map(plan => plan._id);

    const planFeatures = await planFeatureModel.find({
      subscriptionPlanId: { $in: planIds },
    }).lean();

    // 🔥 Create lookup map
    const featureMap = {};

    planFeatures.forEach(feature => {
      featureMap[feature.subscriptionPlanId.toString()] =
        feature.features;
    });

    const plansWithFeatures = plans.map(plan => ({
      ...plan,
      features: featureMap[plan._id.toString()] || [],
    }));

    res.status(200).json({
      success: true,
      currency,
      count: plansWithFeatures.length,
      data: plansWithFeatures,
    });

  } catch (error) {
    console.error("❌ GET PLANS BY CURRENCY ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Unable to fetch plans",
    });
  }
};


exports.getSubscriptionById = async (req, res) => {
  try {
    const { id } = req.params;

    const subscription = await Subscription.findById(id)
      .populate("plan", "planName price currency billingPeriod")
      .populate("user", "name email");

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    // Security: Verify user owns this subscription
    if (subscription.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    res.json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    console.error("❌ GET SUBSCRIPTION ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Unable to fetch subscription",
    });
  }
};

// =====================================
// CHECK SUBSCRIPTION STATUS
// =====================================
exports.checkSubscriptionStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const subscription = await Subscription.findById(id)
      .select("status paymentStatus user")
      .lean();

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    res.json({
      success: true,
      data: {
        status: subscription.status,
        paymentStatus: subscription.paymentStatus,
        userId: subscription.user,
        isActive:
          subscription.status === "active" &&
          subscription.paymentStatus === "success",
        isFailed: subscription.paymentStatus === "failed",
      },
    });
  } catch (error) {
    console.error("❌ CHECK STATUS ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Unable to check status",
    });
  }
};