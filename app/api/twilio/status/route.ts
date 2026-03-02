/**
 * POST /api/twilio/status
 * Twilio delivery status callback.
 * Configure in Twilio console: Status Callback URL → https://app.usawrapco.com/api/twilio/status
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const messageSid = formData.get('MessageSid') as string
    const messageStatus = formData.get('MessageStatus') as string
    const errorCode = (formData.get('ErrorCode') as string) || null
    const errorMessage = (formData.get('ErrorMessage') as string) || null

    if (!messageSid) return new NextResponse('OK', { status: 200 })

    if (['failed', 'undelivered'].includes(messageStatus)) {
      console.error(`[twilio/status] SMS failed: ${messageSid} — error ${errorCode}: ${errorMessage}`)
    }

    const admin = getSupabaseAdmin()

    // Update conversation_messages by twilio_sid
    await admin
      .from('conversation_messages')
      .update({ status: messageStatus })
      .eq('twilio_sid', messageSid)

    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('[twilio/status] error:', error)
    return new NextResponse('OK', { status: 200 })
  }
}

export async function GET() {
  return new NextResponse('OK', { status: 200 })
}
