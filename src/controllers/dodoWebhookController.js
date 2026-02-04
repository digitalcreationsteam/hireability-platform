const Subscription = require("../models/subscriptionModel");
const crypto = require("crypto");

exports.handleDodoWebhook = async (req, res) => {
  try {
    // const {
    //   orderId,
    //   paymentId,
    //   signature,
    //   status,
    // } = req.body;
const {
  orderId,
  paymentId,
  amount,
  currency,
  status,
  signature,
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
      const start = new Date();
      const end = new Date(start);

      if (subscription.billingPeriod === "monthly") {
        end.setMonth(end.getMonth() + 1);
      } else if (subscription.billingPeriod === "yearly") {
        end.setFullYear(end.getFullYear() + 1);
      }

      subscription.status = "active";
      subscription.paymentStatus = "success";
      subscription.currentPeriodStart = start;
      subscription.currentPeriodEnd =
        subscription.billingPeriod === "lifetime" ? null : end;

      subscription.dodoPaymentId = paymentId;
      subscription.dodoSignature = signature;

      subscription.invoices.push({
        invoiceId: paymentId,
        amount,
        currency,
        status: "paid",
        paid: true,
        createdAt: new Date(),
      });
    } else {
      subscription.paymentStatus = "failed";
      subscription.status = "past_due";
    }


    return res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};




function verifyDodoSignature(payload) {
  const secret = process.env.DODO_WEBHOOK_SECRET;

  const data = [
    payload.orderId,
    payload.paymentId,
    payload.amount,
    payload.currency,
    payload.status,
  ].join("|");

  const generatedSignature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("hex");

  return generatedSignature === payload.signature;
}


