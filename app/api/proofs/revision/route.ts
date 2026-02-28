import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  try {
    const { proof_token, note } = await req.json()
    const supabase = getSupabaseAdmin()

    // Find project
    const { data: project } = await supabase
      .from('projects')
      .select('id, org_id')
      .eq('proof_token', proof_token)
      .maybeSingle()

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Update proof to changes_requested
    await supabase
      .from('design_proofs')
      .update({
        customer_status: 'changes_requested',
        customer_note: note || '',
      })
      .eq('project_id', project.id)
      .eq('customer_status', 'pending')

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Proof revision error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
