const Subscription = require("../models/subscriptionModel");
const SubscriptionPlan = require("../models/subscriptionPlanModel");




// ─────────────────────────────────────────────
// HELPER: resolve DODO_MODE from env
// ─────────────────────────────────────────────
const getDodoMode = () =>
  process.env.DODO_ENV === "live" ? "live" : "test";

// =============================================
// INITIATE DODO PAYMENT
// POST /api/payments/initiate
// Body: { subscriptionId }
//
// NOTE: For Dodo subscription products, URL ?metadata[] params
// are NOT forwarded to the webhook (confirmed from live logs).
// The webhook uses data.subscription_id (saved during payment.processing)
// to find the subscription record — not metadata.
// We still append metadata here as it works for oneTime products.
// =============================================
exports.initiateDodoPayment = async (req, res) => {
  try {
    console.log("📥 INITIATE PAYMENT - Request received:", {
      userId:    req.user?._id,
      body:      req.body,
      timestamp: new Date().toISOString(),
    });

    // ──────────────────────────────────────────
    // STEP 1 — VALIDATE INPUT
    // ──────────────────────────────────────────
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      console.warn("⚠️  Missing subscriptionId");
      return res.status(400).json({
        success: false,
        message: "subscriptionId is required",
      });
    }

    // ──────────────────────────────────────────
    // STEP 2 — FIND SUBSCRIPTION
    // ──────────────────────────────────────────
    const subscription = await Subscription.findById(subscriptionId);

    if (!subscription) {
      console.warn("⚠️  Subscription not found:", subscriptionId);
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    // ── Ownership check ──────────────────────
    if (subscription.user.toString() !== req.user._id.toString()) {
      console.warn("⚠️  Unauthorized payment initiation attempt:", {
        subscriptionOwner: subscription.user,
        requestingUser:    req.user._id,
      });
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // ── Already paid? ────────────────────────
    if (subscription.paymentStatus === "success") {
      console.warn("⚠️  Payment already completed:", {
        subscriptionId,
        dodoPaymentId: subscription.dodoPaymentId,
      });
      return res.status(400).json({
        success: false,
        message: "Payment already completed for this subscription",
        dodoPaymentId: subscription.dodoPaymentId,
      });
    }

    // ──────────────────────────────────────────
    // STEP 3 — FIND PLAN
    // ──────────────────────────────────────────
    const plan = await SubscriptionPlan.findById(subscription.plan);

    if (!plan) {
      console.warn("⚠️  Plan not found for subscription:", subscriptionId);
      return res.status(404).json({
        success: false,
        message: "Subscription plan not found",
      });
    }

    // ──────────────────────────────────────────
    // STEP 4 — GET DODO CONFIG
    // ──────────────────────────────────────────
    const DODO_MODE  = getDodoMode();
    const dodoConfig = plan.dodo?.[DODO_MODE];

    if (!dodoConfig?.paymentLink) {
      console.error("❌ No Dodo payment link found:", {
        planName: plan.planName,
        mode:     DODO_MODE,
        subscriptionId,
      });
      return res.status(400).json({
        success: false,
        message: `Payment link not configured for "${plan.planName}" in ${DODO_MODE} mode`,
      });
    }

    // ──────────────────────────────────────────
    // STEP 5 — CONSTRUCT REDIRECT URL
    // ──────────────────────────────────────────
    const FRONTEND_URL = process.env.CLIENT_URL || "http://localhost:3000";
    const redirectUrl  = `${FRONTEND_URL}/payment-processing`;

    // ──────────────────────────────────────────
    // STEP 6 — BUILD PAYMENT URL WITH PARAMS
    // ──────────────────────────────────────────
    const params = new URLSearchParams();

    params.append("redirect_url",              redirectUrl);
    params.append("metadata[subscription_id]", subscriptionId.toString());
    params.append("metadata[order_id]",        subscription.dodoOrderId);
    params.append("metadata[user_id]",         subscription.user.toString());
    params.append("metadata[billing_period]",  subscription.billingPeriod);

    const separator  = dodoConfig.paymentLink.includes("?") ? "&" : "?";
    const paymentUrl = `${dodoConfig.paymentLink}${separator}${params.toString()}`;

    // ──────────────────────────────────────────
    // STEP 7 — LOG PAYMENT INITIATION
    // ──────────────────────────────────────────
    console.log("📤 Payment Initiation:", {
      planName:      plan.planName,
      billingPeriod: subscription.billingPeriod,
      currency:      subscription.currency,
      subscriptionId,
      orderId:       subscription.dodoOrderId,
      userId:        subscription.user,
      mode:          DODO_MODE,
      redirectUrl,
      paymentUrl,
    });

    // ──────────────────────────────────────────
    // STEP 8 — RETURN RESPONSE
    // ──────────────────────────────────────────
    return res.status(200).json({
      success:        true,
      paymentUrl,
      redirectUrl,
      mode:           DODO_MODE,
      subscriptionId,
      orderId:        subscription.dodoOrderId,
      billingPeriod:  subscription.billingPeriod,
      currency:       subscription.currency,
      message:        `Redirecting to Dodo payment gateway (${DODO_MODE})`,
    });

  } catch (error) {
    // ──────────────────────────────────────────
    // ERROR HANDLING
    // ──────────────────────────────────────────
    console.error("❌ PAYMENT INIT ERROR:", {
      message:   error.message,
      stack:     error.stack,
      userId:    req.user?._id,
      timestamp: new Date().toISOString(),
    });

    return res.status(500).json({
      success: false,
      message: "Unable to initiate payment",
      error:   process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
// exports.initiateDodoPayment = async (req, res) => {
//   try {
//     const { subscriptionId } = req.body;
//     if (!subscriptionId) {
//       return res.status(400).json({
//         success: false,
//         message: "subscriptionId is required",
//       });
//     }

//     const subscription = await Subscription.findById(subscriptionId);
//     if (!subscription) {
//       return res.status(404).json({
//         success: false,
//         message: "Subscription not found",
//       });
//     }

//     if (subscription.paymentStatus === "success") {
//       return res.status(400).json({
//         success: false,
//         message: "Payment already completed",
//       });
//     }

//     const plan = await SubscriptionPlan.findById(subscription.plan);
//     if (!plan) {
//       return res.status(404).json({
//         success: false,
//         message: "Plan not found",
//       });
//     }

//     console.log("📤 Payment Initiation:", {
//       planName: plan.planName,
//       amount: subscription.amount,
//       subscriptionId: subscriptionId,
//       mode: DODO_MODE,
//     });

//     const dodoConfig = plan.dodo?.[DODO_MODE];
//     if (!dodoConfig || !dodoConfig.paymentLink) {
//       console.error(
//         `❌ No Dodo payment link found for ${plan.planName} in ${DODO_MODE} mode`
//       );
//       return res.status(400).json({
//         success: false,
//         message: `Payment link not configured for ${plan.planName} in ${DODO_MODE} mode`,
//       });
//     }

//     const paymentUrl = dodoConfig.paymentLink;
    
//     // ✅ Append metadata to the URL (Dodo will return this in webhook)
//     const urlWithMetadata = `${paymentUrl}${
//       paymentUrl.includes("?") ? "&" : "?"
//     }metadata[subscription_id]=${subscriptionId}&metadata[order_id]=${subscription.dodoOrderId}`;

//     console.log(
//       `✅ Using Dodo payment link for ${DODO_MODE} mode:`,
//       urlWithMetadata
//     );

//     return res.json({
//       success: true,
//       paymentUrl: urlWithMetadata,
//       mode: DODO_MODE,
//       message: `Redirecting to Dodo payment gateway (${DODO_MODE})`,
//     });
//   } catch (error) {
//     console.error("❌ PAYMENT INIT ERROR:", {
//       message: error.message,
//       stack: error.stack,
//     });
//     return res.status(500).json({
//       success: false,
//       message: "Unable to initiate payment",
//       error:
//         process.env.NODE_ENV === "development" ? error.message : undefined,
//     });
//   }
// };