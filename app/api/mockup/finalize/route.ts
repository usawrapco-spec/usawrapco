/**
 * POST /api/mockup/finalize
 * Called after user picks a concept (A/B/C).
 * Sets the selected concept as the final result.
 */
export const runtime = 'nodejs'
export const maxDuration = 300
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const admin = getSupabaseAdmin()

  // Auth — try to get user, but don't hard-fail (internal tools may bypass)
  let orgId: string | null = null
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await admin.from('profiles').select('org_id').eq('id', user.id).single()
      orgId = profile?.org_id || null
    }
  } catch { /* proceed without org scope */ }

  const { mockup_id, selected_concept = 'a' } = await req.json()
  if (!mockup_id) return NextResponse.json({ error: 'mockup_id required' }, { status: 400 })

  // Fetch mockup record — try org-scoped first, fall back to id-only
  let mockup: Record<string, unknown> | null = null

  if (orgId) {
    const { data } = await admin
      .from('mockup_results')
      .select('*')
      .eq('id', mockup_id)
      .eq('org_id', orgId)
      .single()
    mockup = data
  }

  if (!mockup) {
    const { data } = await admin
      .from('mockup_results')
      .select('*')
      .eq('id', mockup_id)
      .single()
    mockup = data
  }

  if (!mockup) {
    console.error('Finalize: mockup not found', { mockup_id, orgId })
    return NextResponse.json({ error: 'Mockup not found' }, { status: 404 })
  }

  // Get the selected artwork URL
  const artworkUrl =
    selected_concept === 'b' ? mockup.concept_b_url :
    selected_concept === 'c' ? mockup.concept_c_url :
    selected_concept === 'd' ? (mockup as any).concept_d_url :
    selected_concept === 'e' ? (mockup as any).concept_e_url :
    selected_concept === 'f' ? (mockup as any).concept_f_url :
    mockup.concept_a_url || mockup.flat_design_url

  if (!artworkUrl) return NextResponse.json({ error: 'No artwork URL for selected concept' }, { status: 400 })

  try {
    // Simply mark the selected concept as final — no extra AI processing
    await admin.from('mockup_results').update({
      selected_concept,
      status: 'processing',
      current_step: 3,
      step_name: 'Refining selected concept…',
    }).eq('id', mockup_id)

    // Polish
    const { concept_url: polishedUrl } = await polishMockup({
      mockup_id,
      composited_url: artworkUrl,
      org_id: orgId,
    })

    // Vehicle render (wraps only)
    let renderUrl: string | null = null
    if (mockup.output_type !== 'signage') {
      await admin.from('mockup_results').update({ current_step: 4, step_name: 'Rendering on vehicle (AI preview)…' }).eq('id', mockup_id)
      renderUrl = await renderOnVehicle(
        polishedUrl,
        String(inputData.vehicle_body_type || 'van'),
        String(inputData.vehicle_year || ''),
        String(inputData.vehicle_make || ''),
        String(inputData.vehicle_model || ''),
      )
    }

    // Text composite on top
    await admin.from('mockup_results').update({ current_step: 5, step_name: 'Adding your information…' }).eq('id', mockup_id)
    const textBase = renderUrl || polishedUrl
    const { composited_url: finalUrl } = await compositeText({
      mockup_id,
      template_id: mockup.template_id || null,
      artwork_url: textBase,
      company_name: mockup.company_name || '',
      tagline: mockup.tagline || '',
      phone: mockup.phone || '',
      website: mockup.website || '',
      font_choice: mockup.font_choice || 'Impact',
      brand_colors: mockup.brand_colors || ['#1a56f0', '#ffffff'],
      logo_url: mockup.logo_url || undefined,
      org_id: orgId,
    })

    await admin.from('mockup_results').update({
      status: 'concept_ready',
      current_step: 6,
      step_name: 'Concept ready',
      final_mockup_url: artworkUrl as string,
      concept_url: artworkUrl as string,
    }).eq('id', mockup_id)

    return NextResponse.json({
      mockup_id,
      status: 'concept_ready',
      concept_url: artworkUrl,
      render_url: artworkUrl,
      flat_design_url: artworkUrl,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Finalize error:', msg)
    await admin.from('mockup_results').update({ status: 'failed', error_message: msg }).eq('id', mockup_id)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
