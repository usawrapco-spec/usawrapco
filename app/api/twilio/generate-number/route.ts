import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { areaCode, campaignId, forwardTo } = await req.json()

  if (!campaignId) {
    return Response.json({ error: 'campaignId required' }, { status: 400 })
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.usawrapco.com'

  // Demo mode if Twilio not configured
  if (!accountSid || !authToken) {
    const demoNumber = `+1${areaCode || '555'}${String(Math.floor(Math.random() * 9000000) + 1000000)}`
    const admin = getSupabaseAdmin()
    await admin.from('wrap_campaigns').update({
      tracking_phone: demoNumber,
      forward_to: forwardTo || null,
      updated_at: new Date().toISOString(),
    }).eq('id', campaignId)

    return Response.json({
      trackingNumber: demoNumber,
      demo: true,
      message: 'Demo mode — configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN for real numbers',
    })
  }

  try {
    const twilio = (await import('twilio')).default
    const client = twilio(accountSid, authToken)

    // Search for available numbers
    const numbers = await client.availablePhoneNumbers('US')
      .local
      .list({ areaCode: areaCode ? parseInt(areaCode) : undefined, limit: 1 })

    if (!numbers.length) {
      return Response.json({ error: 'No numbers available for that area code' }, { status: 404 })
    }

    // Purchase the number
    const purchased = await client.incomingPhoneNumbers.create({
      phoneNumber: numbers[0].phoneNumber,
      voiceUrl: `${appUrl}/api/twilio/inbound-call`,
      voiceMethod: 'POST',
    })

    // Update campaign
    const admin = getSupabaseAdmin()
    await admin.from('wrap_campaigns').update({
      tracking_phone: purchased.phoneNumber,
      forward_to: forwardTo || null,
      updated_at: new Date().toISOString(),
    }).eq('id', campaignId)

    return Response.json({ trackingNumber: purchased.phoneNumber })
  } catch (err: any) {
    return Response.json({ error: err.message || 'Failed to provision number' }, { status: 500 })
  }
}
