export const dynamic = 'force-dynamic'

import { ORG_ID } from '@/lib/org'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { isTwilioWebhook, formDataToParams } from '@/lib/phone/validate'

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || ''
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || ''
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || ''
/* ─── Send SMS via Twilio ────────────────────────────────────────────── */
async function sendSMS(to: string, body: string): Promise<string | null> {
  if (!TWILIO_ACCOUNT_SID || TWILIO_ACCOUNT_SID.startsWith('PLACEHOLDER')) {
    console.log('[VINYL] Twilio not configured, logging SMS:', { to, body: body.slice(0, 200) })
    return 'demo_sid_' + Date.now()
  }
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: TWILIO_PHONE_NUMBER, Body: body }),
    })
    const data = await res.json()
    return data.sid || null
  } catch (err) {
    console.error('[VINYL] Twilio send failed:', err)
    return null
  }
}

/* ─── Send email via SendGrid ────────────────────────────────────────── */
async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || ''
  if (!SENDGRID_API_KEY || SENDGRID_API_KEY.startsWith('PLACEHOLDER')) {
    console.log('[VINYL] SendGrid not configured, logging email:', { to, subject })
    return true
  }
  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: process.env.GMAIL_USER || 'hello@usawrapco.com', name: 'USA Wrap Co' },
        subject,
        content: [{ type: 'text/html', value: body }],
      }),
    })
    return res.ok
  } catch { return false }
}

/* ─── Check escalation rules ─────────────────────────────────────────── */
function checkEscalationRules(
  message: string,
  confidence: number,
  quoteTotal: number,
  rules: any[]
): { shouldEscalate: boolean; reason: string } {
  for (const rule of rules) {
    if (!rule.is_active) continue
    switch (rule.rule_type) {
      case 'keyword': {
        const keywords: string[] = rule.rule_config?.keywords || []
        const lower = message.toLowerCase()
        const match = keywords.find(k => lower.includes(k.toLowerCase()))
        if (match) return { shouldEscalate: true, reason: `Customer used keyword: "${match}"` }
        break
      }
      case 'confidence':
        if (confidence < (rule.rule_config?.threshold || 0.6))
          return { shouldEscalate: true, reason: `AI confidence too low: ${confidence.toFixed(2)}` }
        break
      case 'dollar_threshold':
        if (quoteTotal > (rule.rule_config?.max_amount || 10000))
          return { shouldEscalate: true, reason: `Deal value $${quoteTotal} exceeds threshold` }
        break
      case 'explicit_request': {
        const phrases = ['speak to someone', 'real person', 'human', 'manager', 'talk to a person', 'supervisor']
        const lower = message.toLowerCase()
        const hit = phrases.find(p => lower.includes(p))
        if (hit) return { shouldEscalate: true, reason: 'Customer requested human agent' }
        break
      }
    }
  }
  return { shouldEscalate: false, reason: '' }
}

