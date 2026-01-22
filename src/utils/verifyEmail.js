const verifyEmailTemplate = ({ firstname, verifyUrl }) => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Email Verification</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f7fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f7fa;padding:20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
          
          <!-- HEADER -->
          <tr>
            <td style="background:#4a6cf7;color:#ffffff;padding:25px;text-align:center;">
              <h1 style="margin:0;font-size:26px;">Confirm Your Email</h1>
              <p style="margin-top:8px;font-size:15px;opacity:0.9;">
                Verify your email to continue
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
                Please confirm your email address to activate your account.
              </p>

              <!-- BUTTON -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0;">
                <tr>
                  <td align="center">
                    <a href="${verifyUrl}"
                      style="
                        background:#4a6cf7;
                        color:#ffffff;
                        text-decoration:none;
                        padding:14px 30px;
                        border-radius:6px;
                        font-size:16px;
                        font-weight:bold;
                        display:inline-block;
                      ">
                      Verify Email
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size:14px;color:#777;">
                ⏰ This verification link will expire in <strong>15 minutes</strong>.
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

module.exports = verifyEmailTemplate;
