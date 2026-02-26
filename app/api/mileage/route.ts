import { ORG_ID } from '@/lib/org'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const params = req.nextUrl.searchParams
  const isAdmin = profile.role === 'owner' || profile.role === 'admin'
  const orgId = profile.org_id || ORG_ID

  let query = admin
    .from('mileage_logs')
    .select('*, user:user_id(id,name,avatar_url), job:job_id(id,title), approver:approved_by(id,name)')
    .eq('org_id', orgId)
    .order('date', { ascending: false })

  if (!isAdmin) query = query.eq('user_id', user.id)

  const status = params.get('status')
  if (status) query = query.eq('status', status)

  const userId = params.get('user_id')
  if (userId && isAdmin) query = query.eq('user_id', userId)

  const from = params.get('from')
  const to = params.get('to')
  if (from) query = query.gte('date', from)
  if (to) query = query.lte('date', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ logs: data })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const orgId = profile.org_id || ORG_ID

  // Get mileage rate from employee pay settings
  const { data: paySettings } = await admin
    .from('employee_pay_settings')
    .select('mileage_rate, uses_company_vehicle')
    .eq('user_id', user.id)
    .single()

  const vehicleType = paySettings?.uses_company_vehicle ? 'company' : (body.vehicle_type || 'personal')
  const ratePerMile = vehicleType === 'company' ? 0 : (paySettings?.mileage_rate ?? 0.67)

  const { data, error } = await admin.from('mileage_logs').insert({
    org_id: orgId,
    user_id: user.id,
    job_id: body.job_id || null,
    date: body.date || new Date().toISOString().split('T')[0],
    entry_type: body.entry_type || 'manual',
    from_address: body.from_address || null,
    to_address: body.to_address || null,
    miles: parseFloat(body.miles) || 0,
    rate_per_mile: ratePerMile,
    purpose: body.purpose || null,
    vehicle_type: vehicleType,
    company_vehicle_id: body.company_vehicle_id || null,
    odometer_start: body.odometer_start || null,
    odometer_end: body.odometer_end || null,
    odometer_start_photo_url: body.odometer_start_photo_url || null,
    odometer_end_photo_url: body.odometer_end_photo_url || null,
    route_data: body.route_data || [],
    notes: body.notes || null,
    status: ratePerMile === 0 ? 'approved' : 'pending', // Company vehicle auto-approves at $0
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ log: data }, { status: 201 })
}
