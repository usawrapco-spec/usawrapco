export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import type { Profile } from '@/types'
import VinylAIPage from '@/components/ai/VinylAIPage'

export const metadata = { title: 'V.I.N.Y.L. — Owner Command Center' }

export default async function AIPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, name, email, role, org_id, avatar_url')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (profile.role !== 'owner') redirect('/dashboard')

  return <VinylAIPage profile={profile as unknown as Profile} />
}
