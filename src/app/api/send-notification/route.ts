import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendNewExamNotification } from '@/lib/email';

// Create admin Supabase client for server-side operations
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { examId, examTitle, teacherName, deadline } = body;

        if (!examId || !examTitle) {
            return NextResponse.json(
                { error: 'Missing required fields: examId, examTitle' },
                { status: 400 }
            );
        }

        // Get all student user IDs from profiles
        const { data: profiles, error: profilesError } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('role', 'student');

        if (profilesError) {
            console.error('Error fetching students:', profilesError);
            return NextResponse.json(
                { error: 'Failed to fetch student profiles' },
                { status: 500 }
            );
        }

        if (!profiles || profiles.length === 0) {
            return NextResponse.json(
                { message: 'No students found to notify', sent: 0 },
                { status: 200 }
            );
        }

        // Get emails from auth.users using service role key
        // Note: This requires SUPABASE_SERVICE_ROLE_KEY to access auth.users
        let studentEmails: string[] = [];

        if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
            // With service role, we can access auth.users
            const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

            if (!authError && authUsers?.users) {
                const studentIds = new Set(profiles.map(p => p.id));
                studentEmails = authUsers.users
                    .filter(u => studentIds.has(u.id) && u.email)
                    .map(u => u.email!);
            }
        }

        if (studentEmails.length === 0) {
            console.log('No student emails found or service role key not set');
            return NextResponse.json(
                { message: 'Unable to get student emails. Make sure SUPABASE_SERVICE_ROLE_KEY is set.', sent: 0 },
                { status: 200 }
            );
        }

        // Send notifications
        const result = await sendNewExamNotification({
            studentEmails,
            examTitle,
            examId,
            teacherName,
            deadline,
        });

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Failed to send email' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `Notifications sent to ${studentEmails.length} students`,
            sent: studentEmails.length
        });

    } catch (error) {
        console.error('Send notification error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
