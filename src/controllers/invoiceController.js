const path = require("path");
const fs = require("fs");
const Subscription = require("../models/subscriptionModel");

exports.downloadInvoice = async (req, res) => {
  const { invoiceId } = req.params;
  const userId = req.user._id;

  const subscription = await Subscription.findOne({
    user: userId,
    "invoices.invoiceId": invoiceId,
  });

  if (!subscription) {
    return res.status(404).json({
      success: false,
      message: "Invoice not found",
    });
  }

  const filePath = path.join(
    __dirname,
    "../invoices",
    `${invoiceId}.pdf`
  );

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      message: "Invoice file missing",
    });
  }

  res.download(filePath);
};
