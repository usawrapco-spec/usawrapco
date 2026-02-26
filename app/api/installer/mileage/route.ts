import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'
const IRS_MILEAGE_RATE = 0.67 // 2024 IRS standard mileage rate per mile

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get('project_id')
  const admin = getSupabaseAdmin()

  let query = admin.from('installer_mileage_log').select('*').eq('installer_id', user.id).order('created_at', { ascending: false })
  if (projectId) query = query.eq('project_id', projectId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.project_id || !body.miles) {
    return NextResponse.json({ error: 'project_id and miles required' }, { status: 400 })
  }

  const miles = parseFloat(body.miles)
  const reimbursementAmount = miles * IRS_MILEAGE_RATE

  const admin = getSupabaseAdmin()
  const { data, error } = await admin.from('installer_mileage_log').insert({
    org_id: ORG_ID,
    project_id: body.project_id,
    installer_id: user.id,
    from_address: body.from_address || null,
    to_address: body.to_address || null,
    miles,
    tracking_method: body.tracking_method || 'manual',
    trip_date: body.trip_date || new Date().toISOString().split('T')[0],
    notes: body.notes || null,
    reimbursement_amount: reimbursementAmount,
    reimbursement_status: 'pending',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ...data, reimbursement_rate: IRS_MILEAGE_RATE })
}
