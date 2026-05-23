import type { SupabaseClient } from '@supabase/supabase-js'
import type { ICache } from './cache'

export interface ServiceContext {
  supabase: SupabaseClient
  cache: ICache
}

export function createServiceContext(
  supabase: SupabaseClient,
  cache: ICache
): ServiceContext {
  return { supabase, cache }
}
