import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getSupabaseAdmin()
    const { data: profile } = await admin
      .from('profiles')
      .select('role, org_id')
      .eq('id', user.id)
      .single()

    if (!profile || !['sales_agent', 'admin', 'owner'].includes(profile.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { lead_id, sequence_id, phone, email } = await req.json()

    if (!sequence_id) {
      return NextResponse.json({ error: 'sequence_id is required' }, { status: 400 })
    }

    // Verify sequence exists
    const { data: sequence } = await admin
      .from('sequences')
      .select('id, name')
      .eq('id', sequence_id)
      .eq('org_id', profile.org_id)
      .single()

    if (!sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 })
    }

    // Create enrollment
    const { data: enrollment, error } = await admin
      .from('sequence_enrollments')
      .insert({
        org_id: profile.org_id,
        sequence_id,
        contact_phone: phone || null,
        contact_email: email || null,
        status: 'active',
        current_step: 0,
        enrolled_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    // If lead_id provided, update lead status
    if (lead_id) {
      await admin
        .from('sales_agent_list_leads')
        .update({ status: 'interested', notes: `Enrolled in sequence: ${sequence.name}` })
        .eq('id', lead_id)
    }

    return NextResponse.json({ enrollment })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
