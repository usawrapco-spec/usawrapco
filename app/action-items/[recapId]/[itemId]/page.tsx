import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { ORG_ID } from '@/lib/org'
import ActionItemDetailClient from '@/components/action-items/ActionItemDetailClient'

export default async function ActionItemDetailPage({
  params,
}: {
  params: { recapId: string; itemId: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('role, org_id, name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'owner') redirect('/dashboard')

  return (
    <ActionItemDetailClient
      recapId={params.recapId}
      itemId={params.itemId}
      ownerName={profile.name || 'Owner'}
    />
  )
}
