/**
 * lib/supabase/service.ts
 * Supabase admin client using the service role key.
 * USE ONLY in server-side API routes — NEVER in client components.
 * Lazy-initialized so the build doesn't fail when env vars are absent.
 */
import { createClient } from '@supabase/supabase-js'

let _admin: ReturnType<typeof createClient> | null = null

export function getSupabaseAdmin() {
  if (!_admin) {
    _admin = createClient(
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
