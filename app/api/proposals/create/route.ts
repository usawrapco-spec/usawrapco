import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { DEFAULT_DEPOSIT } from '@/lib/proposals'

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { estimate_id } = await req.json()
    if (!estimate_id) return NextResponse.json({ error: 'estimate_id required' }, { status: 400 })

    const admin = getSupabaseAdmin()

    // Check if proposal already exists for this estimate
    const { data: existing } = await admin
      .from('proposals')
      .select('id, public_token')
      .eq('estimate_id', estimate_id)
      .single()

    if (existing) {
      return NextResponse.json({ proposal: existing })
    }

    // Fetch estimate for defaults
    const { data: estimate } = await admin
      .from('estimates')
      .select('id, org_id, title, customer_id, notes')
      .eq('id', estimate_id)
      .single()

    if (!estimate) return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })

    const { data: proposal, error } = await admin
      .from('proposals')
      .insert({
        estimate_id,
        org_id: estimate.org_id || 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f',
        title: 'Your Custom Wrap Proposal',
        status: 'draft',
        deposit_amount: DEFAULT_DEPOSIT,
        expiration_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ proposal })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
