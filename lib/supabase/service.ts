/**
 * lib/supabase/service.ts
 * Supabase admin client using the service role key.
 * USE ONLY in server-side API routes — NEVER in client components.
 * Lazy-initialized so the build doesn't fail when env vars are absent.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Typed as any so all .from() calls return data: any rather than data: never
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _admin: SupabaseClient<any, any, any> | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabaseAdmin(): SupabaseClient<any, any, any> {
  if (!_admin) {
    _admin = createClient<any, any, any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  }
  return _admin
}
