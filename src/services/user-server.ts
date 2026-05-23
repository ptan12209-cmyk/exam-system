import { SupabaseClient } from '@supabase/supabase-js'
import { ApiError } from '@/lib/api-utils'

export class UserServerService {
    constructor(private supabase: SupabaseClient) {}

    async getProfile(userId: string): Promise<any> {
        const { data: profile, error } = await this.supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()
        if (error || !profile) throw new ApiError('PROFILE_NOT_FOUND', 'Profile not found', 404)
        return profile
    }

    async updateProfile(userId: string, data: any): Promise<any> {
        const { data: profile, error } = await this.supabase
            .from('profiles')
            .update(data)
            .eq('id', userId)
            .select()
            .single()
        if (error) throw new ApiError('UPDATE_FAILED', error.message, 500)
        return profile
    }
}