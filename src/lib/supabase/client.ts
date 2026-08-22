import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Fallback values for build time when env vars are not available
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export type TypedSupabaseClient = SupabaseClient<Database>

let clientInstance: TypedSupabaseClient | null = null

export function createClient(): TypedSupabaseClient {
    // During SSR build, env vars may not be available
    // Return a dummy client that will be replaced on client-side
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        // Return null during build - components should handle this
        if (typeof window === 'undefined') {
            return null as unknown as TypedSupabaseClient
        }
        // On client side, throw error if still missing
        throw new Error('Supabase URL and Anon Key are required')
    }

    if (typeof window === 'undefined') {
        return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
    }

    if (!clientInstance) {
        clientInstance = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
    }

    return clientInstance
}
