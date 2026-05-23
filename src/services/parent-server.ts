import { SupabaseClient } from '@supabase/supabase-js';
import { ApiError } from '@/lib/api-utils';

/**
 * Represents a child linked to a parent account.
 */
export interface ParentChild {
  studentId: string;
  studentName: string;
  studentEmail: string;
  linkedAt: string;
}

/**
 * Aggregated exam progress statistics for a child.
 */
export interface ChildProgress {
  examsTaken: number;
  avgScore: number;
  lastExamDate: string | null;
  weakSubjects: string[];
}

/**
 * Server-side service for parent-child relationships and child progress tracking.
 *
 * Uses Supabase to query parent_student_links, profiles, submissions, and exams tables.
 */
export class ParentServerService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Retrieves all children linked to the specified parent user.
   *
   * @param userId - The parent's user ID.
   * @returns Array of children with basic profile info and link date.
   * @throws {ApiError} If the database query fails.
   */
  async getChildren(userId: string): Promise<ParentChild[]> {
    const { data, error } = await this.supabase
      .from('parent_student_links')
      .select(`
        student_id,
        profiles!inner ( full_name, email ),
        created_at
      `)
      .eq('parent_id', userId);

    if (error) {
      console.error('Error fetching parent children:', error);
      throw new ApiError('FETCH_CHILDREN_FAILED', 'Failed to fetch children', 500);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((row: any) => ({
      studentId: row.student_id,
      studentName: row.profiles?.full_name ?? 'Unknown',
      studentEmail: row.profiles?.email ?? '',
      linkedAt: row.created_at,
    }));
  }

  /**
   * Computes exam progress statistics for a specific child.
   *
   * Examines all submissions for the student, calculates average score,
   * total distinct exams taken, last exam date, and identifies weak
   * subjects (subjects with an average score below 50%).
   *
   * @param _userId - The parent's user ID (unused, retained for future access control).
   * @param studentId - The child's user ID.
   * @returns Aggregated progress metrics.
   * @throws {ApiError} If any database query fails.
   */
  async getChildProgress(
    _userId: string,
    studentId: string
  ): Promise<ChildProgress> {
    // Fetch all submissions for this student
    const { data: submissions, error: subError } = await this.supabase
      .from('submissions')
      .select('exam_id, score, total_marks, created_at')
      .eq('student_id', studentId);

    if (subError) {
      console.error('Error fetching submissions for child progress:', subError);
      throw new ApiError('FETCH_SUBMISSIONS_FAILED', 'Failed to fetch submissions', 500);
    }

    if (!submissions || submissions.length === 0) {
      return {
        examsTaken: 0,
        avgScore: 0,
        lastExamDate: null,
        weakSubjects: [],
      };
    }

    // Distinct exams taken
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const distinctExamIds = new Set(submissions.map((s: any) => s.exam_id));
    const examsTaken = distinctExamIds.size;

    // Average overall score (percentage)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalPercent = submissions.reduce((sum: number, s: any) => {
      const score = Number(s.score) || 0;
      const total = Number(s.total_marks) || 1;
      return sum + (score / total) * 100;
    }, 0);
    const avgScore = Math.round(totalPercent / submissions.length);

    // Last exam date
    const dates = submissions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((s: any) => (s.created_at ? new Date(s.created_at).toISOString() : null))
      .filter(Boolean) as string[];
    const lastExamDate = dates.length > 0 ? dates.sort().reverse()[0] : null;

    // Weak subjects: subject-level average below 50%
    // Get exam subjects from exams table
    const examIds = Array.from(distinctExamIds);
    const { data: exams, error: examError } = await this.supabase
      .from('exams')
      .select('id, subject')
      .in('id', examIds);

    if (examError) {
      console.error('Error fetching exams for weak subject analysis:', examError);
      throw new ApiError('FETCH_EXAMS_FAILED', 'Failed to fetch exams', 500);
    }

    const examSubjectMap = new Map<string, string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (exams || []).forEach((e: any) => examSubjectMap.set(e.id, e.subject || 'Unknown'));

    // Aggregate scores per subject
    const subjectScores: Record<string, { total: number; count: number }> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    submissions.forEach((s: any) => {
      const subject = examSubjectMap.get(s.exam_id) || 'Unknown';
      if (!subjectScores[subject]) subjectScores[subject] = { total: 0, count: 0 };
      const score = Number(s.score) || 0;
      const total = Number(s.total_marks) || 1;
      subjectScores[subject].total += (score / total) * 100;
      subjectScores[subject].count += 1;
    });

    const weakSubjects: string[] = [];
    for (const [subject, stats] of Object.entries(subjectScores)) {
      const avg = stats.total / stats.count;
      if (avg < 50) {
        weakSubjects.push(subject);
      }
    }

    return { examsTaken, avgScore, lastExamDate, weakSubjects };
  }
}
