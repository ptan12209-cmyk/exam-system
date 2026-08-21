import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendNewExamNotification } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
        }

        // 🔒 Rate limit mass-notification sends
        const { allowed } = await checkRateLimit(`notify:${user.id}`, 5, 300);
        if (!allowed) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        // Verify user is teacher or admin
        const { data: teacherProfile } = await supabase
            .from('profiles')
            .select('role, full_name')
            .eq('id', user.id)
            .single();

        if (!teacherProfile || !['teacher', 'admin'].includes(teacherProfile.role)) {
            return NextResponse.json({ error: 'Không có quyền thực hiện thao tác này' }, { status: 403 });
        }

        const body = await request.json();
        const { examId, examTitle, teacherName, deadline, targetClasses, targetGrade, assignedTo } = body;

        if (!examId || !examTitle) {
            return NextResponse.json(
                { error: 'Thiếu thông tin bắt buộc: examId, examTitle' },
                { status: 400 }
            );
        }

        // Verify the caller owns the exam before emailing anyone about it
        const { data: ownedExam } = await supabase
            .from('exams')
            .select('id')
            .eq('id', examId)
            .eq('teacher_id', user.id)
            .single();

        if (!ownedExam) {
            return NextResponse.json({ error: 'Không tìm thấy đề thi thuộc quyền của bạn' }, { status: 403 });
        }

        let adminClient;
        try {
            adminClient = createAdminClient();
        } catch {
            adminClient = supabase;
        }

        // 1. Fetch student profiles matching target criteria
        let query = adminClient
            .from('profiles')
            .select('id, full_name, email, class, grade')
            .eq('role', 'student');

        if (assignedTo && Array.isArray(assignedTo) && assignedTo.length > 0) {
            query = query.in('id', assignedTo);
        } else {
            if (targetClasses && Array.isArray(targetClasses) && targetClasses.length > 0) {
                query = query.in('class', targetClasses);
            }
            if (targetGrade && typeof targetGrade === 'number') {
                query = query.eq('grade', targetGrade);
            }
        }

        const { data: profiles, error: profilesError } = await query;

        if (profilesError) {
            console.error('Error fetching students:', profilesError);
            return NextResponse.json(
                { error: 'Lỗi khi tải danh sách học sinh: ' + profilesError.message },
                { status: 500 }
            );
        }

        if (!profiles || profiles.length === 0) {
            return NextResponse.json(
                { success: true, message: 'Không tìm thấy học sinh phù hợp để gửi thông báo', sent: 0, inAppSent: 0 },
                { status: 200 }
            );
        }

        const studentIds = profiles.map(p => p.id);
        const senderName = teacherName || teacherProfile.full_name || 'Giáo viên';

        // 2. Insert in-app notifications
        const notificationRecords = studentIds.map(studentId => ({
            user_id: studentId,
            title: `Đề thi mới: ${examTitle.trim()}`,
            message: `${senderName} vừa giao bài thi mới cho bạn`,
            type: 'exam',
            link: `/student/exams/${examId}/take`,
            is_read: false,
        }));

        const { error: notifError } = await adminClient
            .from('notifications')
            .insert(notificationRecords);

        if (notifError) {
            console.warn('Error inserting in-app notifications:', notifError);
        }

        // 3. Collect student email addresses
        let studentEmails: string[] = profiles
            .map(p => p.email)
            .filter((e): e is string => Boolean(e && e.includes('@')));

        // If some profiles don't have email in profiles table, lookup from auth.admin
        if (studentEmails.length < studentIds.length && process.env.SUPABASE_SERVICE_ROLE_KEY) {
            try {
                const { data: authUsers } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
                if (authUsers?.users) {
                    const idSet = new Set(studentIds);
                    const authEmails = authUsers.users
                        .filter(u => idSet.has(u.id) && u.email)
                        .map(u => u.email!);

                    studentEmails = Array.from(new Set([...studentEmails, ...authEmails]));
                }
            } catch (err) {
                console.warn('Could not list auth users for email lookup:', err);
            }
        }

        let emailResult = { success: true };
        if (studentEmails.length > 0) {
            const res = await sendNewExamNotification({
                studentEmails,
                examTitle,
                examId,
                teacherName: senderName,
                deadline,
            });
            emailResult = res;
        }

        return NextResponse.json({
            success: true,
            message: `Đã gửi thông báo đến ${studentIds.length} học sinh (gửi email đến ${studentEmails.length} học sinh)`,
            sent: studentEmails.length,
            inAppSent: studentIds.length,
            emailStatus: emailResult
        });

    } catch (error) {
        console.error('Send notification error:', error);
        return NextResponse.json(
            { error: 'Lỗi máy chủ nội bộ: ' + (error as Error).message },
            { status: 500 }
        );
    }
}
