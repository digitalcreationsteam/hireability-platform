const Subscription = require("../models/subscriptionModel");
const SubscriptionPlan = require("../models/subscriptionPlanModel");

// Add this line
const DODO_MODE = process.env.DODO_ENV === "live" ? "live" : "test";

exports.initiateDodoPayment = async (req, res) => {
  try {
    // =====================================
    // STEP 1: VALIDATE INPUT
    // =====================================
    const { subscriptionId } = req.body;
    
    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        message: "subscriptionId is required",
      });
    }

    // =====================================
    // STEP 2: FIND SUBSCRIPTION
    // =====================================
    const subscription = await Subscription.findById(subscriptionId);
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    // Check if payment already completed
    if (subscription.paymentStatus === "success") {
      return res.status(400).json({
        success: false,
        message: "Payment already completed for this subscription",
      });
    }

    // =====================================
    // STEP 3: FIND PLAN
    // =====================================
    const plan = await SubscriptionPlan.findById(subscription.plan);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Subscription plan not found",
      });
    }

    // =====================================
    // STEP 4: GET DODO CONFIG
    // =====================================
    const DODO_MODE = process.env.DODO_ENV === "live" ? "live" : "test";
    const dodoConfig = plan.dodo?.[DODO_MODE];

    if (!dodoConfig || !dodoConfig.paymentLink) {
      console.error(
        `❌ No Dodo payment link found for ${plan.planName} in ${DODO_MODE} mode`
      );
      return res.status(400).json({
        success: false,
        message: `Payment link not configured for ${plan.planName} in ${DODO_MODE} mode`,
      });
    }

    // =====================================
    // STEP 5: CONSTRUCT REDIRECT URL
    // =====================================
    const FRONTEND_URL = process.env.CLIENT_URL || "http://localhost:3000";
    const redirectUrl = `${FRONTEND_URL}/payment-processing`;

    // =====================================
    // STEP 6: BUILD PAYMENT URL WITH PARAMS
    // =====================================
    const basePaymentUrl = dodoConfig.paymentLink;
    const params = new URLSearchParams();
    
    // Add redirect URL
    params.append("redirect_url", redirectUrl);
    
    // Add metadata (Dodo will return this in webhook)
    params.append("metadata[subscription_id]", subscriptionId);
    params.append("metadata[order_id]", subscription.dodoOrderId);
    
    // Construct final payment URL
    const paymentUrl = `${basePaymentUrl}${
      basePaymentUrl.includes("?") ? "&" : "?"
    }${params.toString()}`;

    // =====================================
    // STEP 7: LOG PAYMENT INITIATION
    // =====================================
    console.log("📤 Payment Initiation:", {
      planName: plan.planName,
      amount: subscription.amount,
      subscriptionId: subscriptionId,
      orderId: subscription.dodoOrderId,
      mode: DODO_MODE,
      redirectUrl: redirectUrl,
      paymentUrl: paymentUrl,
    });

    // =====================================
    // STEP 8: RETURN RESPONSE
    // =====================================
    return res.json({
      success: true,
      paymentUrl: paymentUrl,
      redirectUrl: redirectUrl,
      mode: DODO_MODE,
      subscriptionId: subscriptionId,
      message: `Redirecting to Dodo payment gateway (${DODO_MODE})`,
    });

  } catch (error) {
    // =====================================
    // ERROR HANDLING
    // =====================================
    console.error("❌ PAYMENT INIT ERROR:", {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    
    return res.status(500).json({
      success: false,
      message: "Unable to initiate payment",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
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