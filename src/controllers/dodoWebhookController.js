const Subscription = require("../models/subscriptionModel");
const crypto = require("crypto");

const DODO_MODE = process.env.DODO_ENV === "live" ? "live" : "test";
const DODO_WEBHOOK_SECRET =
  DODO_MODE === "live"
    ? process.env.DODO_LIVE_WEBHOOK_SECRET
    : process.env.DODO_TEST_WEBHOOK_SECRET || process.env.DODO_WEBHOOK_SECRET;

exports.handleDodoWebhook = async (req, res) => {
  try {
    // Parse raw body
    let payload;
    if (Buffer.isBuffer(req.body)) {
      try {
        payload = JSON.parse(req.body.toString());
      } catch (err) {
        console.error("❌ Invalid JSON in webhook:", err);
        return res.status(400).json({ success: false, error: "Invalid JSON" });
      }
    } else {
      payload = req.body;
    }

    console.log("📥 DODO WEBHOOK RECEIVED:", JSON.stringify(payload, null, 2));

    // Extract webhook data (adjust based on actual Dodo webhook format)
    const {
      event_type,
      event,
      payment_id,
      order_id,
      amount,
      currency,
      status,
      metadata,
    } = payload;

    // Get order_id from metadata or direct field
    const orderId = order_id || metadata?.order_id;

    if (!orderId) {
      console.error("❌ Missing order_id in webhook");
      return res.status(400).json({ success: false, error: "Missing order_id" });
    }

    // Find subscription
    const subscription = await Subscription.findOne({ dodoOrderId: orderId });

    if (!subscription) {
      console.error(`❌ Subscription not found for order: ${orderId}`);
      return res.status(404).json({ success: false, error: "Subscription not found" });
    }

    console.log("📦 Found subscription:", {
      id: subscription._id,
      currentStatus: subscription.paymentStatus,
    });

    // Idempotency check
    if (
      subscription.paymentStatus === "success" &&
      subscription.dodoPaymentId === payment_id
    ) {
      console.log("✅ Already processed (idempotent)");
      return res.json({ success: true, message: "Already processed" });
    }

    // Determine event type
    const eventType = event_type || event || status;

    // Handle events
    switch (eventType?.toLowerCase()) {
      case "payment.success":
      case "payment.completed":
      case "success":
      case "completed":
        await handlePaymentSuccess(subscription, payload);
        break;

      case "payment.failed":
      case "failed":
        await handlePaymentFailed(subscription, payload);
        break;

      case "payment.cancelled":
      case "payment.canceled":
      case "cancelled":
      case "canceled":
        await handlePaymentCancelled(subscription, payload);
        break;

      default:
        console.log(`⚠️ Unhandled event type: ${eventType}`);
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("❌ WEBHOOK ERROR:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

async function handlePaymentSuccess(subscription, payload) {
  const { payment_id, amount, currency } = payload;

  console.log("✅ Processing payment success");

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
  subscription.dodoPaymentId = payment_id;

  subscription.invoices.push({
    invoiceId: payment_id || `INV_${Date.now()}`,
    amount: amount || subscription.amount,
    currency: currency || subscription.currency,
    status: "paid",
    paid: true,
    createdAt: new Date(),
  });

  await subscription.save();

  console.log("💾 Subscription activated:", {
    id: subscription._id,
    status: subscription.status,
    periodEnd: end,
  });
}

async function handlePaymentFailed(subscription, payload) {
  console.log("❌ Processing payment failure");

  subscription.paymentStatus = "failed";
  subscription.status = "past_due";

  await subscription.save();
}

async function handlePaymentCancelled(subscription, payload) {
  console.log("🚫 Processing payment cancellation");

  subscription.paymentStatus = "failed";
  subscription.status = "canceled";
  subscription.canceledAt = new Date();

  await subscription.save();
}