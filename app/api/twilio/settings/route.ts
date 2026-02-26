import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { ORG_ID } from '@/lib/org'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  const orgId = profile?.org_id || ORG_ID

  const { data: setting } = await admin
    .from('app_settings')
    .select('value')
    .eq('org_id', orgId)
    .eq('key', 'ai_sms_enabled')
    .maybeSingle()

  return NextResponse.json({
    ai_sms_enabled: setting ? setting.value === 'true' : true,
    twilio_number: process.env.TWILIO_PHONE_NUMBER || null,
  })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = profile.org_id || ORG_ID
  const body = await req.json()
  const { ai_sms_enabled } = body

  await admin
    .from('app_settings')
    .upsert(
      { org_id: orgId, key: 'ai_sms_enabled', value: String(ai_sms_enabled) },
      { onConflict: 'org_id,key' }
    )

  return NextResponse.json({ success: true })
}
