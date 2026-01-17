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

        // Get all students (users with role = 'student')
        const { data: profiles, error: profilesError } = await supabaseAdmin
            .from('profiles')
            .select('email')
            .eq('role', 'student')
            .not('email', 'is', null);

        if (profilesError) {
            console.error('Error fetching students:', profilesError);
            return NextResponse.json(
                { error: 'Failed to fetch student emails' },
                { status: 500 }
            );
        }

        // Extract emails, filter out nulls
        const studentEmails = profiles
            ?.map(p => p.email)
            .filter((email): email is string => !!email) || [];

        if (studentEmails.length === 0) {
            return NextResponse.json(
                { message: 'No students found to notify', sent: 0 },
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
