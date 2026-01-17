import { Resend } from 'resend';

// Initialize Resend with API key from environment
const resend = new Resend(process.env.RESEND_API_KEY);

// Default sender email (must be verified in Resend)
const FROM_EMAIL = 'Exam System <onboarding@resend.dev>'; // Change after verifying domain

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
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
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
        const { error } = await resend.emails.send({
            from: FROM_EMAIL,
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
