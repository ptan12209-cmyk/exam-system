import { Resend } from 'resend';

// Lazy initializer for Resend to prevent compile-time or static build errors
let resendInstance: Resend | null = null;
function getResend(): Resend {
    if (!resendInstance) {
        resendInstance = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key_to_prevent_build_errors');
    }
    return resendInstance;
}

// Default sender email (must be verified in Resend)
function getFromEmail(): string {
    return (
        process.env.RESEND_FROM_EMAIL ||
        'ExamHub <onboarding@resend.dev>'
    );
}

export interface SendExamNotificationParams {
    studentEmails: string[];
    examTitle: string;
    examId: string;
    teacherName: string;
    deadline?: string;
    examUrl?: string;
}

export async function sendNewExamNotification({
    studentEmails,
    examTitle,
    examId,
    teacherName,
    deadline,
    examUrl
}: SendExamNotificationParams): Promise<{ success: boolean; error?: string }> {
    if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY not configured, skipping email');
        return { success: false, error: 'Email service not configured' };
    }

    if (studentEmails.length === 0) {
        return { success: false, error: 'No student emails provided' };
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app';
    const examLink = examUrl || `${baseUrl}/student/exams/${examId}/take`;

    try {
        const { data, error } = await getResend().emails.send({
            from: getFromEmail(),
            to: studentEmails,
            subject: `📝 Bài thi mới: ${examTitle}`,
            html: `
<!DOCTYPE html>
<html lang="vi" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Đề thi mới từ ExamHub</title>
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
    Giáo viên ${teacherName} vừa giao cho bạn bài thi mới: ${examTitle}.
  </div>

  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #0B0A13; width: 100%;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
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
                      Bài thi mới
                    </span>
                  </td>
                </tr>

                <!-- Heading -->
                <tr>
                  <td style="padding-top: 18px;">
                    <h1 style="margin: 0; font-size: 22px; font-weight: 600; line-height: 1.35; color: #F1EDF9; letter-spacing: -0.02em;">
                      ${examTitle}
                    </h1>
                  </td>
                </tr>

                <!-- Body Text -->
                <tr>
                  <td style="padding-top: 12px; font-size: 14px; line-height: 1.65; color: #D0CCE0;">
                    Giáo viên <strong>${teacherName}</strong> vừa giao bài thi mới cho bạn trên ExamHub. Vui lòng sắp xếp thời gian làm bài để nộp đúng hạn.
                  </td>
                </tr>

                <!-- Meta Details Box -->
                <tr>
                  <td style="padding-top: 20px;">
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #1C1A2D; border: 1px solid #363056; border-radius: 14px; padding: 16px;">
                      <tr>
                        <td style="padding: 4px 0; font-size: 13px; color: #8C87A2;">
                          Giáo viên giao:
                        </td>
                        <td align="right" style="padding: 4px 0; font-size: 13px; font-weight: 600; color: #F1EDF9;">
                          ${teacherName}
                        </td>
                      </tr>
                      ${deadline ? `
                      <tr>
                        <td style="padding: 6px 0 0; font-size: 13px; color: #8C87A2;">
                          Hạn chót nộp bài:
                        </td>
                        <td align="right" style="padding: 6px 0 0; font-size: 13px; font-weight: 600; color: #C18CFF;">
                          ${deadline}
                        </td>
                      </tr>
                      ` : `
                      <tr>
                        <td style="padding: 6px 0 0; font-size: 13px; color: #8C87A2;">
                          Thời hạn:
                        </td>
                        <td align="right" style="padding: 6px 0 0; font-size: 13px; font-weight: 600; color: #34D399;">
                          Tự do thời gian
                        </td>
                      </tr>
                      `}
                    </table>
                  </td>
                </tr>

                <!-- CTA Button -->
                <tr>
                  <td style="padding-top: 24px;">
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <a href="${examLink}" target="_blank" style="display: block; width: 100%; box-sizing: border-box; background-color: #C18CFF; color: #0B0A13; text-align: center; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 24px; border-radius: 12px;">
                            Bắt đầu làm bài thi &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Security Notice -->
                <tr>
                  <td style="padding-top: 28px;">
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border-top: 1px solid #2A2344;">
                      <tr>
                        <td style="padding-top: 16px; font-size: 12px; line-height: 1.6; color: #8C87A2;">
                          Hãy chuẩn bị không gian yên tĩnh và đường truyền internet ổn định trước khi bấm làm bài. Nếu bạn không tham gia khóa học này, vui lòng bỏ qua email.
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
</html>
            `
        });

        if (error) {
            console.error('Resend error:', error);
            return { success: false, error: error.message };
        }

        console.log('Email sent successfully:', data);
        return { success: true };
    } catch (err) {
        console.error('Email send failed:', err);
        return { success: false, error: (err as Error).message };
    }
}

