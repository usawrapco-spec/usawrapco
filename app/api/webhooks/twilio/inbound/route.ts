import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const from = formData.get('From') as string
    const to = formData.get('To') as string
    const body = formData.get('Body') as string
    const messageSid = formData.get('MessageSid') as string

    if (!from || !body) {
      return new NextResponse('Missing required fields', { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Find customer by phone number
    const { data: customer } = await supabase
      .from('customers')
      .select('id, name')
      .or(`phone.eq.${from},phone.eq.${from.replace('+1', '')}`)
      .single()

    // Store the inbound message
    await supabase.from('communications').insert({
      channel: 'sms',
      direction: 'inbound',
      customer_id: customer?.id || null,
      from_address: from,
      to_address: to,
      body: body,
      twilio_message_sid: messageSid,
      status: 'received',
    })

    // Return TwiML response
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      }
    )
  } catch (error) {
    console.error('Twilio webhook error:', error)
    return new NextResponse('Error processing webhook', { status: 500 })
  }
}
