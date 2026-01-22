// controllers/subscriptionController.js - SIMPLIFIED VERSION

const Subscription = require("../models/subscriptionModel");
const SubscriptionPlan = require("../models/subscriptionPlanModel");
const User = require("../models/userModel");

// Get all available plans
exports.getAllPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan
      .find({ isActive: { $ne: false } })
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


// Create subscription with dummy payment
exports.createSubscription = async (req, res) => {
  try {
    const { planId, paymentMethod = "razorpay" } = req.body;
    const userId = req.user._id;

    // Validation
    if (!planId) {
      return res.status(400).json({
        success: false,
        message: "Plan ID is required",
      });
    }

    // Fetch the plan
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    // Cancel any existing active subscriptions
    await Subscription.updateMany(
      { user: userId, status: { $in: ["active", "pending"] } },
      { status: "canceled" }
    );

    // Create dummy payment order
    const orderId = `order_${Date.now()}`;
    const paymentDetails = {
      id: orderId,
      amount: plan.price * 100, // Convert to cents
      currency: plan.currency,
      status: "created",
      receipt: `receipt_${userId}_${Date.now()}`,
      created_at: new Date(),
    };

    console.log(`📦 Creating subscription for userId: ${userId}, plan: ${plan.name}`);
    console.log(`✅ Order created:`, paymentDetails);

    // Calculate period dates
    const now = new Date();
    const currentPeriodStart = now;
    let currentPeriodEnd = new Date(now);

    // Set period end based on billing period
    if (plan.billingPeriod === "monthly") {
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
    } else if (plan.billingPeriod === "yearly") {
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
    } else if (plan.billingPeriod === "quarterly") {
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 3);
    }

    // Create subscription document with all required fields
    const subscription = new Subscription({
      user: userId,
      plan: planId,
      planName: plan.name, // ✅ Set planName
      amount: plan.price, // ✅ Set amount
      currency: plan.currency,
      status: plan.price === 0 ? "active" : "pending", // Auto-activate free plans
      paymentMethod: paymentMethod,
      billingPeriod: plan.billingPeriod,
      currentPeriodStart: currentPeriodStart,
      currentPeriodEnd: currentPeriodEnd,
      razorpayOrderId: orderId,
      metadata: {
        orderDetails: JSON.stringify(paymentDetails),
      },
    });

    // Save subscription
    await subscription.save();

    console.log(`✅ Subscription saved for user: ${userId}`);

    // If free plan, mark as active immediately
    if (plan.price === 0) {
      subscription.status = "active";
      await subscription.save();
    }

    res.status(201).json({
      success: true,
      message: "Subscription created successfully",
      data: {
        subscriptionId: subscription._id,
        orderId: orderId,
        planName: plan.name,
        amount: plan.price,
        currency: plan.currency,
        status: subscription.status,
        paymentDetails: paymentDetails,
      },
    });
  } catch (error) {
    console.error("❌ Error creating subscription:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create subscription",
    });
  }
};

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