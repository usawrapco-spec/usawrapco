import { NextRequest } from 'next/server'
import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import twilio from 'twilio'

/**
 * Provision a Twilio Tracking Number
 *
 * POST { areaCode, campaignId, forwardTo }
 * Searches for an available local number, purchases it,
 * configures the voice webhook, and updates the campaign record.
 */
export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getSupabaseAdmin()
    const { data: profile } = await admin.from('profiles').select('org_id').eq('id', user.id).single()
    const orgId = profile?.org_id || ORG_ID

    const body = await req.json()
    const { areaCode, campaignId, forwardTo } = body

    if (!campaignId) {
      return Response.json({ error: 'campaignId is required' }, { status: 400 })
    }

    // Check for Twilio credentials
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN

    if (!accountSid || !authToken) {
      // Demo mode — return a fake number so the UI still works
      const demoNumber = `+1${areaCode || '206'}555${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`

      await admin
        .from('wrap_campaigns')
        .update({
          tracking_phone: demoNumber,
          forward_to: forwardTo || null,
        })
        .eq('id', campaignId)
        .eq('org_id', orgId)

      return Response.json({
        trackingNumber: demoNumber,
        demoMode: true,
        message: 'Twilio not configured — demo number assigned.',
      })
    }

    const client = twilio(accountSid, authToken)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://app.usawrapco.com'
    const voiceWebhookUrl = `${siteUrl}/api/twilio/inbound-call`

    // Search for available local numbers
    const searchParams: any = { limit: 1 }
    if (areaCode) searchParams.areaCode = parseInt(areaCode, 10)

    const available = await client.availablePhoneNumbers('US').local.list(searchParams)

    if (!available || available.length === 0) {
      return Response.json(
        { error: `No numbers available for area code ${areaCode || 'any'}` },
        { status: 404 }
      )
    }

    // Purchase the number
    const purchased = await client.incomingPhoneNumbers.create({
      phoneNumber: available[0].phoneNumber,
      voiceUrl: voiceWebhookUrl,
      voiceMethod: 'POST',
      friendlyName: `USAWrapCo Campaign ${campaignId.slice(0, 8)}`,
    })

    // Update the campaign with the new tracking number
    await admin
      .from('wrap_campaigns')
      .update({
        tracking_phone: purchased.phoneNumber,
        forward_to: forwardTo || null,
        twilio_sid: purchased.sid,
      })
      .eq('id', campaignId)
      .eq('org_id', orgId)

    return Response.json({
      trackingNumber: purchased.phoneNumber,
      demoMode: false,
      sid: purchased.sid,
    })
  } catch (err: any) {
    console.error('[twilio/generate-number] error:', err)
    return Response.json(
      { error: err.message || 'Failed to provision number' },
      { status: 500 }
    )
  }
}
