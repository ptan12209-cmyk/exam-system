const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'supabase', 'email-templates');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

function getBaseTemplate({ badge, title, body, showToken = true, tokenLabel = 'Mã xác thực OTP', buttonText, buttonUrl = '{{ .ConfirmationURL }}', securityText, preheader }) {
  return `<!DOCTYPE html>
<html lang="vi" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #0B0A13; }
    @media screen and (max-width: 600px) {
      .mobile-card { padding: 28px 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0A13; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="display: none; font-size: 1px; color: #0B0A13; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${preheader}
  </div>

  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #0B0A13; width: 100%;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <!-- Container -->
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 540px; margin: 0 auto;">
          
          <!-- Logo Header -->
          <tr>
            <td style="padding-bottom: 24px; text-align: left;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #1C1A2D; border: 1px solid #2A2344; border-radius: 12px; padding: 8px 14px;">
                    <span style="font-size: 15px; font-weight: 700; color: #F1EDF9; letter-spacing: -0.02em;">ExamHub</span>
                    <span style="display: inline-block; width: 6px; height: 6px; background-color: #C18CFF; border-radius: 50%; margin-left: 4px; vertical-align: middle;"></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background-color: #15131F; border: 1px solid #2A2344; border-radius: 20px; padding: 36px 32px;" class="mobile-card">
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
                
                <!-- Badge -->
                <tr>
                  <td>
                    <span style="display: inline-block; background-color: rgba(193, 140, 255, 0.12); border: 1px solid rgba(193, 140, 255, 0.25); border-radius: 999px; padding: 4px 12px; font-size: 11px; font-weight: 700; color: #C18CFF; text-transform: uppercase; letter-spacing: 0.12em;">
                      ${badge}
                    </span>
                  </td>
                </tr>

                <!-- Heading -->
                <tr>
                  <td style="padding-top: 18px;">
                    <h1 style="margin: 0; font-size: 22px; font-weight: 600; line-height: 1.35; color: #F1EDF9; letter-spacing: -0.02em;">
                      ${title}
                    </h1>
                  </td>
                </tr>

                <!-- Body Text -->
                <tr>
                  <td style="padding-top: 12px; font-size: 14px; line-height: 1.65; color: #D0CCE0;">
                    ${body}
                  </td>
                </tr>

                ${showToken ? `
                <!-- Token / Code Box -->
                <tr>
                  <td style="padding-top: 24px;">
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #1C1A2D; border: 1px solid #363056; border-radius: 14px;">
                      <tr>
                        <td align="center" style="padding: 16px 16px;">
                          <div style="font-size: 11px; font-weight: 600; color: #8C87A2; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 6px;">${tokenLabel}</div>
                          <div style="font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, Menlo, monospace; font-size: 30px; font-weight: 700; letter-spacing: 8px; color: #C18CFF;">
                            {{ .Token }}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ` : ''}

                ${buttonText ? `
                <!-- CTA Button -->
                <tr>
                  <td style="padding-top: 20px;">
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <a href="${buttonUrl}" target="_blank" style="display: block; width: 100%; box-sizing: border-box; background-color: #C18CFF; color: #0B0A13; text-align: center; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 24px; border-radius: 12px;">
                            ${buttonText} &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ` : ''}

                <!-- Security Notice -->
                <tr>
                  <td style="padding-top: 28px;">
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border-top: 1px solid #2A2344;">
                      <tr>
                        <td style="padding-top: 16px; font-size: 12px; line-height: 1.6; color: #8C87A2;">
                          ${securityText}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 24px; text-align: center; font-size: 12px; line-height: 1.6; color: #6B6680;">
              &copy; ExamHub &bull; Hệ thống thi & luyện đề trực tuyến<br>
              <span style="font-size: 11px; color: #524E66;">Thư gửi tự động từ hệ thống. Vui lòng không phản hồi thư này.</span>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// 1. Confirm Sign Up
const t1 = getBaseTemplate({
  badge: 'Xác thực tài khoản',
  title: 'Chào mừng bạn đến với ExamHub',
  body: 'Cảm ơn bạn đã tạo tài khoản. Vui lòng bấm vào nút bên dưới để kích hoạt tài khoản và bắt đầu tham gia làm bài thi.',
  showToken: true,
  tokenLabel: 'Mã xác thực OTP',
  buttonText: 'Kích hoạt tài khoản ngay',
  securityText: 'Mã xác thực và liên kết có hiệu lực trong <strong>24 giờ</strong>. Nếu bạn không tạo tài khoản này, bạn có thể an tâm bỏ qua email.',
  preheader: 'Xác nhận tài khoản ExamHub của bạn để bắt đầu làm bài và luyện thi.'
});

// 2. Invite User
const t2 = getBaseTemplate({
  badge: 'Lời mời tham gia',
  title: 'Bạn được mời tham gia ExamHub',
  body: 'Bạn vừa nhận được lời mời tham gia hệ thống học tập & kiểm tra trực tuyến ExamHub. Nhấn nút bên dưới để thiết lập mật khẩu và bắt đầu sử dụng tài khoản:',
  showToken: false,
  buttonText: 'Chấp nhận lời mời & Kích hoạt',
  securityText: 'Lời mời này được gửi dành riêng cho <strong>{{ .Email }}</strong>. Nếu bạn không rõ nguồn gốc lời mời, bạn có thể bỏ qua thư này.',
  preheader: 'Bạn nhận được lời mời tham gia hệ thống ExamHub.'
});

// 3. Magic link or OTP
const t3 = getBaseTemplate({
  badge: 'Đăng nhập nhanh',
  title: 'Mã đăng nhập một lần',
  body: 'Chúng tôi nhận được yêu cầu đăng nhập vào tài khoản của bạn. Sử dụng mã số bên dưới hoặc nhấn nút đăng nhập trực tiếp:',
  showToken: true,
  tokenLabel: 'Mã OTP đăng nhập',
  buttonText: 'Đăng nhập bằng liên kết',
  securityText: 'Mã có hiệu lực trong <strong>10 phút</strong>. Tuyệt đối không chia sẻ mã này với bất kỳ ai để bảo vệ tài khoản.',
  preheader: 'Mã đăng nhập nhanh của bạn tại ExamHub là {{ .Token }}.'
});

// 4. Change Email Address
const t4 = getBaseTemplate({
  badge: 'Thay đổi email',
  title: 'Xác nhận địa chỉ email mới',
  body: 'Bạn vừa gửi yêu cầu đổi địa chỉ email liên kết với tài khoản ExamHub sang <strong>{{ .NewEmail }}</strong>. Vui lòng xác minh bằng mã hoặc nút bên dưới:',
  showToken: true,
  tokenLabel: 'Mã xác thực thay đổi',
  buttonText: 'Xác nhận địa chỉ email mới',
  securityText: 'Nếu bạn không thực hiện yêu cầu này, hãy đăng nhập ngay vào tài khoản ExamHub và đổi mật khẩu để bảo vệ an toàn.',
  preheader: 'Xác nhận thay đổi email tài khoản ExamHub.'
});

// 5. Reset Password
const t5 = getBaseTemplate({
  badge: 'Bảo mật tài khoản',
  title: 'Đặt lại mật khẩu của bạn',
  body: 'Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với <strong>{{ .Email }}</strong>. Nhấn nút bên dưới hoặc nhập mã để tạo mật khẩu mới:',
  showToken: true,
  tokenLabel: 'Mã OTP đặt lại mật khẩu',
  buttonText: 'Đặt lại mật khẩu ngay',
  securityText: 'Liên kết này có hiệu lực trong <strong>15 phút</strong> và chỉ sử dụng được một lần. Nếu bạn không gửi yêu cầu này, tài khoản của bạn vẫn an toàn.',
  preheader: 'Yêu cầu đặt lại mật khẩu cho tài khoản ExamHub của bạn.'
});

// 6. Reauthentication
const t6 = getBaseTemplate({
  badge: 'Xác thực danh tính',
  title: 'Mã xác thực bảo mật',
  body: 'Hệ thống cần xác thực lại danh tính của bạn trước khi thực hiện thao tác quan trọng trên tài khoản <strong>{{ .Email }}</strong>. Nhập mã 6 chữ số dưới đây vào ứng dụng:',
  showToken: true,
  tokenLabel: 'Mã xác thực bảo mật (OTP)',
  buttonText: '',
  securityText: 'Mã có hiệu lực trong <strong>10 phút</strong>. Nếu bạn không đang thực hiện thao tác nào trên hệ thống, vui lòng đổi mật khẩu ngay lập tức.',
  preheader: 'Mã xác thực bảo mật của bạn là {{ .Token }}.'
});

fs.writeFileSync(path.join(dir, '1-confirm-signup.html'), t1, 'utf8');
fs.writeFileSync(path.join(dir, '2-invite-user.html'), t2, 'utf8');
fs.writeFileSync(path.join(dir, '3-magic-link-otp.html'), t3, 'utf8');
fs.writeFileSync(path.join(dir, '4-change-email.html'), t4, 'utf8');
fs.writeFileSync(path.join(dir, '5-reset-password.html'), t5, 'utf8');
fs.writeFileSync(path.join(dir, '6-reauthentication.html'), t6, 'utf8');

console.log('Successfully generated all 6 email templates in supabase/email-templates');
