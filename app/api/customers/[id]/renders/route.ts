import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const customerId = params.id

  // 1. All mockup_results for this customer (direct or via project)
  const { data: directMockups } = await admin
    .from('mockup_results')
    .select('id, status, output_type, company_name, concept_a_url, concept_b_url, concept_c_url, concept_d_url, concept_e_url, concept_f_url, selected_concept, final_mockup_url, upscaled_url, print_url, created_at, current_step, step_name')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  // Also get mockups via projects linked to this customer
  const { data: projectIds } = await admin
    .from('projects')
    .select('id')
    .eq('customer_id', customerId)

  let projectMockups: typeof directMockups = []
  if (projectIds && projectIds.length > 0) {
    const pIds = projectIds.map(p => p.id)
    const { data } = await admin
      .from('mockup_results')
      .select('id, status, output_type, company_name, concept_a_url, concept_b_url, concept_c_url, concept_d_url, concept_e_url, concept_f_url, selected_concept, final_mockup_url, upscaled_url, print_url, created_at, current_step, step_name')
      .in('project_id', pIds)
      .is('customer_id', null)
      .order('created_at', { ascending: false })
    projectMockups = data || []
  }

  const renders = [...(directMockups || []), ...(projectMockups || [])]
  // Deduplicate by id
  const seen = new Set<string>()
  const uniqueRenders = renders.filter(r => {
    if (seen.has(r.id)) return false
    seen.add(r.id)
    return true
  })

  // 2. Saved/liked renders
  const { data: saved } = await admin
    .from('customer_saved_renders')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  // 3. Design activity (mockup-related events)
  const { data: activity } = await admin
    .from('activity_log')
    .select('id, action, details, metadata, actor_type, created_at')
    .eq('customer_id', customerId)
    .in('action', [
      'mockup_concepts_generated',
      'concept_selected',
      'mockup_approved',
      'mockup_generation_failed',
      'render_saved',
    ])
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({
    renders: uniqueRenders,
    saved: saved || [],
    activity: activity || [],
  })
}
