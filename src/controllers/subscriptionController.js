const Subscription = require("../models/subscriptionModel");
const SubscriptionPlan = require("../models/subscriptionPlanModel");
const crypto = require("crypto");

// Determine environment mode (default to test if not set)
const DODO_MODE = process.env.DODO_ENV === "live" ? "live" : "test";

console.log("🔧 Dodo Configuration:", {
  mode: DODO_MODE,
});

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
      amount: plan.price,
      currency: plan.currency,
      billingPeriod: plan.billingPeriod,
      paymentMethod: "dodo",
      status: "pending",
      paymentStatus: "pending",
      dodoOrderId: orderId,
      dodoMode: DODO_MODE,
    });

    // ✅ Build checkout URL with metadata (Dodo will return this in webhook)
    const checkoutUrl = `${dodoConfig.paymentLink}${
      dodoConfig.paymentLink.includes("?") ? "&" : "?"
    }metadata[subscription_id]=${subscription._id}&metadata[order_id]=${orderId}`;

    console.log("✅ Subscription created in", DODO_MODE, "mode", {
      subscriptionId: subscription._id,
      orderId: orderId,
      planName: plan.planName,
      checkoutUrl,
    });

    return res.json({
      success: true,
      data: {
        subscriptionId: subscription._id,
        checkoutUrl,
        mode: DODO_MODE,
      },
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



exports.getAllPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find() // 👈 no filter
      .sort({ order: 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: plans.length,
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
    console.error("GET SUBSCRIPTION ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Unable to fetch subscription",
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

