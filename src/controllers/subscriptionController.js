// controllers/subscriptionController.js - SIMPLIFIED VERSION

const Subscription = require("../models/subscriptionModel");
const SubscriptionPlan = require("../models/subscriptionPlanModel");
const User = require("../models/userModel");

// Get all available plans
exports.getAllPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: { $ne: false } })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: plans.length,
      data: plans,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



// controllers/subscriptionController.js
exports.createSubscription = async (req, res) => {
  try {
    const { planProductId } = req.body; // ✅ renamed
    const userId = req.user._id;

    // 1️⃣ Fetch product-based plan
    const plan = await SubscriptionPlan.findById(planProductId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Subscription product not found",
      });
    }

    // 2️⃣ Cancel ONLY active subscriptions
    await Subscription.updateMany(
      { user: userId, status: "active" },
      { status: "canceled", canceledAt: new Date() }
    );

    // 3️⃣ Create order ID
    const dodoOrderId = `DODO_SUB_${Date.now()}`;

    // 4️⃣ Create subscription
    const subscription = await Subscription.create({
      user: userId,
      plan: plan._id,              // product reference
      planName: plan.planName,     // "Basic"
      billingPeriod: plan.billingPeriod,
      paymentMethod: "dodo",
      amount: plan.price,
      currency: plan.currency,
      status: "pending",
      dodoOrderId,
    });

    return res.status(201).json({
      success: true,
      data: {
        subscriptionId: subscription._id,
        paymentLink: plan.dodo.paymentLink, // ✅ use stored link
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



// ✅ CREATE SUBSCRIPTION (ACTIVE IMMEDIATELY)
// exports.createSubscription = async (req, res) => {
//   try {
//     const { planId, paymentMethod = "razorpay" } = req.body;
//     const userId = req.user._id;

//     if (!planId) {
//       return res.status(400).json({
//         success: false,
//         message: "Plan ID is required",
//       });
//     }

//     const plan = await SubscriptionPlan.findById(planId);
//     if (!plan) {
//       return res.status(404).json({
//         success: false,
//         message: "Plan not found",
//       });
//     }

//     // Cancel old subscriptions
//     await Subscription.updateMany(
//       { user: userId, status: { $in: ["active", "pending"] } },
//       { status: "canceled" }
//     );

//     const orderId = `order_${Date.now()}`;

//     const now = new Date();
//     const currentPeriodStart = now;
//     const currentPeriodEnd = new Date(now);

//     if (plan.billingPeriod === "monthly") {
//       currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
//     } else if (plan.billingPeriod === "yearly") {
//       currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
//     } else if (plan.billingPeriod === "quarterly") {
//       currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 3);
//     }

//     // 🔥 IMPORTANT FIX → status = "active"
//     const subscription = await Subscription.create({
//       user: userId,
//       plan: planId,
//       planName: plan.name,
//       amount: plan.price,
//       currency: plan.currency,
//       status: "active", // ✅ FIXED
//       paymentMethod,
//       billingPeriod: plan.billingPeriod,
//       currentPeriodStart,
//       currentPeriodEnd,
//       razorpayOrderId: orderId,
//     });

//     res.status(201).json({
//       success: true,
//       message: "Subscription created successfully",
//       data: {
//         subscriptionId: subscription._id,
//         status: subscription.status,
//       },
//     });
//   } catch (error) {
//     console.error("❌ createSubscription error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to create subscription",
//     });
//   }
// };
// Verify payment (dummy implementation)
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      subscriptionId,
    } = req.body;
    const userId = req.user._id;

    // Find the subscription
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    // For dummy payment, just update status to active
    subscription.status = "active";
    subscription.razorpayPaymentId = razorpay_payment_id;
    subscription.razorpaySignature = razorpay_signature;

    await subscription.save();

    console.log(`✅ Payment verified for subscription: ${subscriptionId}`);

    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      data: {
        subscriptionId: subscription._id,
        status: subscription.status,
      },
    });
  } catch (error) {
    console.error("❌ Error verifying payment:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Payment verification failed",
    });
  }
};

// Get subscription details for current user
exports.getSubscriptionDetails = async (req, res) => {
  try {
    const userId = req.user._id;

    const subscriptions = await Subscription.find({ user: userId })
      .populate("plan")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: subscriptions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get current active subscription
exports.getCurrentSubscription = async (req, res) => {
  try {
    const userId = req.user._id;

    const subscription = await Subscription.findOne({
      user: userId,
      status: "active",
    }).populate("plan");

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "No active subscription found",
      });
    }

    res.status(200).json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Cancel subscription
exports.cancelSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const userId = req.user._id;

    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      user: userId,
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    subscription.status = "canceled";
    subscription.canceledAt = new Date();

    await subscription.save();

    res.status(200).json({
      success: true,
      message: "Subscription canceled successfully",
      data: subscription,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};