// Send reminder email for upcoming deadline
export async function sendDeadlineReminder({
    studentEmail,
    examTitle,
    examId,
    deadline
}: {
    studentEmail: string;
    examTitle: string;
    examId: string;
    deadline: string;
}): Promise<{ success: boolean; error?: string }> {
    if (!process.env.RESEND_API_KEY) {
        return { success: false, error: 'Email service not configured' };
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app';
    const examLink = `${baseUrl}/student/exams/${examId}/take`;

    try {
        const { error } = await getResend().emails.send({
            from: getFromEmail(),
            to: studentEmail,
            subject: `⏰ Nhắc nhở hạn nộp: ${examTitle}`,
            html: `
<!DOCTYPE html>
<html lang="vi" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Nhắc nhở hạn nộp bài thi</title>
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
    Bài thi ${examTitle} sắp đến hạn nộp (${deadline}).
  </div>

  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #0B0A13; width: 100%;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
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
                    <span style="display: inline-block; background-color: rgba(251, 146, 60, 0.12); border: 1px solid rgba(251, 146, 60, 0.25); border-radius: 999px; padding: 4px 12px; font-size: 11px; font-weight: 700; color: #FB923C; text-transform: uppercase; letter-spacing: 0.12em;">
                      Sắp hết hạn
                    </span>
                  </td>
                </tr>

                <!-- Heading -->
                <tr>
                  <td style="padding-top: 18px;">
                    <h1 style="margin: 0; font-size: 22px; font-weight: 600; line-height: 1.35; color: #F1EDF9; letter-spacing: -0.02em;">
                      ${examTitle}
                    </h1>
                  </td>
                </tr>

                <!-- Body Text -->
                <tr>
                  <td style="padding-top: 12px; font-size: 14px; line-height: 1.65; color: #D0CCE0;">
                    Bài thi của bạn sắp đến hạn kết thúc. Hãy vào làm và hoàn tất bài nộp trước khi hệ thống đóng cổng.
                  </td>
                </tr>

                <!-- Deadline Box -->
                <tr>
                  <td style="padding-top: 20px;">
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #1C1A2D; border: 1px solid #363056; border-radius: 14px; padding: 16px;">
                      <tr>
                        <td align="center">
                          <div style="font-size: 11px; font-weight: 600; color: #8C87A2; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 6px;">Hạn chót làm bài</div>
                          <div style="font-size: 18px; font-weight: 700; color: #FB923C;">
                            ${deadline}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- CTA Button -->
                <tr>
                  <td style="padding-top: 24px;">
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <a href="${examLink}" target="_blank" style="display: block; width: 100%; box-sizing: border-box; background-color: #C18CFF; color: #0B0A13; text-align: center; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 24px; border-radius: 12px;">
                            Vào làm bài ngay &rarr;
                          </a>
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
</html>
            `
        });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        return { success: false, error: (err as Error).message };
    }
}

export async function sendOtpEmail({
    to,
    code,
    fullName,
}: {
    to: string;
    code: string;
    fullName?: string;
}): Promise<{ success: boolean; error?: string }> {
    if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY not configured, skipping OTP email');
        return { success: false, error: 'Email service not configured' };
    }

    const name = fullName?.trim() || 'bạn';

    try {
        const { error } = await getResend().emails.send({
            from: getFromEmail(),
            to,
            subject: `${code} — Mã xác thực ExamHub`,
            html: `
<!DOCTYPE html>
<html lang="vi" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mã xác thực ExamHub</title>
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
    Mã xác thực của bạn là ${code}.
  </div>

  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #0B0A13; width: 100%;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
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
                      Xác thực OTP
                    </span>
                  </td>
                </tr>

                <!-- Heading -->
                <tr>
                  <td style="padding-top: 18px;">
                    <h1 style="margin: 0; font-size: 22px; font-weight: 600; line-height: 1.35; color: #F1EDF9; letter-spacing: -0.02em;">
                      Xác thực tài khoản của bạn
                    </h1>
                  </td>
                </tr>

                <!-- Body Text -->
                <tr>
                  <td style="padding-top: 12px; font-size: 14px; line-height: 1.65; color: #D0CCE0;">
                    Xin chào <strong>${name}</strong>, đây là mã xác thực 4 số để hoàn tất thao tác trên ExamHub:
                  </td>
                </tr>

                <!-- Token / Code Box -->
                <tr>
                  <td style="padding-top: 24px;">
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #1C1A2D; border: 1px solid #363056; border-radius: 14px;">
                      <tr>
                        <td align="center" style="padding: 18px 16px;">
                          <div style="font-size: 11px; font-weight: 600; color: #8C87A2; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 6px;">Mã xác thực bảo mật</div>
                          <div style="font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, Menlo, monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #C18CFF;">
                            ${code}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Security Notice -->
                <tr>
                  <td style="padding-top: 28px;">
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border-top: 1px solid #2A2344;">
                      <tr>
                        <td style="padding-top: 16px; font-size: 12px; line-height: 1.6; color: #8C87A2;">
                          Mã có hiệu lực trong <strong>10 phút</strong>. Tuyệt đối không chia sẻ mã này với bất kỳ ai. Nếu bạn không gửi yêu cầu, vui lòng bỏ qua thư này.
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
</html>
            `,
        });

        if (error) {
            console.error('Resend OTP error:', error);
            return { success: false, error: error.message };
        }
        return { success: true };
    } catch (err) {
        return { success: false, error: (err as Error).message };
    }
}
