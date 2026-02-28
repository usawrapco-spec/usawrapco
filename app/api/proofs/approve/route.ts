import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  try {
    const { proof_token, note } = await req.json()
    const supabase = getSupabaseAdmin()

    // Find project by proof_token
    const { data: project } = await supabase
      .from('projects')
      .select('id, org_id, pipe_stage')
      .eq('proof_token', proof_token)
      .maybeSingle()

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Update the latest design proof
    await supabase
      .from('design_proofs')
      .update({
        customer_status: 'approved',
        customer_note: note || '',
        approved_at: new Date().toISOString(),
      })
      .eq('project_id', project.id)
      .eq('customer_status', 'pending')

    // Advance project stage if still in design
    if (
      project.pipe_stage === 'sales_in' ||
      project.pipe_stage === 'proof_sent'
    ) {
      await supabase
        .from('projects')
        .update({ pipe_stage: 'production' })
        .eq('id', project.id)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Proof approve error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
