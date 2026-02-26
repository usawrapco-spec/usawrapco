import { ORG_ID } from '@/lib/org'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import crypto from 'crypto'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.usawrapco.com'
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { project_id, customer_name, customer_email } = await req.json()

    const token = crypto.randomBytes(32).toString('hex')
    const admin = getSupabaseAdmin()

    const { data, error } = await admin.from('design_intake_sessions').insert({
      token,
      project_id: project_id || null,
      org_id: ORG_ID,
      contact_name: customer_name || null,
      contact_email: customer_email || null,
    }).select('id, token').single()

    if (error) {
      console.error('[design-intake/generate] error:', error)
      return NextResponse.json({ error: 'Failed to create intake token' }, { status: 500 })
    }

    // Link token to project if provided
    if (project_id) {
      await admin.from('projects')
        .update({ design_intake_token: token })
        .eq('id', project_id)
    }

    const url = `${SITE_URL}/design-intake/${token}`
    return NextResponse.json({ token, url, id: data.id })
  } catch (err) {
    console.error('[design-intake/generate] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
