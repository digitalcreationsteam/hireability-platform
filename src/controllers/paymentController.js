const axios = require("axios");
const Subscription = require("../models/subscriptionModel");
const SubscriptionPlan = require("../models/subscriptionPlanModel");

exports.initiateDodoPayment = async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    // 1️⃣ Load subscription
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    // 2️⃣ Prevent re-initiating paid subscriptions
    if (subscription.paymentStatus === "success") {
      return res.status(400).json({
        success: false,
        message: "Payment already completed",
      });
    }

    // 3️⃣ Load plan product (to get DODO config)
    const plan = await SubscriptionPlan.findById(subscription.plan);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Subscription plan not found",
      });
    }

    // 4️⃣ Build payload
    const payload = {
      orderId: subscription.dodoOrderId,
      amount: subscription.amount,
      currency: subscription.currency,
      callbackUrl: process.env.DODO_WEBHOOK_ENDPOINT,
      metadata: {
        subscriptionId: subscription._id.toString(),
        userId: subscription.user.toString(),
      },
    };

    // 5️⃣ Call DODO
    const response = await axios.post(
      process.env.DODO_PAYMENT_API_URL,
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.DODO_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // 6️⃣ Return hosted payment URL
    return res.json({
      success: true,
      paymentUrl: response.data.paymentUrl || plan.dodo.paymentLink,
    });
  } catch (error) {
    console.error("DODO INIT ERROR:", error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to initiate payment",
    });
  }
};
