import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const listId = params.id

  // Verify list ownership
  const { data: list } = await supabase
    .from('sales_agent_lists')
    .select('id, agent_id')
    .eq('id', listId)
    .single()

  if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 })
  if (list.agent_id !== user.id) {
    return NextResponse.json({ error: 'Not your list' }, { status: 403 })
  }

  const body = await req.json()
  const { leads, column_map } = body as {
    leads: Record<string, string>[]
    column_map: Record<string, string>
  }

  if (!leads?.length) {
    return NextResponse.json({ error: 'No leads provided' }, { status: 400 })
  }

  // Map CSV columns to lead fields
  const mapped = leads.map((row, idx) => {
    const lead: Record<string, any> = {
      list_id: listId,
      sort_order: idx,
      status: 'pending',
    }

    // Standard fields
    const fieldKeys = ['name', 'company', 'phone', 'email', 'address']
    const customFields: Record<string, string> = {}

    for (const [csvCol, value] of Object.entries(row)) {
      const mappedField = column_map[csvCol]
      if (mappedField && fieldKeys.includes(mappedField)) {
        lead[mappedField] = value?.trim() || null
      } else if (mappedField === 'notes') {
        lead.notes = value?.trim() || null
      } else if (value?.trim()) {
        customFields[csvCol] = value.trim()
      }
    }

    // Ensure name exists
    if (!lead.name) {
      lead.name = lead.company || lead.email || lead.phone || `Lead ${idx + 1}`
    }

    if (Object.keys(customFields).length > 0) {
      lead.custom_fields = customFields
    }

    return lead
  })

  // Batch insert (Supabase supports up to ~1000 at a time)
  const batchSize = 500
  let inserted = 0

  for (let i = 0; i < mapped.length; i += batchSize) {
    const batch = mapped.slice(i, i + batchSize)
    const { error } = await supabase
      .from('sales_agent_list_leads')
      .insert(batch)

    if (error) {
      return NextResponse.json({
        error: `Failed at batch ${Math.floor(i / batchSize) + 1}: ${error.message}`,
        inserted,
      }, { status: 500 })
    }
    inserted += batch.length
  }

  // Update list counts
  await supabase
    .from('sales_agent_lists')
    .update({
      total_count: mapped.length,
      source_filename: body.source_filename || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', listId)

  return NextResponse.json({ inserted, total: mapped.length })
}
