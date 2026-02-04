const axios = require("axios");
const Subscription = require("../models/subscriptionModel");

exports.initiateDodoPayment = async (req, res) => {
  const { subscriptionId } = req.body;

  const subscription = await Subscription.findById(subscriptionId);
  if (!subscription) {
    return res.status(404).json({ success: false, message: "Subscription not found" });
  }

  const payload = {
    orderId: subscription.dodoOrderId,
    amount: subscription.amount,
    currency: subscription.currency,
    callbackUrl: process.env.DODO_WEBHOOK_ENDPOINT,
  };

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

  res.json({
    success: true,
    paymentUrl: response.data.paymentUrl,
  });
};
