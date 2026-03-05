/**
 * POST /api/prospects/from-mockup
 * Public endpoint — creates a prospect record from the customer design studio lead capture.
 */
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

const DEFAULT_ORG = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    mockup_id,
    org_id        = DEFAULT_ORG,
    lead_name,
    lead_email,
    lead_phone,
    notes,
    product_type  = 'wrap',
  } = body

  if (!lead_name || !lead_email) {
    return NextResponse.json({ error: 'lead_name and lead_email required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  // Store lead info on the mockup record
  if (mockup_id) {
    await admin.from('mockup_results').update({
      lead_name,
      lead_email,
      lead_phone: lead_phone || null,
    }).eq('id', mockup_id)
  }

  // Upsert prospect
  const { data: existingProspect } = await admin
    .from('prospects')
    .select('id')
    .eq('org_id', org_id)
    .eq('email', lead_email)
    .maybeSingle()

  const mockupNote = mockup_id
    ? `\n\nDesign Studio mockup: ${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/mockup/status/${mockup_id}`
    : ''
  const fullNotes = [notes, `Product: ${product_type}`, mockupNote].filter(Boolean).join('\n')

  if (existingProspect) {
    await admin.from('prospects').update({
      notes:      fullNotes,
      updated_at: new Date().toISOString(),
    }).eq('id', existingProspect.id)

    return NextResponse.json({ success: true, prospect_id: existingProspect.id })
  }

  const { data: prospect, error } = await admin.from('prospects').insert({
    org_id,
    name:         lead_name,
    email:        lead_email,
    phone:        lead_phone || null,
    notes:        fullNotes,
    source:       'design_studio',
    status:       'new',
  }).select('id').single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, prospect_id: prospect.id })
}
