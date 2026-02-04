const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

module.exports = function generateInvoicePdf({
  invoiceId,
  studentName,
  email,
  planName,
  amount,
  currency,
  billingPeriod,
  paymentId,
}) {
  const invoicesDir = path.join(__dirname, "../invoices");
  if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir);

  const filePath = path.join(invoicesDir, `${invoiceId}.pdf`);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(20).text("INVOICE", { align: "center" });
  doc.moveDown();

  doc.fontSize(12);
  doc.text(`Invoice ID: ${invoiceId}`);
  doc.text(`Payment ID: ${paymentId}`);
  doc.text(`Student: ${studentName}`);
  doc.text(`Email: ${email}`);
  doc.text(`Plan: ${planName}`);
  doc.text(`Billing: ${billingPeriod}`);
  doc.text(`Amount Paid: ${currency} ${amount}`);
  doc.text(`Date: ${new Date().toLocaleDateString()}`);

  doc.moveDown(2);
  doc.text("Thank you for your purchase!", { align: "center" });

  doc.end();

  return filePath;
};
