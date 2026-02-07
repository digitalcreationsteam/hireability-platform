const Subscription = require("../models/subscriptionModel");
const { Webhook } = require("svix");
const mongoose = require("mongoose");

exports.handleDodoWebhook = async (req, res) => {
  console.log("📥 DODO WEBHOOK HIT");

  try {
    const payload = req.body.toString();

    const headers = {
      "svix-id": req.headers["webhook-id"],
      "svix-timestamp": req.headers["webhook-timestamp"],
      "svix-signature": req.headers["webhook-signature"],
    };

    const secret =
      process.env.DODO_ENV === "live"
        ? process.env.DODO_LIVE_WEBHOOK_SECRET
        : process.env.DODO_TEST_WEBHOOK_SECRET;

    const wh = new Webhook(secret);
    const event = wh.verify(payload, headers);

    console.log("✅ Webhook verified:", event.type);

    const data = event.data;

    // 🔐 Extract identifiers
    const subscriptionId =
      data.subscription_id ||
      data.metadata?.subscription_id ||
      data.passthrough?.subscription_id;

    const orderId =
      data.order_id ||
      data.metadata?.order_id ||
      data.passthrough?.order_id;

    const paymentId = data.payment_id;

    console.log("📦 Webhook identifiers:", {
      subscriptionId,
      orderId,
      paymentId,
    });

    // ❌ Nothing to match against
    if (!subscriptionId && !orderId) {
      console.error("❌ No subscriptionId or orderId in webhook");
      return res.status(200).send("OK");
    }

    // Build safe query
    const query = {
      $or: [],
    };

    if (subscriptionId && mongoose.Types.ObjectId.isValid(subscriptionId)) {
      query.$or.push({ _id: subscriptionId });
    }

    if (orderId) {
      query.$or.push({ dodoOrderId: orderId });
    }

    // -------------------------
    // Invoice entry
    // -------------------------
    const invoiceEntry = {
      invoiceId: data.invoice_id || null,
      invoiceURL: data.invoice_url || null,
      amount: data.total_amount,
      currency: data.currency,
      status: data.status,
      paid: event.type === "payment.succeeded",
      createdAt: new Date(),
    };

    // -------------------------
    // ✅ PAYMENT SUCCESS
    // -------------------------
    if (event.type === "payment.succeeded") {
      const subscription = await Subscription.findOneAndUpdate(
        query,
        {
          status: "active",
          paymentStatus: "success",
          currentPeriodStart: new Date(),
          dodoPaymentId: paymentId,
          $push: { invoices: invoiceEntry },
        },
        { new: true }
      );

      console.log("💰 Subscription activated:", subscription?._id);
    }

    // -------------------------
    // ❌ PAYMENT FAILED
    // -------------------------
    if (event.type === "payment.failed") {
      await Subscription.findOneAndUpdate(
        query,
        {
          status: "past_due",
          paymentStatus: "failed",
          dodoPaymentId: paymentId || null,
          $push: { invoices: invoiceEntry },
        }
      );

      console.log("❌ Payment failed for:", subscriptionId || orderId);
    }

    return res.status(200).send("OK");
  } catch (err) {
    console.error("❌ Webhook verification failed:", err.message);
    return res.status(400).send("Invalid signature");
  }
};
