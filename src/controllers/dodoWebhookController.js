const Subscription = require("../models/subscriptionModel");
const { Webhook } = require("svix");
const mongoose = require("mongoose");

// ─────────────────────────────────────────────
// HELPER: compute period end from billingPeriod
// ─────────────────────────────────────────────
const computePeriodEnd = (billingPeriod) => {
  const now = Date.now();
  switch (billingPeriod) {
    case "monthly":
      return new Date(now + 30 * 24 * 60 * 60 * 1000);
    case "yearly":
      return new Date(now + 365 * 24 * 60 * 60 * 1000);
    case "oneTime":
      return null; // null = lifetime — isActive virtual: (!currentPeriodEnd || currentPeriodEnd >= now)
    default:
      console.warn("⚠️  Unknown billingPeriod:", billingPeriod, "— defaulting to null (lifetime)");
      return null;
  }
};

// =============================================
// DODO WEBHOOK HANDLER
// POST /api/webhooks/dodo
//
// IMPORTANT: Route must use express.raw() middleware, NOT express.json()
//   router.post("/dodo", express.raw({ type: "application/json" }), handleDodoWebhook)
//
// REAL BEHAVIOR (confirmed from live logs):
//   1. payment.processing fires FIRST  → product_cart=null, metadata={}, total_amount=0
//   2. payment.succeeded fires AFTER   → product_cart populated, metadata still {}
//   3. For subscription products, URL ?metadata[] params are NOT forwarded to webhook
//   4. data.subscription_id (Dodo's own ID e.g. "sub_0NZT…") is reliable — store it
//   5. data.metadata is always {} for subscription products — never rely on it
// =============================================
exports.handleDodoWebhook = async (req, res) => {
  console.log("\n──────────────────────────────────────────────");
  console.log("📥 DODO WEBHOOK HIT:", new Date().toISOString());
  console.log("──────────────────────────────────────────────");

  try {
    // ──────────────────────────────────────────
    // STEP 1 — VERIFY WEBHOOK SIGNATURE (Svix)
    // ──────────────────────────────────────────
    const payload = req.body.toString();

    const headers = {
      "svix-id":        req.headers["webhook-id"],
      "svix-timestamp": req.headers["webhook-timestamp"],
      "svix-signature": req.headers["webhook-signature"],
    };

    console.log("🔐 Webhook headers received:", {
      "svix-id":        headers["svix-id"],
      "svix-timestamp": headers["svix-timestamp"],
      "svix-signature": headers["svix-signature"]?.substring(0, 20) + "…",
    });

    const DODO_MODE = process.env.DODO_ENV === "live" ? "live" : "test";

    const secret =
      DODO_MODE === "live"
        ? process.env.DODO_LIVE_WEBHOOK_SECRET
        : process.env.DODO_TEST_WEBHOOK_SECRET;

    if (!secret) {
      console.error("❌ Webhook secret not configured for mode:", DODO_MODE);
      return res.status(500).send("Webhook secret missing");
    }

    let event;
    try {
      const wh = new Webhook(secret);
      event = wh.verify(payload, headers);
    } catch (verifyErr) {
      console.error("❌ Signature verification failed:", {
        error: verifyErr.message,
        mode: DODO_MODE,
        "svix-id": headers["svix-id"],
      });
      return res.status(400).send("Invalid webhook signature");
    }

    console.log("✅ Webhook signature verified:", {
      eventType: event.type,
      mode: DODO_MODE,
    });

    // ──────────────────────────────────────────
    // STEP 2 — EXTRACT DATA
    // ──────────────────────────────────────────
    const data      = event.data;
    const eventType = event.type;

    const paymentId = data.payment_id;

    // product_cart is null during payment.processing — safe fallback to null
    const productId = data.product_cart?.[0]?.product_id ?? null;

    // Dodo's own subscription ID — present for subscription products on every event
    // This is the most reliable lookup key since URL metadata params are NOT forwarded
    const dodoSubscriptionId = data.subscription_id ?? null;

    // metadata is always {} for subscription products
    // Only populated for oneTime products that pass ?metadata[] in URL
    const metadata           = data.metadata || {};
    const metaSubscriptionId = metadata.subscription_id ?? null;
    const metaOrderId        = metadata.order_id ?? null;

    console.log("📦 Webhook event data:", {
      data,
      eventType,
      paymentId,
      productId:          productId          ?? "null (normal for payment.processing)",
      dodoSubscriptionId: dodoSubscriptionId ?? "null",
      status:             data.status,
      totalAmount:        data.total_amount,
      settledAmount:      data.settlement_amount,
      currency:           data.settlement_currency || data.currency,
      customerEmail:      data.customer?.email,
      cardLast4:          data.card_last_four ?? null,
      cardNetwork:        data.card_network   ?? null,
      invoiceId:          data.invoice_id,
      mode:               DODO_MODE,
      metadata: {
        subscriptionId: metaSubscriptionId ?? "empty (normal for subscription products)",
        orderId:        metaOrderId        ?? "empty",
      },
    });

    // ──────────────────────────────────────────
    // STEP 3 — HANDLE: payment.processing
    //
    // Fires when user submits card but bank hasn't confirmed yet.
    // product_cart=null, metadata={}, total_amount=0 at this stage.
    // CRITICAL: dodoSubscriptionId (sub_0NZT…) IS present at this point.
    // We must save it to the DB NOW so Tier 2 lookup works on payment.succeeded.
    // Without this, payment.succeeded has no way to find the subscription
    // since URL metadata[] params are not forwarded by Dodo.
    // ──────────────────────────────────────────
    if (eventType === "payment.processing") {
      console.log("⏳ payment.processing — acknowledged:", {
        paymentId,
        dodoSubscriptionId: dodoSubscriptionId ?? "null",
        customerEmail:      data.customer?.email,
        cardLast4:          data.card_last_four ?? null,
        status:             data.status,
      });

      // Save dodoSubscriptionId now so payment.succeeded can find this record via Tier 2
      if (dodoSubscriptionId) {
        try {
          // Use time-window to find the pending subscription for this product
          const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

          // First try: already has this dodoSubscriptionId stored (re-processing event)
          let pendingSub = await Subscription.findOne({ dodoSubscriptionId });

          // Second try: find the most recent pending sub in this time window
          if (!pendingSub) {
            pendingSub = await Subscription.findOne({
              paymentStatus: "pending",
              dodoMode:      DODO_MODE,
              createdAt:     { $gte: tenMinutesAgo },
            }).sort({ createdAt: -1 });
          }

          if (pendingSub) {
            let updated = false;

            if (!pendingSub.dodoSubscriptionId) {
              pendingSub.dodoSubscriptionId = dodoSubscriptionId;
              updated = true;
            }

            // Also persist paymentId early — it is available at processing stage
            if (paymentId && !pendingSub.dodoPaymentId) {
              pendingSub.dodoPaymentId = paymentId;
              updated = true;
            }

            if (updated) {
              await pendingSub.save();
              console.log("✅ IDs saved during payment.processing:", {
                subscriptionId:     pendingSub._id,
                orderId:            pendingSub.dodoOrderId,
                dodoSubscriptionId: pendingSub.dodoSubscriptionId,
                dodoPaymentId:      pendingSub.dodoPaymentId,
              });
            } else {
              console.log("ℹ️  IDs already set — no update needed:", {
                subscriptionId:     pendingSub._id,
                dodoSubscriptionId: pendingSub.dodoSubscriptionId,
                dodoPaymentId:      pendingSub.dodoPaymentId,
              });
            }
          } else {
            console.warn("⚠️  payment.processing — no pending subscription found to attach dodoSubscriptionId:", {
              dodoSubscriptionId,
              mode:          DODO_MODE,
              searchedSince: tenMinutesAgo.toISOString(),
            });
          }
        } catch (err) {
          // Non-critical — log and continue. payment.succeeded will fall back to Tier 4.
          console.error("❌ Failed to save dodoSubscriptionId during processing:", {
            error:             err.message,
            dodoSubscriptionId,
          });
        }
      }

      return res.status(200).send("OK - Processing acknowledged");
    }

    // ──────────────────────────────────────────
    // STEP 4 — VALIDATE ESSENTIAL FIELDS
    // ──────────────────────────────────────────
    if (!paymentId) {
      console.error("❌ No payment_id in webhook payload");
      return res.status(200).send("OK - Missing payment_id");
    }

    // ──────────────────────────────────────────
    // STEP 5 — 4-TIER SUBSCRIPTION LOOKUP
    //
    // Tier 1: dodoPaymentId       — idempotency (already processed this exact payment?)
    // Tier 2: dodoSubscriptionId  — Dodo's sub ID on data.subscription_id (most reliable for subscription plans)
    // Tier 3: metadata.subscription_id — our own MongoDB ID (works for oneTime plans only)
    // Tier 4: productId + time window — last resort fallback
    // ──────────────────────────────────────────
    let subscription = null;
    let lookupMethod = null;

    // ── Tier 1: dodoPaymentId — idempotency check ──
    subscription = await Subscription.findOne({ dodoPaymentId: paymentId })
      .populate("user", "email name")
      .populate("plan", "planName billingPeriod");

    if (subscription) {
      lookupMethod = "dodoPaymentId";
      console.log("🔍 Tier 1 hit — found by dodoPaymentId:", {
        subscriptionId: subscription._id,
        currentStatus:  subscription.status,
        paymentStatus:  subscription.paymentStatus,
      });

      const alreadySucceeded =
        eventType === "payment.succeeded" && subscription.paymentStatus === "success";
      const alreadyFailed =
        eventType === "payment.failed" && subscription.paymentStatus === "failed";

      if (alreadySucceeded || alreadyFailed) {
        console.log("✅ Duplicate webhook — already processed, skipping:", {
          subscriptionId: subscription._id,
          eventType,
        });
        return res.status(200).send("OK - Already processed");
      }
    }

    // ── Tier 2: dodoSubscriptionId (subscription products) ──
    // data.subscription_id = Dodo's "sub_0NZT…" field in webhook payload
    if (!subscription && dodoSubscriptionId) {
      subscription = await Subscription.findOne({ dodoSubscriptionId })
        .populate("user", "email name")
        .populate("plan", "planName billingPeriod");

      if (subscription) {
        lookupMethod = "dodoSubscriptionId";
        console.log("🔍 Tier 2 hit — found by dodoSubscriptionId:", {
          subscriptionId:    subscription._id,
          dodoSubscriptionId,
          orderId:           subscription.dodoOrderId,
          userId:            subscription.user?._id,
        });
      }
    }

    // ── Tier 3: metadata.subscription_id (oneTime products) ──
    if (!subscription && metaSubscriptionId) {
      try {
        subscription = await Subscription.findById(metaSubscriptionId)
          .populate("user", "email name")
          .populate("plan", "planName billingPeriod");

        if (subscription) {
          lookupMethod = "metadata.subscription_id";
          console.log("🔍 Tier 3 hit — found by metadata.subscription_id:", {
            subscriptionId: subscription._id,
            orderId:        subscription.dodoOrderId,
            userId:         subscription.user?._id,
          });
        }
      } catch (err) {
        console.error("❌ Invalid metadata.subscription_id format:", metaSubscriptionId);
      }
    }

    // ── Tier 4: productId + time window (last resort) ──
    if (!subscription && productId) {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

      subscription = await Subscription.findOne({
        productId,
        paymentStatus: "pending",
        dodoMode: DODO_MODE,
        createdAt: { $gte: tenMinutesAgo },
      })
        .sort({ createdAt: -1 })
        .populate("user", "email name")
        .populate("plan", "planName billingPeriod");

      if (subscription) {
        lookupMethod = "time-window-fallback";
        console.log("🔍 Tier 4 hit — found by time-window fallback:", {
          subscriptionId: subscription._id,
          productId,
          createdAt:      subscription.createdAt,
        });
      }
    }
if (!subscription && data.payment_link) {
  // Strip query params — stored link is clean, webhook link may have params
  const cleanLink = data.payment_link.split("?")[0];

  subscription = await Subscription.findOne({
    // dodoPaymentLink: cleanLink,
    paymentStatus:   "pending",
    dodoMode:        DODO_MODE,
  })
    .sort({ createdAt: -1 })
    .populate("user", "email name")
    .populate("plan", "planName billingPeriod");

  if (subscription) {
    // Stamp dodoSubscriptionId so all future webhooks hit Tier 2 directly
    if (dodoSubscriptionId && !subscription.dodoSubscriptionId) {
      subscription.dodoSubscriptionId = dodoSubscriptionId;
      await subscription.save();
    }
    lookupMethod = "tier0-payment-link";
    console.log("✅ Tier 0 HIT — matched by payment_link:", {
      subscriptionId:    subscription._id,
      dodoSubscriptionId,
      paymentLink:       cleanLink,
    });
  }
}
    if (!subscription) {
      console.error("❌ No matching subscription found across all 4 tiers:", {
        paymentId,
        productId:          productId          ?? "null",
        dodoSubscriptionId: dodoSubscriptionId ?? "null",
        metaSubscriptionId: metaSubscriptionId ?? "null",
        mode:               DODO_MODE,
        eventType,
      });
      return res.status(200).send("OK - No subscription match");
    }

    console.log("✅ Subscription resolved:", {
      subscriptionId:  subscription._id,
      orderId:         subscription.dodoOrderId,
      userId:          subscription.user?._id,
      userEmail:       subscription.user?.email,
      planName:        subscription.plan?.planName,
      billingPeriod:   subscription.billingPeriod,
      currentStatus:   subscription.status,
      paymentStatus:   subscription.paymentStatus,
      lookupMethod,
    });

    // ──────────────────────────────────────────
    // STEP 6 — BUILD INVOICE ENTRY
    // ──────────────────────────────────────────
    const invoiceEntry = {
      invoiceId:     data.invoice_id     || null,
      invoiceURL:    data.invoice_url    || null,
      amount:        data.settlement_amount || data.total_amount || 0,
      currency:      data.settlement_currency || data.currency || "INR",
      status:        data.status,
      paid:          eventType === "payment.succeeded",
      paymentId,
      customerEmail: data.customer?.email || subscription.user?.email,
      createdAt:     new Date(),
    };

    // ──────────────────────────────────────────
    // STEP 7 — HANDLE: payment.succeeded
    // ──────────────────────────────────────────
    if (eventType === "payment.succeeded") {
      const periodEnd = computePeriodEnd(subscription.billingPeriod);

      subscription.status             = "active";
      subscription.paymentStatus      = "success";
      subscription.amount             = data.total_amount;
      subscription.paymentMethod      = data.payment_method || "dodo";
      subscription.currency           = data.settlement_currency || data.currency || subscription.currency;
      subscription.dodoPaymentId      = paymentId;
      subscription.currentPeriodStart = new Date();
      subscription.currentPeriodEnd   = periodEnd;

      // Persist Dodo's subscription_id for future webhook lookups (Tier 2)
      if (dodoSubscriptionId && !subscription.dodoSubscriptionId) {
        subscription.dodoSubscriptionId = dodoSubscriptionId;
      }

      subscription.invoices.push(invoiceEntry);
      await subscription.save();

      console.log("✅ PAYMENT SUCCESS — Subscription activated:", {
        subscriptionId:    subscription._id,
        orderId:           subscription.dodoOrderId,
        paymentId,
        dodoSubscriptionId,
        userId:            subscription.user?._id,
        userEmail:         subscription.user?.email || data.customer?.email,
        planName:          subscription.plan?.planName,
        billingPeriod:     subscription.billingPeriod,
        amount:            subscription.amount,
        currency:          subscription.currency,
        status:            subscription.status,
        paymentStatus:     subscription.paymentStatus,
        periodStart:       subscription.currentPeriodStart.toISOString(),
        periodEnd:         periodEnd ? periodEnd.toISOString() : "null (lifetime — oneTime plan)",
        lookupMethod,
      });

      // TODO: await sendPaymentSuccessEmail(subscription.user.email, subscription);

      return res.status(200).send("OK - Payment Success");
    }

    // ──────────────────────────────────────────
    // STEP 8 — HANDLE: payment.failed
    // ──────────────────────────────────────────
    if (eventType === "payment.failed") {
      subscription.status        = "past_due";
      subscription.paymentStatus = "failed";
      subscription.dodoPaymentId = paymentId;
      subscription.failureReason = data.error_message || "Payment failed";

      if (dodoSubscriptionId && !subscription.dodoSubscriptionId) {
        subscription.dodoSubscriptionId = dodoSubscriptionId;
      }

      subscription.invoices.push(invoiceEntry);
      await subscription.save();

      console.error("❌ PAYMENT FAILED — Subscription marked as past_due:", {
        subscriptionId:  subscription._id,
        orderId:         subscription.dodoOrderId,
        paymentId,
        dodoSubscriptionId,
        userId:          subscription.user?._id,
        userEmail:       subscription.user?.email || data.customer?.email,
        planName:        subscription.plan?.planName,
        billingPeriod:   subscription.billingPeriod,
        status:          subscription.status,
        paymentStatus:   subscription.paymentStatus,
        failureReason:   subscription.failureReason,
        errorCode:       data.error_code,
        paymentMethod:   data.payment_method,
        failureStep:     data.failure_step,
        bankResponse:    data.bank_response_code,
        lookupMethod,
      });

      // TODO: await sendPaymentFailureEmail(subscription.user.email, subscription);

      return res.status(200).send("OK - Payment Failed");
    }

    // ──────────────────────────────────────────
    // STEP 9 — UNHANDLED EVENT TYPE
    // ──────────────────────────────────────────
    console.warn("⚠️  Unhandled webhook event type:", {
      eventType,
      paymentId,
      dodoSubscriptionId,
      mode: DODO_MODE,
    });
    return res.status(200).send(`OK - Event "${eventType}" not handled`);

  } catch (err) {
    console.error("❌ WEBHOOK UNHANDLED ERROR:", {
      name:      err.name,
      message:   err.message,
      stack:     err.stack,
      timestamp: new Date().toISOString(),
    });
    return res.status(200).send("OK - Error logged");
  }
};