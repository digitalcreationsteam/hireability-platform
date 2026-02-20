const Subscription = require("../models/subscriptionModel");
const SubscriptionPlan = require("../models/subscriptionPlanModel");
const User = require("../models/userModel");
const crypto = require("crypto");

// =====================================
// CREATE SUBSCRIPTION
// =====================================
exports.createSubscription = async (req, res) => {
  try {
    const { planId } = req.body;
    
    if (!planId) {
      return res.status(400).json({
        success: false,
        message: "planId is required",
      });
    }

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    const DODO_MODE = process.env.DODO_ENV === "live" ? "live" : "test";
    const dodoConfig = plan.dodo?.[DODO_MODE];
    
    if (!dodoConfig || !dodoConfig.paymentLink) {
      console.error(
        `❌ No payment link configured for ${plan.planName} in ${DODO_MODE} mode`
      );
      return res.status(400).json({
        success: false,
        message: `Payment link not configured for this plan in ${DODO_MODE} mode`,
      });
    }

    const orderId = `ORD_${Date.now()}_${crypto
      .randomBytes(4)
      .toString("hex")}`;

    const subscription = await Subscription.create({
      user: req.user._id,
      plan: plan._id,
      planName: plan.planName,
      productId: dodoConfig.productId || plan.productName,
      currency: plan.currency,
      billingPeriod: plan.billingPeriod,
      paymentMethod: "dodo",
      status: "pending",
      paymentStatus: "pending",
      dodoOrderId: orderId,
      dodoMode: DODO_MODE,
    });

    console.log("✅ Subscription created in", DODO_MODE, "mode", {
      subscriptionId: subscription._id,
      orderId: orderId,
      planName: plan.planName,
      productId: subscription.productId,
      userId: req.user._id,
    });

    return res.json({
      success: true,
      data: {
        subscriptionId: subscription._id,
        mode: DODO_MODE,
      },
      message: "Subscription created successfully",
    });
  } catch (error) {
    console.error("❌ CREATE SUB ERROR:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({
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

// =====================================
// GET ALL PLANS
// =====================================

// exports.getAllPlans = async (req, res) => {
//   try {
//     const userId = req.user?.id;

//     let currency = "USD"; // default currency

//     if (userId) {
//       const user = await User.findById(userId)
//         .select("country")
//         .lean();

//       if (user?.country === "IN") {
//         currency = "INR";
//       }
//     }

//     const plans = await SubscriptionPlan.find({
//       currency,
//       isActive: true,
//     })
//       .sort({ order: 1 })
//       .lean();

//     res.status(200).json({
//       success: true,
//       currency,
//       count: plans.length,
//       data: plans,
//     });

//   } catch (error) {
//     console.error("❌ GET PLANS ERROR:", error);
//     res.status(500).json({
//       success: false,
//       message: "Unable to fetch plans",
//     });
//   }
// };

const PlanFeature = require("../models/planFeatureModel");

// exports.getAllPlans = async (req, res) => {
//   try {
//     const userId = req.user?.id;

//     let currency = "USD"; // default currency

//     // 🌍 Detect user currency
//     if (userId) {
//       const user = await User.findById(userId)
//         .select("country")
//         .lean();

//       if (user?.country === "IN") {
//         currency = "INR";
//       }
//     }

//     // 🟢 Get plans based on currency
//     const plans = await SubscriptionPlan.find({
//       currency,
//       isActive: true,
//     })
//       .sort({ order: 1 })
//       .lean();

//     const planIds = plans.map(plan => plan._id);

//     // 🟢 Get all features for those plans
//     const planFeatures = await PlanFeature.find({
//       subscriptionPlanId: { $in: planIds }
//     }).lean();

//     // 🟢 Merge features into plans
//     const plansWithFeatures = plans.map(plan => {
//       const featureData = planFeatures.find(
//         f => f.subscriptionPlanId.toString() === plan._id.toString()
//       );

//       return {
//         ...plan,
//         features: featureData ? featureData.features : []
//       };
//     });

//     res.status(200).json({
//       success: true,
//       currency,
//       count: plansWithFeatures.length,
//       data: plansWithFeatures,
//     });

//   } catch (error) {
//     console.error("❌ GET PLANS ERROR:", error);
//     res.status(500).json({
//       success: false,
//       message: "Unable to fetch plans",
//     });
//   }
// };


// =====================================
// GET SUBSCRIPTION BY ID
// =====================================

exports.getAllPlans = async (req, res) => {
  try {
    const userId = req.user?.id;

    let currency = "USD";

    if (userId) {
      const user = await User.findById(userId)
        .select("country")
        .lean();

      if (user?.country === "India") {
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

    const planFeatures = await PlanFeature.find({
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