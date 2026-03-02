import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { upscaleMockup, exportPrint } from '@/lib/mockup/pipeline'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { mockup_id } = await req.json()

  if (!mockup_id) return NextResponse.json({ error: 'mockup_id required' }, { status: 400 })

  const { data: mockup, error: fetchErr } = await admin
    .from('mockup_results')
    .select('concept_url, org_id')
    .eq('id', mockup_id)
    .single()

  if (fetchErr || !mockup) {
    return NextResponse.json({ error: 'Mockup not found' }, { status: 404 })
  }

  const conceptUrl = mockup.concept_url
  const orgId = mockup.org_id

  if (!conceptUrl) {
    return NextResponse.json({ error: 'Mockup has no concept_url — run /start first' }, { status: 400 })
  }

  // Record approval
  await admin.from('mockup_results').update({
    approved_at: new Date().toISOString(),
    approved_by: user.id,
    status: 'approving',
    current_step: 5,
    step_name: 'Upscaling to print resolution…',
  }).eq('id', mockup_id)

  try {
    // ── Upscale — direct function call ────────────────────────────────────────
    const { upscaled_url: upscaledUrl } = await upscaleMockup({
      mockup_id,
      concept_url: conceptUrl,
      org_id: orgId,
    })

    // ── Print Export — direct function call ───────────────────────────────────
    const { print_url: printUrl, specs } = await exportPrint({
      mockup_id,
      upscaled_url: upscaledUrl,
      org_id: orgId,
    })

    return NextResponse.json({
      mockup_id,
      upscaled_url: upscaledUrl,
      print_url: printUrl,
      specs,
    })
  } catch (err: any) {
    await admin.from('mockup_results').update({
      error_step: 'approve',
      error_message: err.message,
      status: 'concept_ready',
    }).eq('id', mockup_id)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
