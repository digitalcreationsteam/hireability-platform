const Subscription = require("../models/subscriptionModel");
const SubscriptionPlan = require("../models/subscriptionPlanModel");

// Add this line
const DODO_MODE = process.env.DODO_ENV === "live" ? "live" : "test";

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
        message: "Payment already completed",
      });
    }

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
      mode: DODO_MODE,
    });

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

    const paymentUrl = dodoConfig.paymentLink;

    // Append metadata to the URL
    const urlWithMetadata = `${paymentUrl}${
      paymentUrl.includes("?") ? "&" : "?"
    }order_id=${subscription.dodoOrderId}&subscription_id=${subscriptionId}`;

    console.log(
      `✅ Using Dodo payment link for ${DODO_MODE} mode:`,
      urlWithMetadata
    );

    return res.json({
      success: true,
      paymentUrl: urlWithMetadata,
      mode: DODO_MODE,
      message: `Redirecting to Dodo payment gateway (${DODO_MODE})`,
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
