import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

// GET — fetch a single brand portfolio (public — for /brand/[id] page)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('brand_portfolios')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Track view — update status to 'viewed' if was 'sent'
    if (data.status === 'sent') {
      admin.from('brand_portfolios').update({ status: 'viewed', updated_at: new Date().toISOString() }).eq('id', params.id)
    }

    return NextResponse.json({ portfolio: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH — customer edits (public endpoint for customer-facing edit mode)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = getSupabaseAdmin()
    const body = await req.json()

    const { data, error } = await admin
      .from('brand_portfolios')
      .update({
        customer_edits: body.customer_edits,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ portfolio: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
