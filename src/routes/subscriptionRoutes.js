// routes/subscriptionRoutes.js
const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

const {
  getAllPlans,
  createSubscription,
  verifyPayment,
  getSubscriptionDetails,
  cancelSubscription,
  getCurrentSubscription,
  checkSubscriptionStatus,
  markSubscriptionAsPaid,
  dodoRedirectHelper,
} = require("../controllers/subscriptionController");
const { initiateDodoPayment } = require("../controllers/paymentController");
const { downloadInvoice } = require("../controllers/invoiceController");



const router = express.Router();

/* =================================================
   SUBSCRIPTION ROUTES
================================================= */

// Get all available plans (public)
router.get("/plans", getAllPlans);

// Create subscription / Generate payment order
router.post(
  "/create",
  protect,
  authorizeRoles("student"),
  createSubscription
);

router.post("/payments/dodo/initiate", protect, initiateDodoPayment);
router.get("/invoice/:invoiceId", protect, downloadInvoice);

// Verify payment
router.post(
  "/verify",
  protect,
  authorizeRoles("student"),
  verifyPayment
);

// Get all subscriptions for user
router.get(
  "/",
  protect,
  authorizeRoles("student"),
  getSubscriptionDetails
);

// Get current active subscription
router.get(
  "/current",
  protect,
  authorizeRoles("student"),
  getCurrentSubscription
);

// Check subscription status by ID (for PaymentSuccess page - no auth required)
router.get("/status/:subscriptionId", checkSubscriptionStatus);

// Mark subscription as paid (TEST MODE - for DODO test checkout without webhooks)
router.post("/mark-paid", markSubscriptionAsPaid);

// Redirect helper from DODO (sends HTML redirect to frontend)
router.get("/redirect/dodo", dodoRedirectHelper);

// Cancel subscription
router.delete(
  "/:subscriptionId",
  protect,
  authorizeRoles("student"),
  cancelSubscription
);

module.exports = router;