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
} = require("../controllers/subscriptionController");
const paymentController = require("../controllers/paymentController");
const invoiceController = require("../controllers/invoiceController");


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

router.post("/payments/dodo/initiate", protect, paymentController.initiateDodoPayment);
router.get("/invoice/:invoiceId", protect, invoiceController.downloadInvoice);

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

// Cancel subscription
router.delete(
  "/:subscriptionId",
  protect,
  authorizeRoles("student"),
  cancelSubscription
);

module.exports = router;