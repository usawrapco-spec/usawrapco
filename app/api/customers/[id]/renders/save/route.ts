import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { logMockupActivity } from '@/lib/mockup/logActivity'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id').eq('id', user.id).single()
  const orgId = profile?.org_id
  if (!orgId) return NextResponse.json({ error: 'No org' }, { status: 403 })

  const customerId = params.id
  const { mockup_result_id, image_url, label, metadata } = await req.json()

  if (!image_url) return NextResponse.json({ error: 'image_url required' }, { status: 400 })

  const { data, error } = await admin.from('customer_saved_renders').upsert({
    org_id: orgId,
    customer_id: customerId,
    mockup_result_id: mockup_result_id || null,
    image_url,
    label: label || null,
    metadata: metadata || {},
  }, { onConflict: 'customer_id,image_url' }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logMockupActivity({
    org_id: orgId,
    customer_id: customerId,
    mockup_id: mockup_result_id || '',
    action: 'render_saved',
    details: `Render saved: ${label || 'Untitled'}`,
    actor_type: 'user',
    actor_id: user.id,
  })

  return NextResponse.json({ saved: data })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const customerId = params.id
  const { id: renderId } = await req.json()

  if (!renderId) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await admin
    .from('customer_saved_renders')
    .delete()
    .eq('id', renderId)
    .eq('customer_id', customerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
