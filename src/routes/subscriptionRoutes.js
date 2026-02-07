// routes/subscriptionRoutes.js
const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

const {
  getAllPlans,
  createSubscription,
  getSubscriptionDetails,
  cancelSubscription,
  getCurrentSubscription,
  checkSubscriptionStatus,
  dodoRedirectHelper, // ✅ ADD THIS
  getSubscriptionById
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
router.get("/:id", protect, authorizeRoles("student"), getSubscriptionById);
router.post("/payments/dodo/initiate", protect, initiateDodoPayment);


// routes/subscriptionRoutes.js
router.get("/dodo/redirect", dodoRedirectHelper);

// Download invoice
router.get("/invoice/:invoiceId", protect, downloadInvoice);



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
// Note: test-only routes (mark-paid, redirect) removed in cleanup

// Cancel subscription
router.delete(
  "/:subscriptionId",
  protect,
  authorizeRoles("student"),
  cancelSubscription
);

module.exports = router;