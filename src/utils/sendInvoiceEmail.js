const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

module.exports = async function sendInvoiceEmail({
  to,
  studentName,
  invoicePath,
}) {
  await transporter.sendMail({
    from: `"UniTalent" <${process.env.SMTP_EMAIL}>`,
    to,
    subject: "Your Subscription Invoice",
    html: `
      <p>Hi ${studentName},</p>
      <p>Your subscription payment was successful.</p>
      <p>Please find your invoice attached.</p>
      <br/>
      <p>— UniTalent Team</p>
    `,
    attachments: [
      {
        filename: "invoice.pdf",
        path: invoicePath,
      },
    ],
  });
};
