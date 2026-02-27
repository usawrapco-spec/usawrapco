import { ORG_ID } from '@/lib/org'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { DEFAULT_DEPOSIT } from '@/lib/proposals'

// GET /api/proposals — list all proposals for org
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    const admin = getSupabaseAdmin()

    let query = admin
      .from('proposals')
      .select('id, title, status, created_at, sent_at, expiration_date, public_token, deposit_amount, customer_id, estimate_id')
      .eq('org_id', ORG_ID)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: proposals, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (!proposals || proposals.length === 0) {
      return NextResponse.json({ proposals: [] })
    }

    // Batch: fetch customer names
    const customerIds = [...new Set(proposals.map(p => p.customer_id).filter(Boolean))]
    const estimateIds = [...new Set(proposals.map(p => p.estimate_id).filter(Boolean))]

    const [customersResult, estimatesResult, pkgSumsResult] = await Promise.all([
      customerIds.length > 0
        ? admin.from('customers').select('id, name, email').in('id', customerIds)
        : Promise.resolve({ data: [] }),
      estimateIds.length > 0
        ? admin.from('estimates').select('id, customer_id, customers:customer_id(name,email)').in('id', estimateIds)
        : Promise.resolve({ data: [] }),
      admin
        .from('proposal_packages')
        .select('proposal_id, price')
        .in('proposal_id', proposals.map(p => p.id)),
    ])

    const customerMap: Record<string, { name: string; email: string }> = {}
    for (const c of (customersResult.data || [])) {
      customerMap[c.id] = { name: c.name, email: c.email }
    }

    const estimateCustomerMap: Record<string, { name: string; email: string }> = {}
    for (const e of (estimatesResult.data || []) as any[]) {
      if (e.customers) estimateCustomerMap[e.id] = e.customers
    }

    // Sum prices per proposal
    const totalMap: Record<string, number> = {}
    for (const pkg of (pkgSumsResult.data || [])) {
      totalMap[pkg.proposal_id] = (totalMap[pkg.proposal_id] || 0) + Number(pkg.price)
    }

    const enriched = proposals.map(p => {
      const customer =
        (p.customer_id ? customerMap[p.customer_id] : null) ||
        (p.estimate_id ? estimateCustomerMap[p.estimate_id] : null) ||
        null
      return {
        ...p,
        customer_name: customer?.name || null,
        customer_email: customer?.email || null,
        total_value: totalMap[p.id] || 0,
      }
    })

    return NextResponse.json({ proposals: enriched })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

// POST /api/proposals — create standalone proposal
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { customer_id, title } = body

    const admin = getSupabaseAdmin()

    const { data: proposal, error } = await admin
      .from('proposals')
      .insert({
        org_id: ORG_ID,
        title: title || 'New Proposal',
        customer_id: customer_id || null,
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
