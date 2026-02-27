/**
 * POST /api/twilio/inbound-sms
 * Set Twilio webhook to https://app.usawrapco.com/api/twilio/inbound-sms
 * Receives inbound SMS, logs to conversation, optionally triggers AI reply.
 */
import { ORG_ID } from '@/lib/org'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { isTwilioWebhook, formDataToParams } from '@/lib/phone/validate'

const TWIML_EMPTY = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function twimlResponse(xml: string, status = 200) {
  return new NextResponse(xml, { status, headers: { 'Content-Type': 'text/xml' } })
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const params = formDataToParams(formData)

    if (!isTwilioWebhook(req, params)) {
      return twimlResponse(TWIML_EMPTY, 403)
    }

    const from = formData.get('From') as string
    const to = formData.get('To') as string
    const body = (formData.get('Body') as string) || ''
    const messageSid = formData.get('MessageSid') as string
    const numMedia = parseInt((formData.get('NumMedia') as string) || '0', 10)

    if (!from) return twimlResponse(TWIML_EMPTY, 400)

    const admin = getSupabaseAdmin()

    // Collect MMS media URLs
    const mediaUrls: string[] = []
    for (let i = 0; i < numMedia; i++) {
      const url = formData.get(`MediaUrl${i}`) as string
      if (url) mediaUrls.push(url)
    }

    // Find or create customer by phone
    const cleanPhone = from.replace(/\D/g, '')
    let { data: customer } = await admin
      .from('customers')
      .select('id, name, phone')
      .or(`phone.eq.${from},phone.eq.+1${cleanPhone.slice(-10)},phone.eq.${cleanPhone.slice(-10)}`)
      .eq('org_id', ORG_ID)
      .limit(1)
      .single()

    if (!customer) {
      const { data: newCustomer } = await admin
        .from('customers')
        .insert({
          org_id: ORG_ID,
          name: `Unknown (${from})`,
          phone: from,
          status: 'lead',
          lead_source: 'inbound_sms',
        })
        .select()
        .single()
      customer = newCustomer
    }

    if (!customer) return twimlResponse(TWIML_EMPTY)

    // Find or create conversation
    let { data: conversation } = await admin
      .from('conversations')
      .select('id, unread_count')
      .eq('org_id', ORG_ID)
      .eq('customer_id', customer.id)
      .eq('last_message_channel', 'sms')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!conversation) {
      const { data: newConvo } = await admin
        .from('conversations')
        .insert({
          org_id: ORG_ID,
          customer_id: customer.id,
          contact_name: customer.name || from,
          contact_phone: from,
          status: 'open',
          last_message_at: new Date().toISOString(),
          last_message_preview: body.substring(0, 100),
          last_message_channel: 'sms',
          unread_count: 1,
        })
        .select()
        .single()
      conversation = newConvo
    } else {
      await admin
        .from('conversations')
        .update({
          status: 'open',
          last_message_at: new Date().toISOString(),
          last_message_preview: body.substring(0, 100),
          last_message_channel: 'sms',
          unread_count: (conversation.unread_count || 0) + 1,
        })
        .eq('id', conversation.id)
    }

    if (!conversation) return twimlResponse(TWIML_EMPTY)

    // Insert message
    await admin.from('conversation_messages').insert({
      conversation_id: conversation.id,
      channel: 'sms',
      direction: 'inbound',
      body,
      attachments: mediaUrls.length > 0 ? mediaUrls.map(u => ({ url: u, type: 'image' })) : null,
      status: 'received',
      sender_name: customer.name || from,
      twilio_sid: messageSid,
      media_urls: mediaUrls.length > 0 ? mediaUrls : null,
    })

    // Log to communications table
    await admin.from('communications').insert({
      org_id: ORG_ID,
      channel: 'sms',
      direction: 'inbound',
      customer_id: customer.id,
      from_address: from,
      to_address: to,
      body,
      twilio_message_sid: messageSid,
      media_urls: mediaUrls.length > 0 ? mediaUrls : null,
      status: 'received',
      created_at: new Date().toISOString(),
    })

    // Activity log
    await admin.from('activity_log').insert({
      org_id: ORG_ID,
      customer_id: customer.id,
      actor_type: 'customer',
      actor_id: customer.id,
      actor_name: customer.name || from,
      action: 'inbound_sms',
      details: body.length > 200 ? body.substring(0, 200) + '...' : body,
      metadata: { message_sid: messageSid, media_count: numMedia },
    })

    // Check AI auto-reply config
    let aiReplyBody: string | null = null
    const { data: aiConfig } = await admin
      .from('conversation_ai_config')
      .select('ai_enabled, system_prompt')
      .eq('conversation_id', conversation.id)
      .single()

    if (aiConfig?.ai_enabled) {
      // Check global AI toggle
      const { data: globalAi } = await admin
        .from('ai_settings')
        .select('enabled')
        .eq('org_id', ORG_ID)
        .single()

      if (globalAi?.enabled) {
        try {
          const anthropicKey = process.env.ANTHROPIC_API_KEY
          if (anthropicKey) {
            const systemPrompt = aiConfig.system_prompt ||
              'You are a helpful assistant for USA Wrap Co, a vehicle wrap shop. Be concise and professional. Reply in 1-2 sentences.'

            const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': anthropicKey,
                'anthropic-version': '2023-06-01',
              },
              body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 300,
                system: systemPrompt,
                messages: [{ role: 'user', content: body }],
              }),
            })

            if (aiRes.ok) {
              const aiData = await aiRes.json()
              aiReplyBody = aiData.content?.[0]?.text || null
            }
          }
        } catch (err) {
          console.error('[inbound-sms] AI reply error:', err)
        }

        // Send AI reply via Twilio
        if (aiReplyBody) {
          const twilioSid = process.env.TWILIO_ACCOUNT_SID
          const twilioAuth = process.env.TWILIO_AUTH_TOKEN
          const twilioFrom = process.env.TWILIO_PHONE_NUMBER || to

          if (twilioSid && twilioAuth) {
            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`
            const smsParams = new URLSearchParams({ To: from, From: twilioFrom, Body: aiReplyBody })

            const sendRes = await fetch(twilioUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64')}`,
              },
              body: smsParams.toString(),
            })

            const sendData = await sendRes.json()

            // Log AI reply as outbound message
            await admin.from('conversation_messages').insert({
              conversation_id: conversation.id,
              channel: 'sms',
              direction: 'outbound',
              body: aiReplyBody,
              status: sendRes.ok ? 'sent' : 'failed',
              sent_by_name: 'AI Assistant',
              twilio_sid: sendData.sid || null,
            })

            // Log to ai_message_log
            await admin.from('ai_message_log').insert({
              org_id: ORG_ID,
              conversation_id: conversation.id,
              direction: 'outbound',
              body: aiReplyBody,
              model: 'claude-sonnet-4-20250514',
              trigger: 'inbound_sms',
            })
          }
        }
      }
    }

    if (aiReplyBody) {
      return twimlResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(aiReplyBody)}</Message></Response>`
      )
    }

    return twimlResponse(TWIML_EMPTY)
  } catch (error) {
    console.error('[inbound-sms] error:', error)
    return twimlResponse(TWIML_EMPTY, 500)
  }
}
