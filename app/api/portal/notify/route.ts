import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'

// POST /api/portal/notify
// Body: { customer_id, project_id?, type, title, body?, action_url? }
// Requires authenticated internal user (sales/admin/owner)
export async function POST(request: Request) {
  const supabaseUser = createClient()
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { customer_id, project_id, type, title, body: notifBody, action_url } = body

  if (!customer_id || !type || !title) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  // Get org_id from customer
  const { data: customer } = await supabase
    .from('customers')
    .select('org_id')
    .eq('id', customer_id)
    .single()

  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  const { error } = await supabase.from('portal_notifications').insert({
    org_id: customer.org_id,
    customer_id,
    project_id: project_id || null,
    type,
    title,
    body: notifBody || null,
    action_url: action_url || null,
    read: false,
  })

  if (error) {
    console.error('[portal/notify] insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
