import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { token, proofId, action, feedback } = await req.json()

    if (!token || !proofId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['approved', 'revision_requested'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Validate customer token
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('portal_token', token)
      .maybeSingle()

    if (!customer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Verify the proof belongs to a project owned by this customer
    const { data: proof } = await supabase
      .from('design_proofs')
      .select('id, project_id')
      .eq('id', proofId)
      .maybeSingle()

    if (!proof) {
      return NextResponse.json({ error: 'Proof not found' }, { status: 404 })
    }

    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', proof.project_id)
      .eq('customer_id', customer.id)
      .maybeSingle()

    if (!project) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update proof status
    const updateData: Record<string, string> = { customer_status: action }
    if (feedback && action === 'revision_requested') {
      updateData.customer_feedback = feedback
    }

    const { error } = await supabase
      .from('design_proofs')
      .update(updateData)
      .eq('id', proofId)

    if (error) {
      return NextResponse.json({ error: 'Failed to update proof' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
