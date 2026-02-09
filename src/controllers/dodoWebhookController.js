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

    const DODO_MODE = process.env.DODO_ENV === "live" ? "live" : "test";
    const secret =
      DODO_MODE === "live"
        ? process.env.DODO_LIVE_WEBHOOK_SECRET
        : process.env.DODO_TEST_WEBHOOK_SECRET;

    const wh = new Webhook(secret);
    const event = wh.verify(payload, headers);

    console.log("✅ Webhook verified:", event.type);

    const data = event.data;
    const paymentId = data.payment_id;

    console.log("📦 Webhook data:", {
      eventType: event.type,
      paymentId,
      status: data.status,
      amount: data.total_amount,
      productId: data.product_cart?.[0]?.product_id,
      customerEmail: data.customer?.email,
    });

    if (!paymentId) {
      console.error("❌ No payment_id in webhook");
      return res.status(200).send("OK - No payment_id");
    }

    // ✅ STEP 1: Check if this payment_id already processed
    let subscription = await Subscription.findOne({ 
      dodoPaymentId: paymentId 
    });

    if (subscription) {
      console.log("⚠️ Payment already processed:", {
        subscriptionId: subscription._id,
        currentStatus: subscription.paymentStatus,
      });
      
      // If webhook is same status, skip duplicate processing
      if (
        (event.type === "payment.succeeded" && subscription.paymentStatus === "success") ||
        (event.type === "payment.failed" && subscription.paymentStatus === "failed")
      ) {
        return res.status(200).send("OK - Already processed");
      }
    }

    // ✅ STEP 2: Find subscription by matching criteria if not found by payment_id
    if (!subscription) {
      const productId = data.product_cart?.[0]?.product_id;
      const amount = data.total_amount;
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      if (!productId) {
        console.error("❌ No product_id in webhook");
        return res.status(200).send("OK - No product");
      }

      // Find the most recent pending subscription that matches
      subscription = await Subscription.findOne({
        productId: productId,
        // amount: amount,
        paymentStatus: "pending",
        dodoMode: DODO_MODE,
        createdAt: { $gte: fiveMinutesAgo },
      }).sort({ createdAt: -1 });

      if (!subscription) {
        console.error("❌ No matching subscription found", {
          productId,
          // amount,
          mode: DODO_MODE,
          searchedSince: fiveMinutesAgo,
        });
        return res.status(200).send("OK - No subscription match");
      }

      console.log("✅ Found matching subscription:", subscription._id);
    }

    // -------------------------
    // Invoice entry
    // -------------------------
    const invoiceEntry = {
      invoiceId: data.invoice_id || null,
      invoiceURL: data.invoice_url || null,
      amount: data.settlement_amount || data.total_amount || 0,
      currency: data.settlement_currency || data.currency || "INR",
      status: data.status,
      paid: event.type === "payment.succeeded",
      paymentId: paymentId,
      customerEmail: data.customer?.email,
      createdAt: new Date(),
    };

    // -------------------------
    // ✅ PAYMENT SUCCESS
    // -------------------------
    if (event.type === "payment.succeeded") {
      subscription.status = "active";
      subscription.paymentStatus = "success";
      subscription.amount = data.total_amount;
      subscription.method = data.payment_method;
      subscription.currentPeriodStart = new Date();
      subscription.dodoPaymentId = paymentId; // ✅ Store payment_id
      
      // Calculate period end based on billing period
      if (subscription.billingPeriod === "monthly") {
        subscription.currentPeriodEnd = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        );
      } else if (subscription.billingPeriod === "yearly") {
        subscription.currentPeriodEnd = new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000
        );
      }
      
      subscription.invoices.push(invoiceEntry);
      await subscription.save();

      console.log("✅ Payment succeeded - Subscription activated:", {
        subscriptionId: subscription._id,
        orderId: subscription.dodoOrderId,
        paymentId: paymentId,
        customerEmail: data.customer?.email,
        status: subscription.status,
        paymentStatus: subscription.paymentStatus,
      });
    }

    // -------------------------
    // ❌ PAYMENT FAILED
    // -------------------------
    if (event.type === "payment.failed") {
      subscription.status = "past_due";
      subscription.paymentStatus = "failed";
      subscription.dodoPaymentId = paymentId; // ✅ Store payment_id even for failed
      subscription.invoices.push(invoiceEntry);
      await subscription.save();

      console.log("❌ Payment failed - Subscription marked as past_due:", {
        subscriptionId: subscription._id,
        orderId: subscription.dodoOrderId,
        paymentId: paymentId,
        errorCode: data.error_code,
        errorMessage: data.error_message,
        status: subscription.status,
        data:data,
        paymentStatus: subscription.paymentStatus,
      });
    }

    return res.status(200).send("OK");
  } catch (err) {
    console.error("❌ Webhook error:", {
      message: err.message,
      stack: err.stack,
    });
    return res.status(400).send("Invalid signature");
  }
};