import { ORG_ID } from '@/lib/org'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'owner' && profile.role !== 'admin'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const orgId = profile.org_id || ORG_ID
  const { data: setting } = await admin.from('app_settings').select('value').eq('org_id', orgId).eq('key', 'quickbooks_tokens').single()

  if (!setting?.value) return NextResponse.json({ connected: false })

  let tokenData: any = null
  try { tokenData = JSON.parse(setting.value) } catch { return NextResponse.json({ connected: false }) }

  const isExpired = tokenData.expires_at && new Date(tokenData.expires_at) < new Date()
  return NextResponse.json({
    connected: true,
    realm_id: tokenData.realm_id,
    connected_at: tokenData.connected_at,
    is_expired: isExpired,
  })
}

export async function DELETE() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'owner' && profile.role !== 'admin'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const orgId = profile.org_id || ORG_ID
  await admin.from('app_settings').delete().eq('org_id', orgId).eq('key', 'quickbooks_tokens')
  return NextResponse.json({ disconnected: true })
}
