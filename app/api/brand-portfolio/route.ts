import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'

// POST — create or update a brand portfolio
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
    const orgId = profile?.org_id

    const body = await req.json()
    const admin = getSupabaseAdmin()

    // Upsert — if id provided update, otherwise create
    const payload: any = {
      org_id: orgId,
      updated_at: new Date().toISOString(),
      ...body,
    }
    delete payload.id

    let result: any
    if (body.id) {
      const { data, error } = await admin.from('brand_portfolios').update(payload).eq('id', body.id).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      result = data
    } else {
      const { data, error } = await admin.from('brand_portfolios').insert(payload).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      result = data
    }

    return NextResponse.json({ portfolio: result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET — list brand portfolios for org
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const customerId = searchParams.get('customer_id')
    const projectId = searchParams.get('project_id')

    let query = supabase.from('brand_portfolios').select('*').order('created_at', { ascending: false })
    if (customerId) query = query.eq('customer_id', customerId)
    if (projectId) query = query.eq('project_id', projectId)

    const { data, error } = await query.limit(20)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ portfolios: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
