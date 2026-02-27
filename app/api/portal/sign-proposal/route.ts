import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { token, proposalId, customerId, signerName, signatureData } = await req.json()

    if (!token || !proposalId || !signerName || !signatureData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Validate customer token
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('portal_token', token)
      .single()

    if (!customer || customer.id !== customerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Verify the estimate belongs to this customer
    const { data: estimate } = await supabase
      .from('estimates')
      .select('id, status')
      .eq('id', proposalId)
      .eq('customer_id', customerId)
      .single()

    if (!estimate) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }

    // Get IP address
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

    // Insert signature
    const { error: sigError } = await supabase
      .from('proposal_signatures')
      .insert({
        proposal_id: proposalId,
        customer_id: customerId,
        signature_data: signatureData,
        signer_name: signerName,
        ip_address: ip,
      })

    if (sigError) {
      return NextResponse.json({ error: 'Failed to save signature' }, { status: 500 })
    }

    // Update estimate status to accepted
    await supabase
      .from('estimates')
      .update({ status: 'accepted' })
      .eq('id', proposalId)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
