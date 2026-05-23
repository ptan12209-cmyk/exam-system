import { createClient } from "../supabase/client"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { ServiceContext } from "../service-context"
import type { ICache } from "../cache"

/**
 * Resolve a ServiceContext | SupabaseClient | undefined into
 * { supabase, cache }. Falls back to browser client when neither is provided.
 */
export function resolveContext(
    ctx?: ServiceContext | SupabaseClient
): { supabase: SupabaseClient; cache: ICache | null } {
    if (!ctx) {
        const client = createClient()
        return { supabase: client, cache: null }
    }
    // ServiceContext has both `supabase` and `cache` properties
    if ('cache' in ctx && 'supabase' in ctx) {
        return ctx as ServiceContext
    }
    // Raw SupabaseClient (backward compat)
    return { supabase: ctx as SupabaseClient, cache: null }
}
