import { SupabaseClient } from '@supabase/supabase-js';
import { ApiError } from '@/lib/api-utils';
import { sendNewExamNotification } from '@/lib/email';

export interface SendNotificationParams {
  examId: string;
  examTitle: string;
  teacherName?: string;
  deadline?: string;
}

export interface SendNotificationResult {
  success: boolean;
  sent: number;
  message: string;
}

export class NotificationServerService {
  constructor(
    private supabase: SupabaseClient,
    private supabaseAdmin: SupabaseClient
  ) {}

  async sendNotification(params: SendNotificationParams): Promise<SendNotificationResult> {
    const { examId, examTitle, teacherName, deadline } = params;

    // Fetch all student profiles
    const { data: profiles, error: profilesError } = await this.supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('role', 'student');

    if (profilesError) {
      console.error('Error fetching students:', profilesError);
      throw new ApiError('FETCH_STUDENTS_FAILED', 'Failed to fetch student profiles', 500);
    }

    if (!profiles || profiles.length === 0) {
      return { success: true, sent: 0, message: 'No students found to notify' };
    }

    // Get emails from auth.users via admin API
    let studentEmails: string[] = [];

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { data: authUsers, error: authError } = await this.supabaseAdmin.auth.admin.listUsers();

      if (!authError && authUsers?.users) {
        const studentIds = new Set(profiles.map((p) => p.id));
        const users: { id: string; email?: string | null }[] = authUsers.users;
        studentEmails = users.filter((u) => studentIds.has(u.id) && u.email).map((u) => u.email!);
      }
    }

    if (studentEmails.length === 0) {
      console.debug('No student emails found or service role key not set');
      return {
        success: true,
        sent: 0,
        message: 'Unable to get student emails. Make sure SUPABASE_SERVICE_ROLE_KEY is set.',
      };
    }

    // Send email notifications
    const result = await sendNewExamNotification({
      studentEmails,
      examTitle,
      examId,
      teacherName: teacherName || 'Teacher',
      deadline,
    });

    if (!result.success) {
      throw new ApiError('EMAIL_SEND_FAILED', result.error || 'Failed to send email', 500);
    }

    return {
      success: true,
      sent: studentEmails.length,
      message: `Notifications sent to ${studentEmails.length} students`,
    };
  }
}
