import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('sales_agent_referrals')
    .select('*')
    .eq('agent_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, name')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const body = await req.json()

  const { data, error } = await supabase
    .from('sales_agent_referrals')
    .insert({
      org_id: profile.org_id,
      agent_id: user.id,
      customer_name: body.customer_name?.trim() || null,
      customer_phone: body.customer_phone?.trim() || null,
      customer_email: body.customer_email?.trim() || null,
      vehicle_year: body.vehicle_year?.trim() || null,
      vehicle_make: body.vehicle_make?.trim() || null,
      vehicle_model: body.vehicle_model?.trim() || null,
      vehicle_desc: body.vehicle_desc?.trim() || null,
      service_type: body.service_type || 'wrap',
      notes: body.notes?.trim() || null,
      status: 'submitted',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
