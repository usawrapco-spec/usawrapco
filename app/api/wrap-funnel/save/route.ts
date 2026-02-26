import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

// Only these columns may be written by the public funnel — prevents mass assignment
const ALLOWED_FIELDS = new Set([
  'vehicle_year', 'vehicle_make', 'vehicle_model', 'vehicle_trim',
  'wrap_coverage', 'estimated_price_low', 'estimated_price_high',
  'website_url', 'logo_url', 'brand_colors', 'style_preference',
  'instagram_handle', 'business_description',
  'contact_name', 'contact_email', 'contact_phone', 'business_name',
  'mockup_urls', 'utm_source', 'utm_medium', 'utm_campaign', 'ref_code',
])

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { session_token, step_reached, ...rawFields } = body

    if (!session_token) return NextResponse.json({ error: 'session_token required' }, { status: 400 })

    // Strip any fields not in the allowlist
    const fields: Record<string, unknown> = {}
    for (const key of Object.keys(rawFields)) {
      if (ALLOWED_FIELDS.has(key)) fields[key] = rawFields[key]
    }

    const admin = getSupabaseAdmin()

    // Try to update existing session first
    const { data: existing } = await admin
      .from('wrap_funnel_sessions')
      .select('id')
      .eq('session_token', session_token)
      .single()

    const payload = {
      ...fields,
      ...(step_reached !== undefined ? { step_reached } : {}),
      updated_at: new Date().toISOString(),
    }

    if (existing) {
      await admin
        .from('wrap_funnel_sessions')
        .update(payload)
        .eq('session_token', session_token)
    } else {
      await admin
        .from('wrap_funnel_sessions')
        .insert({ session_token, step_reached: step_reached ?? 1, ...fields })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[wrap-funnel/save]', err)
    return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  }
}
