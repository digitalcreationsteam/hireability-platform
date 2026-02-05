const Subscription = require("../models/subscriptionModel");
const SubscriptionPlan = require("../models/subscriptionPlanModel");

/**
 * Initiate Dodo Payment - Returns checkout link to real Dodo payment gateway
 * Uses pre-configured Dodo payment links from .env for each plan/currency
 */
exports.initiateDodoPayment = async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        message: "subscriptionId is required",
      });
    }

    // 1️⃣ Load subscription
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
        message: "Payment already completed",
      });
    }

    // 2️⃣ Load plan
    const plan = await SubscriptionPlan.findById(subscription.plan);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    console.log("📤 Payment Initiation:", {
      planName: plan.planName,
      amount: subscription.amount,
      subscriptionId: subscriptionId,
    });

    // 3️⃣ Get Dodo payment checkout link from environment (INR only)
    // Format: PLANNAME_INR_PAY (e.g., BASIC_INR_PAY, PREMIUM__INR_PAY)
    let paymentLinkEnvKey = `${plan.planName.toUpperCase()}_INR_PAY`;

    // Handle special case for PREMIUM__INR (with double underscore in env)
    if (plan.planName.toUpperCase() === "PREMIUM") {
      paymentLinkEnvKey = "PREMIUM__INR_PAY";
    }

    let paymentUrl = process.env[paymentLinkEnvKey];

    if (!paymentUrl) {
      console.error(
        `❌ No Dodo payment link found for ${paymentLinkEnvKey}. Available env keys: BASIC_INR_PAY, PREMIUM__INR_PAY`
      );
      return res.status(400).json({
        success: false,
        message: `Payment link not configured for ${plan.planName}`,
      });
    }

    console.log(`✅ Using Dodo payment link: ${paymentLinkEnvKey}`);

    // Append subscriptionId to the URL so our redirect helper can pass it to frontend
    const urlWithSubId = `${paymentUrl}${paymentUrl.includes('?') ? '&' : '?'}subscriptionId=${subscriptionId}`;

    console.log("📤 Payment URL with subscriptionId:", urlWithSubId);

    // Return Dodo payment URL
    return res.json({
      success: true,
      paymentUrl: urlWithSubId,
      mode: "dodo",
      message: "Redirecting to Dodo payment gateway",
    });
  } catch (error) {
    console.error("❌ PAYMENT INIT ERROR:", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Unable to initiate payment",
      error:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
