/**
 * POST /api/leads/submit
 * Public endpoint — captures a lead from the website quote/contact form.
 * Saves to the prospects table with source = 'website_form'.
 */
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

const DEFAULT_ORG = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    name,
    email,
    phone,
    company,
    message,
    vehicle_type,
    file_url,
    mockup_id,
    source = 'website_form',
  } = body

  if (!name || !email) {
    return NextResponse.json({ error: 'name and email are required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  // Build notes
  const parts: string[] = []
  if (company)      parts.push(`Company: ${company}`)
  if (vehicle_type) parts.push(`Vehicle: ${vehicle_type}`)
  if (message)      parts.push(`Message: ${message}`)
  if (file_url)     parts.push(`Attachment: ${file_url}`)
  if (mockup_id)    parts.push(`Mockup ID: ${mockup_id}`)
  const notes = parts.join('\n')

  // Upsert — don't create duplicates for same email
  const { data: existing } = await admin
    .from('prospects')
    .select('id, notes')
    .eq('org_id', DEFAULT_ORG)
    .eq('email', email)
    .maybeSingle()

  if (existing) {
    const merged = [existing.notes, notes].filter(Boolean).join('\n---\n')
    await admin.from('prospects').update({
      phone:      phone || undefined,
      company:    company || undefined,
      notes:      merged,
      updated_at: new Date().toISOString(),
    }).eq('id', existing.id)
    return NextResponse.json({ success: true, prospect_id: existing.id })
  }

  const { data: prospect, error } = await admin.from('prospects').insert({
    org_id:   DEFAULT_ORG,
    name,
    email,
    phone:    phone || null,
    company:  company || null,
    notes:    notes || null,
    source,
    status:   'new',
  }).select('id').single()

  if (error) {
    console.error('Lead submit error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, prospect_id: prospect.id })
}
