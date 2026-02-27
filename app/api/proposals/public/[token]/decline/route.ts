import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const { reason } = await req.json().catch(() => ({}))
    const admin = getSupabaseAdmin()

    const { data: proposal } = await admin
      .from('proposals')
      .select('id, status')
      .eq('public_token', params.token)
      .single()

    if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (proposal.status === 'accepted') {
      return NextResponse.json({ error: 'Proposal already accepted' }, { status: 409 })
    }
    if (proposal.status === 'declined') {
      return NextResponse.json({ error: 'Proposal already declined' }, { status: 409 })
    }

    await admin.from('proposals').update({
      status: 'declined',
      declined_at: new Date().toISOString(),
      decline_reason: reason || null,
      updated_at: new Date().toISOString(),
    }).eq('id', proposal.id)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
