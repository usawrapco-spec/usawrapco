import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

interface ImportRow {
  name: string
  email?: string
  phone?: string
  company_name?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  notes?: string
  lead_source?: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getSupabaseAdmin()
    const { data: profile } = await admin
      .from('profiles').select('org_id, role').eq('id', user.id).single()
    if (!profile?.org_id) return NextResponse.json({ error: 'No org' }, { status: 400 })

    const allowed = ['owner', 'admin', 'sales_agent', 'manager']
    if (!allowed.includes(profile.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { rows }: { rows: ImportRow[] } = await request.json()
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
    }

    const orgId = profile.org_id
    let created = 0, updated = 0, skipped = 0
    const errors: string[] = []

    // Load existing customers for dedup
    const { data: existing } = await admin
      .from('customers')
      .select('id, name, email, phone')
      .eq('org_id', orgId)

    const byEmail = new Map<string, string>() // email → id
    const byName  = new Map<string, string>() // normalized name → id
    for (const c of existing || []) {
      if (c.email) byEmail.set(c.email.toLowerCase().trim(), c.id)
      if (c.name)  byName.set(c.name.toLowerCase().trim(), c.id)
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row.name?.trim()) { skipped++; continue }

      const payload: Record<string, any> = {
        org_id:       orgId,
        name:         row.name.trim(),
        email:        row.email?.trim().toLowerCase() || null,
        phone:        row.phone?.trim() || null,
        company_name: row.company_name?.trim() || null,
        address:      row.address?.trim() || null,
        city:         row.city?.trim() || null,
        state:        row.state?.trim() || null,
        zip:          row.zip?.trim() || null,
        notes:        row.notes?.trim() || null,
        lead_source:  row.lead_source?.trim() || 'import',
        updated_at:   new Date().toISOString(),
      }

      // Find existing match: email first, then exact name
      const emailKey = payload.email?.toLowerCase()
      const nameKey  = payload.name.toLowerCase()
      const existingId = (emailKey && byEmail.get(emailKey)) || byName.get(nameKey)

      try {
        if (existingId) {
          // Update — only set non-null incoming values so we don't overwrite good data
          const updatePayload: Record<string, any> = { updated_at: payload.updated_at }
          if (payload.phone)        updatePayload.phone        = payload.phone
          if (payload.email)        updatePayload.email        = payload.email
          if (payload.company_name) updatePayload.company_name = payload.company_name
          if (payload.address)      updatePayload.address      = payload.address
          if (payload.city)         updatePayload.city         = payload.city
          if (payload.state)        updatePayload.state        = payload.state
          if (payload.zip)          updatePayload.zip          = payload.zip
          if (payload.notes)        updatePayload.notes        = payload.notes

          await admin.from('customers').update(updatePayload).eq('id', existingId)
          updated++
        } else {
          const { data: newCust } = await admin
            .from('customers').insert(payload).select('id, name, email').single()
          if (newCust) {
            if (newCust.email) byEmail.set(newCust.email.toLowerCase(), newCust.id)
            byName.set(newCust.name.toLowerCase(), newCust.id)
          }
          created++
        }
      } catch (e: any) {
        errors.push(`Row ${i + 1} (${row.name}): ${e.message}`)
        skipped++
      }
    }

    return NextResponse.json({ success: true, created, updated, skipped, errors })
  } catch (err: any) {
    console.error('customer import error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
