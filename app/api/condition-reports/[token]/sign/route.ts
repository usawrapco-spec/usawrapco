import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

// Public endpoint — no auth required (customer signs from their phone)
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const admin = getSupabaseAdmin()
    const body = await req.json()
    const { signature, acknowledged } = body

    if (!signature) return NextResponse.json({ error: 'Signature required' }, { status: 400 })

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'

    const { data: report, error } = await admin
      .from('condition_reports')
      .update({
        customer_signature: signature,
        customer_acknowledged: acknowledged ?? true,
        customer_signed_at: new Date().toISOString(),
        customer_ip: ip,
        status: 'signed',
      })
      .eq('report_token', params.token)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ report })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
