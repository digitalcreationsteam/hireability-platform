const Subscription = require("../models/subscriptionModel");
const { Webhook } = require("svix");
const mongoose = require("mongoose");

exports.handleDodoWebhook = async (req, res) => {
  console.log("📥 DODO WEBHOOK HIT");
  
  try {
    // =====================================
    // STEP 1: VERIFY WEBHOOK SIGNATURE
    // =====================================
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

    if (!secret) {
      console.error("❌ Webhook secret not configured for mode:", DODO_MODE);
      return res.status(500).send("Webhook secret missing");
    }

    const wh = new Webhook(secret);
    const event = wh.verify(payload, headers);

    console.log("✅ Webhook verified:", {
      eventType: event.type,
      mode: DODO_MODE,
      timestamp: new Date().toISOString(),
    });

    // =====================================
    // STEP 2: EXTRACT & VALIDATE DATA
    // =====================================
    const data = event.data;
    const paymentId = data.payment_id;
    const productId = data.product_cart?.[0]?.product_id;
    const eventType = event.type;
    
    // Extract metadata if present
    const metadata = data.metadata || {};
    const metadataSubscriptionId = metadata.subscription_id;
    const metadataOrderId = metadata.order_id;

    console.log("📦 Webhook data:", {
      eventType,
      paymentId,
      productId,
      status: data.status,
      amount: data.total_amount,
      currency: data.settlement_currency || data.currency,
      customerEmail: data.customer?.email,
      mode: DODO_MODE,
      metadata: {
        subscriptionId: metadataSubscriptionId,
        orderId: metadataOrderId,
      },
    });

    // Validate essential fields
    if (!paymentId) {
      console.error("❌ No payment_id in webhook");
      return res.status(200).send("OK - No payment_id");
    }

    if (!productId) {
      console.error("❌ No product_id in webhook");
      return res.status(200).send("OK - No product_id");
    }

    // =====================================
    // STEP 3: FIND SUBSCRIPTION
    // =====================================
    let subscription = null;

    // Try 1: Find by payment_id (for duplicate webhook prevention)
    subscription = await Subscription.findOne({ 
      dodoPaymentId: paymentId 
    })
    .populate("user", "email name")
    .populate("plan", "planName");

    if (subscription) {
      console.log("⚠️ Payment already processed:", {
        subscriptionId: subscription._id,
        currentStatus: subscription.paymentStatus,
        currentPaymentStatus: subscription.status,
      });
      
      // Prevent duplicate processing
      if (
        (eventType === "payment.succeeded" && subscription.paymentStatus === "success") ||
        (eventType === "payment.failed" && subscription.paymentStatus === "failed")
      ) {
        console.log("✅ Webhook already processed - Skipping");
        return res.status(200).send("OK - Already processed");
      }
    }

    // Try 2: Find by metadata subscription_id
    if (!subscription && metadataSubscriptionId) {
      try {
        subscription = await Subscription.findById(metadataSubscriptionId)
          .populate("user", "email name")
          .populate("plan", "planName");
        
        if (subscription) {
          console.log("✅ Found subscription via metadata:", {
            subscriptionId: subscription._id,
            orderId: subscription.dodoOrderId,
          });
        }
      } catch (err) {
        console.error("❌ Invalid metadata subscription_id:", metadataSubscriptionId);
      }
    }

    // Try 3: Find by matching criteria (for first-time processing)
    if (!subscription) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      subscription = await Subscription.findOne({
        productId: productId,
        paymentStatus: "pending",
        dodoMode: DODO_MODE,
        createdAt: { $gte: fiveMinutesAgo },
      })
      .sort({ createdAt: -1 })
      .populate("user", "email name")
      .populate("plan", "planName");

      if (!subscription) {
        console.error("❌ No matching subscription found", {
          productId,
          mode: DODO_MODE,
          searchedSince: fiveMinutesAgo.toISOString(),
          paymentId,
          metadata: {
            subscriptionId: metadataSubscriptionId,
            orderId: metadataOrderId,
          },
        });
        return res.status(200).send("OK - No subscription match");
      }

      console.log("✅ Found matching subscription:", {
        subscriptionId: subscription._id,
        orderId: subscription.dodoOrderId,
        userId: subscription.user?._id,
        userEmail: subscription.user?.email,
        planName: subscription.plan?.planName,
      });
    }

    // =====================================
    // STEP 4: PREPARE INVOICE ENTRY
    // =====================================
    const invoiceEntry = {
      invoiceId: data.invoice_id || null,
      invoiceURL: data.invoice_url || null,
      amount: data.settlement_amount || data.total_amount || 0,
      currency: data.settlement_currency || data.currency || "INR",
      status: data.status,
      paid: eventType === "payment.succeeded",
      paymentId: paymentId,
      customerEmail: data.customer?.email || subscription.user?.email,
      createdAt: new Date(),
    };

    // =====================================
    // STEP 5: HANDLE PAYMENT SUCCESS
    // =====================================
    if (eventType === "payment.succeeded") {
      // Update subscription status
      subscription.status = "active";
      subscription.paymentStatus = "success";
      subscription.amount = data.total_amount;
      subscription.paymentMethod = data.payment_method || "dodo";
      subscription.currency = data.settlement_currency || data.currency || "INR";
      subscription.currentPeriodStart = new Date();
      subscription.dodoPaymentId = paymentId;

       subscription.currentPeriodStart = new Date();
      
      // Calculate period end based on billing period
      const now = Date.now();
      // if (subscription.billingPeriod === "monthly") {
      //   subscription.currentPeriodEnd = new Date(now + 30 * 24 * 60 * 60 * 1000);
      // } else if (subscription.billingPeriod === "yearly") {
      //   subscription.currentPeriodEnd = new Date(now + 365 * 24 * 60 * 60 * 1000);
      // } else {
      //   // Default to 30 days if billing period not specified
      //   subscription.currentPeriodEnd = new Date(now + 30 * 24 * 60 * 60 * 1000);
      // }
      if (subscription.billingPeriod === "monthly") {
    subscription.currentPeriodEnd = new Date(
      now + 30 * 24 * 60 * 60 * 1000
    );
  } else if (subscription.billingPeriod === "yearly") {
    subscription.currentPeriodEnd = new Date(
      now + 365 * 24 * 60 * 60 * 1000
    );
  } else if (subscription.billingPeriod === "oneTime") {
    // ⭐ lifetime access
    subscription.currentPeriodEnd = null;
  } else {
    console.warn("⚠️ Unknown billing period:", subscription.billingPeriod);
    subscription.currentPeriodEnd = null;
  }
      
      // Add invoice to history
      subscription.invoices.push(invoiceEntry);
      
      // Save subscription
      await subscription.save();

      console.log("✅ PAYMENT SUCCESS - Subscription activated:", {
        subscriptionId: subscription._id,
        orderId: subscription.dodoOrderId,
        paymentId: paymentId,
        userId: subscription.user?._id,
        userEmail: subscription.user?.email || data.customer?.email,
        planName: subscription.plan?.planName,
        amount: data.total_amount,
        currency: subscription.currency,
        status: subscription.status,
        paymentStatus: subscription.paymentStatus,
        periodStart: subscription.currentPeriodStart.toISOString(),
        periodEnd: subscription.currentPeriodEnd.toISOString(),
      });

      // TODO: Send success email to user
      // await sendPaymentSuccessEmail(subscription.user.email, subscription);

      return res.status(200).send("OK - Payment Success");
    }

    // =====================================
    // STEP 6: HANDLE PAYMENT FAILURE
    // =====================================
    if (eventType === "payment.failed") {
      // Update subscription status
      subscription.status = "past_due";
      subscription.paymentStatus = "failed";
      subscription.dodoPaymentId = paymentId;
      subscription.failureReason = data.error_message || "Payment failed";
      
      // Add invoice to history
      subscription.invoices.push(invoiceEntry);
      
      // Save subscription
      await subscription.save();

      console.log("❌ PAYMENT FAILED - Subscription marked as past_due:", {
        subscriptionId: subscription._id,
        orderId: subscription.dodoOrderId,
        paymentId: paymentId,
        userId: subscription.user?._id,
        userEmail: subscription.user?.email || data.customer?.email,
        errorCode: data.error_code,
        errorMessage: data.error_message,
        status: subscription.status,
        paymentStatus: subscription.paymentStatus,
        webhookData: {
          paymentMethod: data.payment_method,
          failureStep: data.failure_step,
          bankResponse: data.bank_response_code,
        }
      });

      // TODO: Send failure email to user
      // await sendPaymentFailureEmail(subscription.user.email, subscription);

      return res.status(200).send("OK - Payment Failed");
    }

    // =====================================
    // STEP 7: HANDLE OTHER EVENT TYPES
    // =====================================
    console.log("⚠️ Unhandled webhook event type:", eventType);
    return res.status(200).send("OK - Event type not processed");

  } catch (err) {
    // =====================================
    // ERROR HANDLING
    // =====================================
    console.error("❌ WEBHOOK ERROR:", {
      message: err.message,
      stack: err.stack,
      name: err.name,
      timestamp: new Date().toISOString(),
    });

    // If signature verification fails
    if (err.message?.includes("signature") || err.message?.includes("verify")) {
      return res.status(400).send("Invalid signature");
    }

    // For other errors, still return 200 to prevent Dodo retries
    return res.status(200).send("OK - Error logged");
  }
};