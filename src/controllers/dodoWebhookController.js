const Subscription = require("../models/subscriptionModel");
const crypto = require("crypto");
const User = require("../models/userModel");
const generateInvoicePdf = require("../utils/generateInvoicePdf");
const sendInvoiceEmail = require("../utils/sendInvoiceEmail");

exports.handleDodoWebhook = async (req, res) => {
  try {
    const payload = req.body; // ✅ FIX

    const {
      orderId,
      paymentId,
      amount,
      currency,
      status,
      signature,
    } = payload;

    // 1️⃣ Verify signature
    if (!verifyDodoSignature(payload)) {
      return res.status(400).json({ success: false });
    }

    // 2️⃣ Load subscription
    const subscription = await Subscription.findOne({ dodoOrderId: orderId });
    if (!subscription) {
      return res.status(404).json({ success: false });
    }

    // 3️⃣ Idempotency
    if (subscription.dodoPaymentId === paymentId) {
      return res.json({ success: true });
    }

    // 4️⃣ Validate payment
    if (
      Number(amount) !== Number(subscription.amount) ||
      currency !== subscription.currency
    ) {
      return res.status(400).json({ success: false });
    }

    // ❌ Payment failed
    if (status !== "SUCCESS") {
      subscription.paymentStatus = "failed";
      subscription.status = "past_due";
      await subscription.save();
      return res.json({ success: true });
    }

    // ✅ Payment success
    const start = new Date();
    let end = null;

    if (subscription.billingPeriod === "monthly") {
      end = new Date(start);
      end.setMonth(end.getMonth() + 1);
    } else if (subscription.billingPeriod === "yearly") {
      end = new Date(start);
      end.setFullYear(end.getFullYear() + 1);
    }

    subscription.status = "active";
    subscription.paymentStatus = "success";
    subscription.currentPeriodStart = start;
    subscription.currentPeriodEnd = end;
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

    await subscription.save();

    // 5️⃣ Invoice + Email
    const user = await User.findById(subscription.user);

    const invoicePath = await generateInvoicePdf({
      invoiceId: `INV_${Date.now()}`,
      studentName: user.name,
      email: user.email,
      planName: subscription.planName,
      amount,
      currency,
      billingPeriod: subscription.billingPeriod,
      paymentId,
    });

    await sendInvoiceEmail({
      to: user.email,
      studentName: user.name,
      invoicePath,
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("DODO WEBHOOK ERROR:", error);
    return res.status(500).json({ success: false });
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

  const signature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("hex");

  return signature === payload.signature;
}
