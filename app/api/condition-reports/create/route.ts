import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { project_id, vehicle_year, vehicle_make, vehicle_model, vehicle_color, vin, customer_name, customer_email, customer_phone } = body

    if (!project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

    const admin = getSupabaseAdmin()

    const { data: profile } = await admin
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    const { data: report, error } = await admin
      .from('condition_reports')
      .insert({
        org_id: profile?.org_id || 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
        project_id,
        installer_id: user.id,
        vehicle_year, vehicle_make, vehicle_model, vehicle_color, vin,
        customer_name, customer_email, customer_phone,
        status: 'draft',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ report })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
