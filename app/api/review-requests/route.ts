import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

// GET: List review requests for the org
export async function GET(req: NextRequest) {
  const admin = getSupabaseAdmin()
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await admin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await admin
    .from('profiles').select('org_id, role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 })

  const { data: requests } = await admin
    .from('review_requests')
    .select('*')
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ requests: requests || [] })
}

// POST: Queue a new review request (triggered when job moves to Paid)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { project_id, customer_id, customer_name, customer_phone, customer_email, org_id } = body

    if (!org_id || !project_id) {
      return NextResponse.json({ error: 'Missing org_id or project_id' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    // Get review settings for this org
    const { data: settings } = await admin
      .from('review_settings')
      .select('*')
      .eq('org_id', org_id)
      .single()

    // If review requests are disabled, skip
    if (settings && !settings.enabled) {
      return NextResponse.json({ skipped: true, reason: 'Review requests disabled' })
    }

    const delayHours = settings?.delay_hours || 48
    const scheduledFor = new Date(Date.now() + delayHours * 60 * 60 * 1000).toISOString()
    const googleReviewLink = settings?.google_review_link || ''
    const smsTemplate = settings?.sms_template || 'Hi {first_name}! Your vehicle wrap from USA Wrap Co is complete. We\'d love your feedback! Leave us a Google review: {review_link}'
    const sendMethod = settings?.send_method || 'sms'

    // Check if we already have a review request for this project
    const { data: existing } = await admin
      .from('review_requests')
      .select('id')
      .eq('project_id', project_id)
      .eq('org_id', org_id)
      .neq('status', 'failed')
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({ skipped: true, reason: 'Review request already exists' })
    }

    // Queue the review request
    const { data: reviewReq, error } = await admin
      .from('review_requests')
      .insert({
        org_id,
        project_id,
        customer_id: customer_id || null,
        customer_name: customer_name || null,
        customer_phone: customer_phone || null,
        customer_email: customer_email || null,
        status: 'queued',
        method: sendMethod,
        scheduled_for: scheduledFor,
        message_template: smsTemplate,
        google_review_link: googleReviewLink,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating review request:', error)
      return NextResponse.json({ error: 'Failed to queue review request' }, { status: 500 })
    }

    return NextResponse.json({ success: true, review_request: reviewReq })
  } catch (err: any) {
    console.error('Review request error:', err)
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}
