// utils/otpEmailTemplate.js
const otpEmailTemplate = ({ firstname, otp }) => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Email Verification OTP</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f7fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f7fa;padding:20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
          
          <!-- HEADER -->
          <tr>
            <td style="background:#4a6cf7;color:#ffffff;padding:25px;text-align:center;">
              <h1 style="margin:0;font-size:26px;">Email Verification</h1>
              <p style="margin-top:8px;font-size:15px;opacity:0.9;">
                Your OTP for email verification
              </p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:30px;color:#333;">
              <p style="font-size:18px;margin-bottom:15px;">
                Hello <strong style="color:#4a6cf7;">${firstname}</strong>,
              </p>

              <p style="font-size:15px;line-height:1.6;color:#555;">
                Thank you for signing up at <strong>UnitechCloud</strong>.
                Please use the following OTP to verify your email address:
              </p>

              <!-- OTP BOX -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0;">
                <tr>
                  <td align="center">
                    <div style="
                      background:#f0f4ff;
                      border:2px dashed #4a6cf7;
                      border-radius:10px;
                      padding:20px;
                      font-size:36px;
                      font-weight:bold;
                      letter-spacing:8px;
                      color:#4a6cf7;
                      display:inline-block;
                    ">
                      ${otp}
                    </div>
                  </td>
                </tr>
              </table>

              <p style="font-size:14px;color:#777;">
                ⏰ This OTP will expire in <strong>10 minutes</strong>.
              </p>

              <p style="font-size:13px;color:#999;margin-top:25px;">
                If you did not create this account, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f8f9fa;text-align:center;padding:15px;font-size:12px;color:#777;">
              © ${new Date().getFullYear()} UnitechCloud. All rights reserved.<br>
              This is an automated email, please do not reply.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

module.exports = otpEmailTemplate;