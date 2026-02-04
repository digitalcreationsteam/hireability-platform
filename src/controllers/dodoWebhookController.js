const Subscription = require("../models/subscriptionModel");
const crypto = require("crypto");

exports.handleDodoWebhook = async (req, res) => {
  try {
    const {
      orderId,
      paymentId,
      signature,
      status,
    } = req.body;

    // Verify signature (MANDATORY)
    const isValid = verifyDodoSignature(req.body);
    if (!isValid) {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    const subscription = await Subscription.findOne({ dodoOrderId: orderId });
    if (!subscription) {
      return res.status(404).json({ success: false, message: "Subscription not found" });
    }

    if (subscription.status === "active") {
      return res.json({ success: true, message: "Already processed" });
    }

    if (status === "SUCCESS") {
      const now = new Date();
      let endDate = null;

      if (subscription.billingPeriod === "monthly") {
        endDate = new Date(now.setMonth(now.getMonth() + 1));
      } else if (subscription.billingPeriod === "yearly") {
        endDate = new Date(now.setFullYear(now.getFullYear() + 1));
      }

      subscription.status = "active";
      subscription.currentPeriodStart = new Date();
      subscription.currentPeriodEnd = endDate;
      subscription.dodoPaymentId = paymentId;
      subscription.dodoSignature = signature;

      subscription.invoices.push({
        invoiceId: paymentId,
        amount: subscription.amount,
        currency: subscription.currency,
        status: "paid",
        paid: true,
        createdAt: new Date(),
      });

      await subscription.save();
    } else {
      subscription.status = "canceled";
      await subscription.save();
    }

    return res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};




function verifyDodoSignature(payload) {
  const secret = process.env.DODO_SECRET_KEY;

  const generatedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload.orderId + payload.paymentId)
    .digest("hex");

  return generatedSignature === payload.signature;
}

