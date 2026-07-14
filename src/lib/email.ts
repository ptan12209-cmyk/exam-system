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
        'StudyHub <onboarding@resend.dev>'
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
    const examLink = examUrl || `${baseUrl}/student/exams/${examId}`;

    try {
        // Send to each student individually (Resend free tier allows batching)
        const { data, error } = await getResend().emails.send({
            from: getFromEmail(),
            to: studentEmails,
            subject: `📝 Đề thi mới: ${examTitle}`,
            html: `
                <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">📝 Đề thi mới</h1>
                    </div>
                    
                    <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0;">
                        <h2 style="color: #1e293b; margin-top: 0;">${examTitle}</h2>
                        
                        <p style="color: #64748b; line-height: 1.6;">
                            Giáo viên <strong>${teacherName}</strong> đã đăng một đề thi mới cho bạn.
                        </p>
                        
                        ${deadline ? `
                            <div style="background: #fef3c7; padding: 12px 16px; border-radius: 8px; margin: 16px 0;">
                                <p style="color: #92400e; margin: 0; font-weight: 500;">
                                    ⏰ Hạn nộp: ${deadline}
                                </p>
                            </div>
                        ` : ''}
                        
                        <a href="${examLink}" 
                           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                  color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none;
                                  font-weight: 600; margin-top: 16px;">
                            Làm bài ngay →
                        </a>
                        
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
                        
                        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                            Email này được gửi tự động từ Hệ thống Thi trắc nghiệm.
                            <br>Nếu bạn không phải học sinh, vui lòng bỏ qua email này.
                        </p>
                    </div>
                </div>
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
    const examLink = `${baseUrl}/student/exams/${examId}`;

    try {
        const { error } = await getResend().emails.send({
            from: getFromEmail(),
            to: studentEmail,
            subject: `⏰ Nhắc nhở: ${examTitle} sắp hết hạn!`,
            html: `
                <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 12px 12px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Nhắc nhở</h1>
                    </div>
                    
                    <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0;">
                        <h2 style="color: #1e293b; margin-top: 0;">${examTitle}</h2>
                        
                        <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0;">
                            <p style="color: #92400e; margin: 0; font-weight: 600; font-size: 16px;">
                                Bài thi sẽ hết hạn vào: ${deadline}
                            </p>
                        </div>
                        
                        <p style="color: #64748b; line-height: 1.6;">
                            Đừng quên hoàn thành bài thi trước thời hạn!
                        </p>
                        
                        <a href="${examLink}" 
                           style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); 
                                  color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none;
                                  font-weight: 600; margin-top: 16px;">
                            Làm bài ngay →
                        </a>
                    </div>
                </div>
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
            subject: `${code} — Mã xác thực StudyHub`,
            html: `
                <div style="font-family: 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
                    <h1 style="font-size: 20px; color: #0f172a; margin: 0 0 12px;">Xác thực email StudyHub</h1>
                    <p style="color: #475569; line-height: 1.6; margin: 0 0 16px;">
                        Xin chào ${name}, mã xác thực 4 số của bạn là:
                    </p>
                    <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 16px;">
                        <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0f172a;">${code}</span>
                    </div>
                    <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin: 0;">
                        Mã có hiệu lực trong <strong>10 phút</strong>. Không chia sẻ mã này với bất kỳ ai.
                    </p>
                    <p style="color: #94a3b8; font-size: 12px; margin: 20px 0 0;">
                        Nếu em không đăng ký StudyHub, hãy bỏ qua email này.
                    </p>
                </div>
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
