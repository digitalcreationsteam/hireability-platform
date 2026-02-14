const nodemailer = require("nodemailer");

const sendEmail = async ({ to, subject, html }) => {
  try {
    // 🔍 ENV CHECK
    console.log("📧 EMAIL_USER:", process.env.EMAIL_USER);
    console.log(
      "📧 EMAIL_PASS:",
      process.env.EMAIL_PASS ? "SET ✅" : "NOT SET ❌"
    );

    // 🚀 CREATE TRANSPORTER
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // true for 465, false for 587
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // APP PASSWORD ONLY
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    // ✅ VERIFY TRANSPORTER
    console.log("📧 Verifying transporter...");
    await transporter.verify();
    console.log("✅ Transporter verified");

    // ✉️ SEND EMAIL
    const info = await transporter.sendMail({
      from: `"UNITALENT" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log("✅ Email sent successfully");
    console.log("📨 Message ID:", info.messageId);

    return info;
  } catch (error) {
    console.error("❌ sendEmail ERROR:");
    console.error(error);
    throw new Error("Email sending failed");
  }
};

module.exports = sendEmail;
