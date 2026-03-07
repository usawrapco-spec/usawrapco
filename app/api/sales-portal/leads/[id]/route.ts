import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const allowedFields = [
    'status', 'notes', 'tags', 'call_count', 'last_called_at',
    'next_callback', 'customer_id', 'name', 'company', 'phone', 'email',
  ]

  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  for (const key of allowedFields) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  const { data, error } = await supabase
    .from('sales_agent_list_leads')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update list called_count if status changed
  if (body.status && data?.list_id) {
    const { count } = await supabase
      .from('sales_agent_list_leads')
      .select('id', { count: 'exact', head: true })
      .eq('list_id', data.list_id)
      .neq('status', 'pending')

    await supabase
      .from('sales_agent_lists')
      .update({ called_count: count ?? 0, updated_at: new Date().toISOString() })
      .eq('id', data.list_id)
  }

  return NextResponse.json(data)
}
