const Subscription = require("../models/subscriptionModel");
const SubscriptionPlan = require("../models/subscriptionPlanModel");
const crypto = require("crypto");

exports.createSubscription = async (req, res) => {
  try {
    const { planId } = req.body;

    // Validate inputs
    if (!planId) {
      return res.status(400).json({
        success: false,
        message: "planId is required",
      });
    }

    // 1️⃣ Load plan
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    // 2️⃣ Create unique orderId
    const orderId = `ORD_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    // 3️⃣ Create subscription (INR only for now)
    const subscription = await Subscription.create({
      user: req.user._id,
      plan: plan._id,
      planName: plan.planName,
      productId: plan.dodo?.productId || `PROD_${plan._id}`,
      amount: plan.price,
      currency: "INR",
      billingPeriod: plan.billingPeriod,
      paymentMethod: "dodo",
      status: "pending",
      paymentStatus: "pending",
      dodoOrderId: orderId,
    });

    return res.json({
      success: true,
      data: {
        subscriptionId: subscription._id,
        orderId: orderId,
      },
    });
  } catch (error) {
    console.error("CREATE SUB ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Unable to create subscription",
    });
  }
};

// Get all available subscription plans
exports.getAllPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true }).sort("order");
    res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error("GET PLANS ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Unable to fetch plans",
    });
  }
};

// Verify payment
exports.verifyPayment = async (req, res) => {
  try {
    const { subscriptionId, paymentId } = req.body;

    if (!subscriptionId || !paymentId) {
      return res.status(400).json({
        success: false,
        message: "subscriptionId and paymentId are required",
      });
    }

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    // Update subscription status
    subscription.status = "active";
    subscription.paymentStatus = "success";
    subscription.dodoPaymentId = paymentId;
    subscription.currentPeriodStart = new Date();

    // Set period end based on billing period
    if (subscription.billingPeriod === "monthly") {
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      subscription.currentPeriodEnd = endDate;
    } else if (subscription.billingPeriod === "yearly") {
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);
      subscription.currentPeriodEnd = endDate;
    }

    await subscription.save();

    res.json({
      success: true,
      message: "Payment verified successfully",
      data: subscription,
    });
  } catch (error) {
    console.error("VERIFY PAYMENT ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Unable to verify payment",
    });
  }
};

// Check subscription status by ID (for PaymentSuccess page)
exports.checkSubscriptionStatus = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        message: "subscriptionId is required",
      });
    }

    const subscription = await Subscription.findById(subscriptionId).populate("plan");
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    res.json({
      success: true,
      data: {
        subscriptionId: subscription._id,
        status: subscription.status,
        paymentStatus: subscription.paymentStatus,
        planName: subscription.planName,
        amount: subscription.amount,
        currency: subscription.currency,
      },
    });
  } catch (error) {
    console.error("CHECK SUBSCRIPTION STATUS ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Unable to check subscription status",
    });
  }
};

// Mark subscription as paid (for DODO test mode - no webhook support)
exports.markSubscriptionAsPaid = async (req, res) => {
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

    // Mark subscription as paid
    subscription.status = "active";
    subscription.paymentStatus = "success";
    subscription.currentPeriodStart = new Date();

    // Set period end based on billing period
    if (subscription.billingPeriod === "monthly") {
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      subscription.currentPeriodEnd = endDate;
    } else if (subscription.billingPeriod === "yearly") {
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);
      subscription.currentPeriodEnd = endDate;
    }

    await subscription.save();

    res.json({
      success: true,
      message: "Subscription marked as paid",
      data: {
        subscriptionId: subscription._id,
        status: subscription.status,
        paymentStatus: subscription.paymentStatus,
      },
    });
  } catch (error) {
    console.error("MARK SUBSCRIPTION AS PAID ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Unable to mark subscription as paid",
    });
  }
};

// Redirect helper for DODO (sends HTML that redirects to frontend)
exports.dodoRedirectHelper = async (req, res) => {
  try {
    const { subscriptionId, order_id, payment_id } = req.query;

    if (!subscriptionId) {
      return res.status(400).send("Missing subscriptionId");
    }

    // Send an HTML page that redirects to frontend PaymentSuccess
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const redirectUrl = `${frontendUrl}/payment-success?subscriptionId=${subscriptionId}`;

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Processing Payment...</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background: #f5f5f5;">
          <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh;">
            <div style="text-align: center; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h1 style="color: #333; margin-bottom: 20px;">Payment Successful!</h1>
              <p style="color: #666; margin-bottom: 30px;">Redirecting to your dashboard...</p>
              <div style="width: 50px; height: 50px; border: 4px solid #e0e0e0; border-top: 4px solid #007bff; border-radius: 50%; margin: 0 auto; animation: spin 1s linear infinite;"></div>
              <p style="color: #999; margin-top: 30px; font-size: 14px;">If you are not redirected, <a href="${redirectUrl}" style="color: #007bff; text-decoration: none;">click here</a></p>
              <script>
                // Redirect after 2 seconds
                setTimeout(function() {
                  window.location.href = '${redirectUrl}';
                }, 2000);
              </script>
              <style>
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              </style>
            </div>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("DODO REDIRECT ERROR:", error);
    res.status(500).send("Error processing payment");
  }
};

// Get all subscriptions for user
exports.getSubscriptionDetails = async (req, res) => {
  try {
    const subscriptions = await Subscription.find({
      user: req.user._id,
    })
      .populate("plan")
      .sort("-createdAt");

    res.json({
      success: true,
      data: subscriptions,
    });
  } catch (error) {
    console.error("GET SUBSCRIPTION ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Unable to fetch subscriptions",
    });
  }
};

// Get current active subscription
exports.getCurrentSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      user: req.user._id,
      status: "active",
    }).populate("plan");

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "No active subscription found",
      });
    }

    res.json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    console.error("GET CURRENT SUBSCRIPTION ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Unable to fetch current subscription",
    });
  }
};

// Cancel subscription
exports.cancelSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    const subscription = await Subscription.findById(subscriptionId);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    if (subscription.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to cancel this subscription",
      });
    }

    subscription.status = "canceled";
    subscription.canceledAt = new Date();
    await subscription.save();

    res.json({
      success: true,
      message: "Subscription canceled successfully",
      data: subscription,
    });
  } catch (error) {
    console.error("CANCEL SUBSCRIPTION ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Unable to cancel subscription",
    });
  }
};
