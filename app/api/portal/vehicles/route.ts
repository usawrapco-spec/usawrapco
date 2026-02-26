import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const customer_id = searchParams.get('customer_id')
  if (!customer_id) return NextResponse.json({ error: 'Missing customer_id' }, { status: 400 })

  const db = supabaseAdmin()
  const { data, error } = await db
    .from('customer_vehicles')
    .select('*')
    .eq('customer_id', customer_id)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ vehicles: data })
}

export async function POST(req: Request) {
  const body = await req.json()
  const db = supabaseAdmin()

  const { data, error } = await db
    .from('customer_vehicles')
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ vehicle: data })
}

export async function PATCH(req: Request) {
  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const db = supabaseAdmin()
  const { data, error } = await db
    .from('customer_vehicles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ vehicle: data })
}
