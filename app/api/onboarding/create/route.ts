import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://usawrapco.com'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const {
      project_id,
      customer_name,
      customer_email,
      customer_phone,
      vehicle_year,
      vehicle_make,
      vehicle_model,
      vehicle_color,
      expires_days = 7,
    } = await req.json()

    if (!project_id && !customer_email) {
      return NextResponse.json({ error: 'project_id or customer_email required' }, { status: 400 })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + expires_days * 24 * 60 * 60 * 1000).toISOString()

    const admin = getSupabaseAdmin()

    // Insert into customer_intake (the correct intake table)
    const { data, error } = await admin.from('customer_intake').insert({
      token,
      project_id: project_id || null,
      org_id: ORG_ID,
      customer_name: customer_name || null,
      customer_email: customer_email || null,
      customer_phone: customer_phone || null,
      vehicle_year: vehicle_year || null,
      vehicle_make: vehicle_make || null,
      vehicle_model: vehicle_model || null,
      vehicle_color: vehicle_color || null,
      expires_at: expiresAt,
      completed: false,
    }).select('id, token').single()

    if (error) {
      console.error('[onboarding/create] error:', error)
      return NextResponse.json({ error: 'Failed to create onboarding token' }, { status: 500 })
    }

    const url = `${SITE_URL}/onboard/${token}`

    return NextResponse.json({ token, url, id: data.id, expires_at: expiresAt })
  } catch (err) {
    console.error('[onboarding/create] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
