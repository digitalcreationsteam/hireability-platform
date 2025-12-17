const nodemailer = require("nodemailer");

const sendEmail = async ({ to, subject, html }) => {
  try {
    console.log("📧 Creating transporter...");
    
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    console.log("📧 Verifying transporter...");
    await transporter.verify();
    console.log("✅ Transporter verified successfully");

    console.log("📧 Sending email...");
    const info = await transporter.sendMail({
      from: `"Hireability Platform" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log("✅ Email sent:", info.messageId);
    console.log("✅ Response:", info.response);
    
    return info;

  } catch (error) {
    console.error("❌ sendEmail error:", error.message);
    throw error;
  }
};

module.exports = sendEmail;