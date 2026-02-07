const crypto = require("crypto");
const Subscription = require("../models/subscriptionModel");
const Log = console; // you can replace with Winston later

exports.handleDodoWebhook = async (req, res) => {
  Log.info("📥 DODO WEBHOOK HIT");

  try {
    // -------------------------
    // 1️⃣ Headers logging
    // -------------------------
    const signature = req.headers["x-dodo-signature"];
    Log.info("🔐 Webhook Signature Header:", signature);

    if (!signature) {
      Log.error("❌ Missing x-dodo-signature header");
      return res.status(400).send("Missing signature");
    }

    // -------------------------
    // 2️⃣ Raw payload logging
    // -------------------------
    const payload = req.body; // RAW buffer
    Log.info("📦 Raw Payload:", payload.toString());

    const data = JSON.parse(payload.toString());
    Log.info("📄 Parsed Payload:", data);

    // -------------------------
    // 3️⃣ Resolve secret
    // -------------------------
    const secret =
      data.mode === "live"
        ? process.env.DODO_LIVE_WEBHOOK_SECRET
        : process.env.DODO_TEST_WEBHOOK_SECRET;

    if (!secret) {
      Log.error("❌ Webhook secret NOT FOUND for mode:", data.mode);
      return res.status(500).send("Webhook secret missing");
    }

    Log.info("🔑 Using Webhook Mode:", data.mode);

    // -------------------------
    // 4️⃣ Signature verification
    // -------------------------
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    Log.info("🧮 Expected Signature:", expected);

    if (signature !== expected) {
      Log.error("❌ Signature mismatch", {
        received: signature,
        expected,
      });
      return res.status(401).send("Invalid signature");
    }

    Log.info("✅ Signature verified");

    // -------------------------
    // 5️⃣ Handle event
    // -------------------------
    Log.info("📌 Webhook Status:", data.status);

    if (data.status === "SUCCESS") {
      const { order_id, subscription_id } = data;

      Log.info("💰 Payment SUCCESS", {
        order_id,
        subscription_id,
      });

      const result = await Subscription.updateOne(
        { orderId: order_id },
        {
          status: "active",
          paymentStatus: "success",
          paidAt: new Date(),
          gatewaySubscriptionId: subscription_id,
        }
      );

      Log.info("🧾 Subscription Update Result:", result);
    } else {
      Log.warn("⚠️ Unhandled payment status:", data.status);
    }

    // -------------------------
    // 6️⃣ Final response
    // -------------------------
    Log.info("✅ Webhook processed successfully");
    return res.status(200).send("OK");
  } catch (err) {
    Log.error("🔥 DODO WEBHOOK ERROR:", err);
    return res.status(500).send("Webhook error");
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

function verifyDodoSignature(req, secret) {
  const signature = req.headers["x-dodo-signature"];
  const payload = req.body; // RAW body

  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return signature === expected;
}
