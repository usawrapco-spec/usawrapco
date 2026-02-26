import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

const PERSONA_MAP: Record<string, string> = {
  professional: 'professional, clear, and concise',
  friendly: 'warm, friendly, and conversational — like a real person texting',
  hype: 'energetic, enthusiastic, and exciting — you love wraps and make customers excited',
  brief: 'extremely brief — 1-2 sentences max, never use filler words',
}

const GOAL_MAP: Record<string, string> = {
  qualify:       'Your goal is to qualify the lead — get their vehicle (year/make/model), what service they want, and their timeline.',
  book:          'Your goal is to get them to book a consultation or schedule a time to come in.',
  send_proposal: 'Your goal is to offer to send them a formal proposal with package options.',
  just_respond:  'Just respond naturally. No specific goal — be helpful and warm.',
}

async function sendTwilioSMS(to: string, body: string) {
  const sid   = process.env.TWILIO_ACCOUNT_SID
  const auth  = process.env.TWILIO_AUTH_TOKEN
  const from  = process.env.TWILIO_PHONE_NUMBER
  if (!sid || !auth || !from) {
    console.log('[ai/auto-respond] Twilio not configured — demo mode. Would send:', body, 'to', to)
    return null
  }
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method:  'POST',
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        Authorization:   `Basic ${Buffer.from(`${sid}:${auth}`).toString('base64')}`,
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
    },
  )
  return res.ok ? await res.json() : null
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY

  let body: {
    trigger_type: string
    conversation_id: string
    customer_id?: string
    org_id?: string
    context?: { trigger_message?: string }
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { trigger_type, conversation_id, customer_id, context } = body
  const admin = getSupabaseAdmin()

  try {
    // 1. Find matching rule
    const { data: rule } = await admin
      .from('ai_comm_rules')
      .select('*')
      .eq('org_id', ORG_ID)
      .eq('trigger_type', trigger_type)
      .eq('enabled', true)
      .single()

    if (!rule || !rule.ai_enabled) {
      return NextResponse.json({ skipped: 'No active AI rule' })
    }

    // 2. Check per-thread config override
    const { data: threadConfig } = await admin
      .from('conversation_ai_config')
      .select('*')
      .eq('conversation_id', conversation_id)
      .single()

    // If AI is paused on this thread, stop
    if (threadConfig?.paused_by) {
      return NextResponse.json({ skipped: 'AI paused on this thread' })
    }

    const maxTurns = threadConfig?.max_turns ?? rule.max_ai_turns ?? 5
    const turnsUsed = threadConfig?.turns_used ?? 0

    // 3. Check turn limit — escalate
    if (turnsUsed >= maxTurns) {
      await admin.from('conversations').update({ status: 'open' }).eq('id', conversation_id)
      await admin.from('ai_message_log').insert({
        org_id: ORG_ID,
        conversation_id,
        trigger_type,
        outcome: 'escalated',
        model_used: 'escalated',
      })
      return NextResponse.json({ escalated: true })
    }

    // 4. Get conversation history
    const { data: messages } = await admin
      .from('conversation_messages')
      .select('direction, body, created_at')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: true })
      .limit(10)

    // 5. Get customer info
    const { data: customer } = customer_id
      ? await admin.from('customers').select('name, phone, email, business').eq('id', customer_id).single()
      : { data: null }

    // 6. Check last customer message for escalation keywords
    const lastInbound = (messages || []).filter(m => m.direction === 'inbound').pop()?.body || ''
    const escalationKws: string[] = threadConfig?.escalate_on_keywords ??
      rule.escalate_on_keywords ??
      ['angry', 'refund', 'cancel', 'lawsuit', 'manager']

    if (escalationKws.some(kw => lastInbound.toLowerCase().includes(kw.toLowerCase()))) {
      const escalMsg = "I'm going to have one of our team members reach out to you directly right away. Thank you for your patience!"
      if (customer?.phone) await sendTwilioSMS(customer.phone, escalMsg)
      await admin.from('conversations').update({ status: 'open' }).eq('id', conversation_id)
      await admin.from('ai_message_log').insert({
        org_id: ORG_ID, conversation_id, trigger_type, outcome: 'escalated',
        model_used: 'escalated', response_text: escalMsg,
      })
      return NextResponse.json({ escalated: true, reason: 'keyword' })
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 })
    }

    // 7. Build config (thread override > rule)
    const persona = PERSONA_MAP[threadConfig?.ai_persona ?? rule.ai_persona] ?? PERSONA_MAP.friendly
    const goal    = GOAL_MAP[threadConfig?.ai_goal ?? rule.ai_goal] ?? GOAL_MAP.just_respond
    const aiCtx   = threadConfig?.ai_context ?? rule.ai_context ?? ''

    const systemPrompt = `You are an AI texting assistant for USA Wrap Co, a premium vehicle wrap, PPF, and marine decking shop in Gig Harbor, Washington.

Your tone is ${persona}.
${goal}

Business context:
- Services: vehicle wraps, PPF, marine boat wraps, DekWave marine decking, window tinting, chrome delete
- Location: Gig Harbor / Artondale, WA — serving the entire PNW
- Premium shop — we use Inozetek vinyl and Pure PPF
- Deposit to start design: $250
- Contact: fleet@usawrapco.com

Customer: ${customer?.name || 'Unknown'}${customer?.business ? ` (${customer.business})` : ''}

${aiCtx ? `Additional instructions: ${aiCtx}` : ''}

CRITICAL RULES:
- NEVER pretend to be human if asked "are you a bot/AI?" — say "I'm the AI assistant for USA Wrap Co — a real person will follow up if needed!"
- Keep responses SHORT — this is SMS. Max 2-3 sentences.
- Never give specific pricing over text — say "I'd love to get you an exact quote, can I ask a couple quick questions?"
- If they seem angry or mention legal action, say a team member will call them shortly and stop
- NEVER send more than one message without a response from them`

    const convHistory = (messages || []).map(m => ({
      role: m.direction === 'outbound' ? 'assistant' : 'user',
      content: m.body,
    })) as { role: 'user' | 'assistant'; content: string }[]

    // 8. Call Claude
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        system: systemPrompt,
        messages: convHistory.length > 0
          ? convHistory
          : [{ role: 'user', content: context?.trigger_message || 'New inquiry' }],
      }),
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.text()
      console.error('[ai/auto-respond] Claude error:', err)
      return NextResponse.json({ error: 'AI generation failed' }, { status: 502 })
    }

    const claudeData = await claudeRes.json()
    const aiText: string = claudeData.content?.[0]?.text ?? ''

    if (!aiText) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 502 })
    }

    // 9. Send SMS
    if (customer?.phone) {
      await sendTwilioSMS(customer.phone, aiText)
    }

    // 10. Save to conversation_messages
    const { data: newMsg } = await admin
      .from('conversation_messages')
      .insert({
        conversation_id,
        direction: 'outbound',
        channel: 'sms',
        body: aiText,
        sent_by_ai: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    // 11. Log AI usage
    await admin.from('ai_message_log').insert({
      org_id: ORG_ID,
      conversation_id,
      message_id: newMsg?.id ?? null,
      rule_id: rule.id,
      trigger_type,
      model_used: 'claude-sonnet-4-6',
      prompt_tokens: claudeData.usage?.input_tokens ?? 0,
      completion_tokens: claudeData.usage?.output_tokens ?? 0,
      response_text: aiText,
    })

    // 12. Upsert turn count
    await admin.from('conversation_ai_config').upsert({
      conversation_id,
      turns_used: turnsUsed + 1,
      ai_enabled: threadConfig?.ai_enabled ?? true,
      ai_persona: threadConfig?.ai_persona ?? rule.ai_persona,
      ai_goal: threadConfig?.ai_goal ?? rule.ai_goal,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'conversation_id' })

    return NextResponse.json({ sent: aiText, turns_used: turnsUsed + 1 })
  } catch (err: any) {
    console.error('[ai/auto-respond] error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
