import { SupabaseClient } from '@supabase/supabase-js'
import { ApiError } from '@/lib/api-utils'

export class ExamServerService {
    constructor(private supabase: SupabaseClient) {}

    async createExam(data: any): Promise<any> {
        const { data: exam, error } = await this.supabase
            .from('exams')
            .insert(data)
            .select()
            .single()
        if (error) throw new ApiError('CREATE_FAILED', error.message, 500)
        return exam
    }

    async getExam(id: string): Promise<any> {
        const { data: exam, error } = await this.supabase
            .from('exams')
            .select('*')
            .eq('id', id)
            .single()
        if (error || !exam) throw new ApiError('EXAM_NOT_FOUND', 'Exam not found', 404)
        return exam
    }

    async listExams(filters?: { teacher_id?: string; status?: string }): Promise<any[]> {
        let query = this.supabase.from('exams').select('*')
        if (filters?.teacher_id) query = query.eq('teacher_id', filters.teacher_id)
        if (filters?.status) query = query.eq('status', filters.status)
        const { data, error } = await query
        if (error) throw new ApiError('LIST_FAILED', error.message, 500)
        return data || []
    }

    async updateExam(id: string, data: any): Promise<any> {
        const { data: exam, error } = await this.supabase
            .from('exams')
            .update(data)
            .eq('id', id)
            .select()
            .single()
        if (error) throw new ApiError('UPDATE_FAILED', error.message, 500)
        return exam
    }

    async deleteExam(id: string): Promise<void> {
        const { error } = await this.supabase
            .from('exams')
            .delete()
            .eq('id', id)
        if (error) throw new ApiError('DELETE_FAILED', error.message, 500)
    }

    async getLeaderboardData(examId: string): Promise<any[]> {
        const { data: submissions, error } = await this.supabase
            .from('submissions')
            .select(`
                student_id,
                score,
                time_spent,
                submitted_at,
                profiles!submissions_student_id_fkey (
                    full_name,
                    avatar_url
                )
            `)
            .eq('exam_id', examId)
            .eq('is_ranked', true)
            .order('score', { ascending: false })
            .order('time_spent', { ascending: true })
            .limit(100)
        if (error) {
            console.error('Leaderboard fetch error:', error)
            throw new ApiError('LEADERBOARD_FETCH_FAILED', 'Failed to fetch leaderboard', 500)
        }
        return submissions || []
    }

    async getExportData(examId: string): Promise<any[]> {
        const { data: submissions, error } = await this.supabase
            .from('submissions')
            .select(`
                id,
                student_id,
                score,
                correct_count,
                mc_correct,
                tf_correct,
                sa_correct,
                time_spent,
                submitted_at,
                attempt_number,
                is_ranked,
                cheat_flags,
                profiles!submissions_student_id_fkey (
                    full_name,
                    class
                )
            `)
            .eq('exam_id', examId)
            .order('score', { ascending: false })
        if (error) {
            console.error('Export fetch error:', error)
            throw new ApiError('EXPORT_FETCH_FAILED', 'Failed to fetch export data', 500)
        }
        return submissions || []
    }
}