/**
 * lib/auth/roleGuard.ts
 * Server-side helper: enforces admin/owner-only access.
 * Usage in server components:
 *   const { profile } = await requireAdminRole()
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import type { Profile } from '@/types'

export async function requireAdminRole(): Promise<{ profile: Profile }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (profile.role !== 'owner' && profile.role !== 'admin') redirect('/dashboard')

  return { profile: profile as Profile }
}

export function isAdminOrOwner(role: string): boolean {
  return role === 'admin' || role === 'owner'
}
