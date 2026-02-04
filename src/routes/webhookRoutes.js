const express = require("express");
const router = express.Router();
const dodoWebhookController = require("../controllers/dodoWebhookController");

// RAW BODY REQUIRED
router.post(
  "/dodo",
  express.raw({ type: "application/json" }),
  dodoWebhookController.handleDodoWebhook
);

module.exports = router;
