import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, ...fields } = body

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    // Only allow updating safe fields
    const allowed: Record<string, unknown> = {}
    const safeFields = [
      'contact_name', 'contact_email', 'contact_phone', 'business_name',
      'website_url', 'how_heard', 'services_selected', 'vehicle_data',
      'brand_data', 'inspiration_images', 'style_preference',
    ]
    for (const key of safeFields) {
      if (fields[key] !== undefined) allowed[key] = fields[key]
    }
    allowed.updated_at = new Date().toISOString()

    const { error } = await admin.from('design_intake_sessions')
      .update(allowed)
      .eq('token', token)

    if (error) {
      console.error('[design-intake/save] error:', error)
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[design-intake/save] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
