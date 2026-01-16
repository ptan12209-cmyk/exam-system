import { createBrowserClient } from '@supabase/ssr'

// Fallback values for build time when env vars are not available
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export function createClient() {
    // During SSR build, env vars may not be available
    // Return a dummy client that will be replaced on client-side
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        // Return null during build - components should handle this
        if (typeof window === 'undefined') {
            return null as unknown as ReturnType<typeof createBrowserClient>
        }
        // On client side, throw error if still missing
        throw new Error('Supabase URL and Anon Key are required')
    }

    return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
