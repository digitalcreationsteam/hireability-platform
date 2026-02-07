const Subscription = require("../models/subscriptionModel");
const { Webhook } = require("svix");

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

    // ✅ SAFE EXTRACTION
    const orderId =
      data.order_id ||
      data.metadata?.order_id ||
      data.passthrough?.order_id;

    if (!orderId) {
      console.error("❌ orderId missing in webhook payload");
      return res.status(200).send("OK"); // avoid retries
    }

    // -------------------------
    // Common invoice object
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
        { dodoOrderId: orderId },
        {
          status: "active",
          paymentStatus: "success",
          currentPeriodStart: new Date(),
          dodoPaymentId: data.payment_id, // ✅ STORED
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
        { dodoOrderId: orderId },
        {
          status: "past_due",
          paymentStatus: "failed",
          dodoPaymentId: data.payment_id || null,
          $push: { invoices: invoiceEntry },
        }
      );

      console.log("❌ Payment failed for:", orderId);
    }

    return res.status(200).send("OK");
  } catch (err) {
    console.error("❌ Webhook verification failed:", err.message);
    return res.status(400).send("Invalid signature");
  }
};
