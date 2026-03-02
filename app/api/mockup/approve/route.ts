import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

async function callRoute(path: string, body: object): Promise<any> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `${path} failed`)
  return data
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { mockup_id } = await req.json()

  if (!mockup_id) return NextResponse.json({ error: 'mockup_id required' }, { status: 400 })

  // Fetch current mockup record
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
    // ── Upscale ───────────────────────────────────────────────────────────────
    const upscaleResult = await callRoute('/api/mockup/upscale', {
      mockup_id,
      concept_url: conceptUrl,
      org_id: orgId,
    })
    const upscaledUrl = upscaleResult.upscaled_url

    // ── Print Export ──────────────────────────────────────────────────────────
    const printResult = await callRoute('/api/mockup/export-print', {
      mockup_id,
      upscaled_url: upscaledUrl,
      org_id: orgId,
    })
    const printUrl = printResult.print_url

    return NextResponse.json({
      mockup_id,
      upscaled_url: upscaledUrl,
      print_url: printUrl,
      specs: printResult.specs,
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