/* ─── POST handler ───────────────────────────────────────────────────── */
export async function POST(req: Request) {
  const admin = getSupabaseAdmin()

  // Accept both Twilio webhook format and JSON
  let inboundFrom = ''
  let inboundBody = ''
  let channel: 'sms' | 'email' = 'sms'
  let externalId = ''

  const contentType = req.headers.get('content-type') || ''
  if (contentType.includes('application/x-www-form-urlencoded')) {
    // Twilio webhook — verify signature before processing
    const formData = await req.formData()
    const params = formDataToParams(formData)
    if (!isTwilioWebhook(req, params)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    inboundFrom = (formData.get('From') as string) || ''
    inboundBody = (formData.get('Body') as string) || ''
    externalId = (formData.get('MessageSid') as string) || ''
    channel = 'sms'
  } else {
    // JSON calls must include internal API secret or come from an authenticated session
    const internalSecret = req.headers.get('x-internal-secret')
    if (!internalSecret || internalSecret !== process.env.INTERNAL_API_SECRET) {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const json = await req.json()
    inboundFrom = json.from || json.phone || json.email || ''
    inboundBody = json.message || json.body || json.content || ''
    channel = json.channel || 'sms'
    externalId = json.external_id || ''
  }

  if (!inboundBody) {
    return NextResponse.json({ error: 'No message body' }, { status: 400 })
  }

  // 1. Find or create conversation
  let conversation: any = null
  const matchField = channel === 'sms' ? 'contact_phone' : 'contact_email'

  const { data: existingConvo } = await admin
    .from('conversations')
    .select('*')
    .eq('org_id', ORG_ID)
    .eq(matchField, inboundFrom)
    .not('status', 'eq', 'resolved')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingConvo) {
    conversation = existingConvo
  } else {
    // Find or create customer
    let customerId: string | null = null
    if (channel === 'sms' && inboundFrom) {
      const { data: cust } = await admin.from('customers')
        .select('id').eq('org_id', ORG_ID).eq('phone', inboundFrom).limit(1).maybeSingle()
      if (cust) customerId = cust.id
      else {
        const { data: newCust } = await admin.from('customers').insert({
          org_id: ORG_ID, phone: inboundFrom, name: inboundFrom,
          status: 'lead', source: 'ai_broker',
        }).select('id').single()
        customerId = newCust?.id || null
      }
    } else if (channel === 'email' && inboundFrom) {
      const { data: cust } = await admin.from('customers')
        .select('id').eq('org_id', ORG_ID).eq('email', inboundFrom).limit(1).maybeSingle()
      if (cust) customerId = cust.id
      else {
        const { data: newCust } = await admin.from('customers').insert({
          org_id: ORG_ID, email: inboundFrom, name: inboundFrom,
          status: 'lead', source: 'ai_broker',
        }).select('id').single()
        customerId = newCust?.id || null
      }
    }

    const { data: newConvo } = await admin.from('conversations').insert({
      org_id: ORG_ID,
      customer_id: customerId,
      contact_name: inboundFrom,
      contact_phone: channel === 'sms' ? inboundFrom : null,
      contact_email: channel === 'email' ? inboundFrom : null,
      status: 'open',
      last_message_at: new Date().toISOString(),
      last_message_preview: inboundBody.slice(0, 120),
      last_message_channel: channel,
      unread_count: 1,
      tags: { ai_enabled: true, lead_stage: 'new', vehicle_info: {}, wrap_preferences: {}, quote_data: {} },
    }).select('*').single()
    conversation = newConvo
  }

  if (!conversation) {
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
  }

  // 2. Log inbound message
  await admin.from('messages').insert({
    org_id: ORG_ID,
    conversation_id: conversation.id,
    direction: 'inbound',
    content: inboundBody,
    channel,
    external_id: externalId || null,
  })

  // 3. If AI is disabled, just log and return
  if ((conversation.tags as any)?.ai_enabled === false) {
    return NextResponse.json({ status: 'logged', ai_enabled: false, conversation_id: conversation.id })
  }

  // 4. Load context: history, playbook, pricing, escalation rules
  const [historyRes, playbookRes, pricingRes, rulesRes] = await Promise.all([
    admin.from('messages').select('*').eq('conversation_id', conversation.id).order('created_at', { ascending: true }).limit(50),
    admin.from('sales_playbook').select('*').eq('org_id', ORG_ID).eq('is_active', true).order('priority', { ascending: true }),
    admin.from('pricing_rules').select('*').eq('org_id', ORG_ID).eq('is_active', true),
    admin.from('escalation_rules').select('*').eq('org_id', ORG_ID).eq('is_active', true).order('priority', { ascending: true }),
  ])

  const history = historyRes.data || []
  const playbook = playbookRes.data || []
  const pricing = pricingRes.data || []
  const rules = rulesRes.data || []

  // 5. Load customer info
  let customerInfo = 'Unknown customer'
  if (conversation.customer_id) {
    const { data: cust } = await admin.from('customers')
      .select('name, email, phone, company_name, status')
      .eq('id', conversation.customer_id).single()
    if (cust) customerInfo = JSON.stringify(cust)
  }

  // 6. Build system prompt
  const brandVoice = playbook.filter((p: any) => p.category === 'brand_voice').map((p: any) => p.response_guidance).join('\n')
  const groupedPlaybook = playbook.reduce((acc: Record<string, string[]>, p: any) => {
    if (p.category === 'brand_voice') return acc
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p.response_guidance)
    return acc
  }, {} as Record<string, string[]>)

  const pricingTable = pricing.map((p: any) =>
    `${p.vehicle_category} / ${p.wrap_type}: $${p.base_price} base, $${p.price_per_sqft}/sqft, max ${p.max_discount_pct}% discount`
  ).join('\n')

  const maxDeal = rules.find((r: any) => r.rule_type === 'dollar_threshold')?.rule_config?.max_amount || 10000
  const maxDiscount = pricing.length > 0 ? Math.max(...pricing.map((p: any) => p.max_discount_pct || 0)) : 10

  const conversationHistory = history.map((m: any) =>
    `[${m.direction === 'inbound' ? 'Customer' : 'VINYL'}] ${m.content}`
  ).join('\n')

  const systemPrompt = `You are V.I.N.Y.L., the AI sales assistant for USA Wrap Co in Seattle.

BRAND VOICE: ${brandVoice || 'Professional but conversational. Friendly, knowledgeable about vehicle wraps. Not pushy but always move toward booking.'}

YOUR SALES PLAYBOOK:
${Object.entries(groupedPlaybook).map(([cat, entries]) =>
  `[${cat.toUpperCase()}]\n${(entries as string[]).map((e: string) => `- ${e}`).join('\n')}`
).join('\n\n') || 'Use your best judgment for vehicle wrap sales conversations.'}

PRICING YOU CAN QUOTE:
${pricingTable || 'Partial wrap: $1,500-2,500 | Full wrap: $3,000-5,000 | Color change: $3,500-6,000 | Fleet (per vehicle): varies | PPF: $800-2,000'}

ESCALATION BOUNDARIES:
- Max deal you can close without approval: $${maxDeal}
- Max discount you can offer: ${maxDiscount}%
- If customer asks for a human, ALWAYS escalate
- If you're unsure about something, set confidence below 0.6

THIS CUSTOMER:
${customerInfo}
- Vehicle: ${JSON.stringify((conversation.tags as any)?.vehicle_info || {})}
- Wrap preferences: ${JSON.stringify((conversation.tags as any)?.wrap_preferences || {})}
- Current quote: ${JSON.stringify((conversation.tags as any)?.quote_data || {})}
- Lead stage: ${(conversation.tags as any)?.lead_stage || 'new'}

CONVERSATION HISTORY:
${conversationHistory}

RESPOND WITH JSON:
{
  "message": "your response to send to customer",
  "reasoning": "why you chose this response (internal only)",
  "confidence": 0.0-1.0,
  "lead_stage": "updated stage if changed",
  "vehicle_info": {},
  "wrap_preferences": {},
  "should_send_quote": false,
  "should_escalate": false,
  "escalation_reason": ""
}

RULES:
- Keep SMS responses under 300 characters when possible
- Always move toward booking
- Be specific about pricing when you have the info
- Never make up information you don't have
- If asked about something outside vehicle wraps, politely redirect`

  // 7. Call Claude API
  try {
    const anthropic = new Anthropic()
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      messages: [{ role: 'user', content: inboundBody }],
      system: systemPrompt,
    })

    const rawText = (response.content[0] as any).text || '{}'
    const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
    const costCents = Math.round(tokensUsed * 0.003 * 100) / 100 // rough estimate

    // Parse JSON response
    let aiResponse: any = {}
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      aiResponse = jsonMatch ? JSON.parse(jsonMatch[0]) : { message: rawText, confidence: 0.7, reasoning: 'Raw text response' }
    } catch {
      aiResponse = { message: rawText, confidence: 0.7, reasoning: 'Failed to parse JSON' }
    }

    const confidence = aiResponse.confidence ?? 0.7
    const quoteTotal = (conversation.tags as any)?.quote_data?.total || 0

    // 8. Check escalation BEFORE responding
    const ruleCheck = checkEscalationRules(inboundBody, confidence, quoteTotal, rules)
    const shouldEscalate = ruleCheck.shouldEscalate || aiResponse.should_escalate

    if (shouldEscalate) {
      const reason = ruleCheck.reason || aiResponse.escalation_reason || 'AI-triggered escalation'

      // Update conversation status
      const existingTags = (conversation.tags as any) || {}
      await admin.from('conversations').update({
        status: 'open',
        tags: { ...existingTags, escalated: true, escalation_reason: reason },
        updated_at: new Date().toISOString(),
      }).eq('id', conversation.id)

      // Send escalation message to customer
      const escalationMsg = "Let me connect you with our team. A specialist will be with you shortly!"
      if (channel === 'sms' && conversation.contact_phone) {
        await sendSMS(conversation.contact_phone, escalationMsg)
      } else if (channel === 'email' && conversation.contact_email) {
        await sendEmail(conversation.contact_email, 'USA Wrap Co - Connecting You With Our Team', `<p>${escalationMsg}</p>`)
      }

      // Log AI message
      await admin.from('messages').insert({
        org_id: ORG_ID,
        conversation_id: conversation.id,
        direction: 'outbound',
        content: escalationMsg,
        channel,
        metadata: { ai_reasoning: `ESCALATED: ${reason}`, ai_confidence: confidence, tokens_used: tokensUsed, cost_cents: costCents },
      })

      return NextResponse.json({ status: 'escalated', reason, conversation_id: conversation.id })
    }

    // 9. Send AI response
    const aiMessage = aiResponse.message || 'Thanks for reaching out! Let me get back to you shortly.'
    let sentExternalId: string | null = null

    if (channel === 'sms' && conversation.contact_phone) {
      sentExternalId = await sendSMS(conversation.contact_phone, aiMessage)
    } else if (channel === 'email' && conversation.contact_email) {
      await sendEmail(conversation.contact_email, 'USA Wrap Co', `<p>${aiMessage}</p>`)
    }

    // 10. Log AI response
    await admin.from('messages').insert({
      org_id: ORG_ID,
      conversation_id: conversation.id,
      direction: 'outbound',
      content: aiMessage,
      channel,
      external_id: sentExternalId,
      metadata: { ai_reasoning: aiResponse.reasoning || null, ai_confidence: confidence, tokens_used: tokensUsed, cost_cents: costCents },
    })

    // 11. Update conversation with extracted info
    const existingTags2 = (conversation.tags as any) || {}
    const tagUpdates: Record<string, unknown> = {}
    if (aiResponse.lead_stage) tagUpdates.lead_stage = aiResponse.lead_stage
    if (aiResponse.vehicle_info && Object.keys(aiResponse.vehicle_info).length > 0) {
      tagUpdates.vehicle_info = { ...(existingTags2.vehicle_info || {}), ...aiResponse.vehicle_info }
    }
    if (aiResponse.wrap_preferences && Object.keys(aiResponse.wrap_preferences).length > 0) {
      tagUpdates.wrap_preferences = { ...(existingTags2.wrap_preferences || {}), ...aiResponse.wrap_preferences }
    }
    if (aiResponse.quote_data && Object.keys(aiResponse.quote_data).length > 0) {
      tagUpdates.quote_data = { ...(existingTags2.quote_data || {}), ...aiResponse.quote_data }
    }

    await admin.from('conversations').update({
      updated_at: new Date().toISOString(),
      ...(Object.keys(tagUpdates).length > 0 ? { tags: { ...existingTags2, ...tagUpdates } } : {}),
    }).eq('id', conversation.id)

    // 12. If AI wants to send a quote, trigger it
    if (aiResponse.should_send_quote) {
      fetch(new URL('/api/ai-broker/send-quote', req.url).toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': process.env.INTERNAL_API_SECRET || '',
        },
        body: JSON.stringify({ conversation_id: conversation.id }),
      }).catch(err => console.error('[VINYL] send-quote trigger failed:', err))
    }

    return NextResponse.json({
      status: 'responded',
      conversation_id: conversation.id,
      message: aiMessage,
      confidence,
      lead_stage: aiResponse.lead_stage || (conversation.tags as any)?.lead_stage || 'new',
    })
  } catch (err: any) {
    console.error('[VINYL] AI broker error:', err)
    return NextResponse.json({ error: err.message || 'AI broker failed' }, { status: 500 })
  }
}
