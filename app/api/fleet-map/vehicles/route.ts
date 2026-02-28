import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('fleet_vehicles')
    .select('*')
    .eq('org_id', ORG_ID)
    .not('name', 'is', null)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const body = await req.json()
  const { id, ...fields } = body as { id: string; [key: string]: unknown }

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('fleet_vehicles')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('org_id', ORG_ID)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
