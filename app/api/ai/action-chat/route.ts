import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { ORG_ID } from '@/lib/org'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getSupabaseAdmin()
    const { data: profile } = await admin
      .from('profiles')
      .select('role, org_id, name')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
    }

    const orgId = profile.org_id || ORG_ID
    const { message, recapId, itemId, actionItem, entities, entityType, sessionId } = await req.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Load or create session
    let session: any = null
    if (sessionId) {
      const { data } = await admin
        .from('action_item_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('org_id', orgId)
        .single()
      session = data
    }

    const history = (session?.messages || []) as { role: string; content: string }[]

    const systemPrompt = `You are V.I.N.Y.L., the AI chief of staff for USA Wrap Co. You are helping the owner with a specific action item from their daily brief.

ACTION ITEM: "${actionItem?.text || 'Unknown'}" (Priority: ${actionItem?.priority || 'medium'})
ENTITY TYPE: ${entityType || 'general'}

REFERENCED RECORDS:
${JSON.stringify(entities || [], null, 2)}

Help the owner take action on this item. You can:
- Draft messages (SMS, email) to customers or team members
- Suggest status changes for records
- Recommend follow-up tasks
- Provide analysis of the situation
- Answer questions about the records

Be concise, direct, and practical. Use names and amounts from the data. When drafting messages, make them professional but friendly.`

    const messages = [
      ...history.map((m: any) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: message },
    ]

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: systemPrompt,
        messages,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[ai/action-chat] Anthropic error:', res.status, errText)
      return NextResponse.json({ error: 'AI request failed' }, { status: 500 })
    }

    const aiData = await res.json()
    const responseText = aiData.content?.[0]?.text ?? ''

    // Persist messages to session
    const updatedMessages = [
      ...history,
      { role: 'user', content: message },
      { role: 'assistant', content: responseText },
    ]

    let savedSessionId = sessionId
    if (session) {
      await admin
        .from('action_item_sessions')
        .update({ messages: updatedMessages, updated_at: new Date().toISOString() })
        .eq('id', session.id)
    } else {
      const { data: newSession } = await admin
        .from('action_item_sessions')
        .insert({
          org_id: orgId,
          user_id: user.id,
          recap_id: recapId,
          action_item_id: itemId,
          messages: updatedMessages,
          entity_context: { entityType, entityCount: entities?.length || 0 },
        })
        .select('id')
        .single()
      savedSessionId = newSession?.id
    }

    return NextResponse.json({
      response: responseText,
      sessionId: savedSessionId,
    })
  } catch (err: any) {
    console.error('[ai/action-chat] error:', err)
    return NextResponse.json({ error: err.message || 'Chat failed' }, { status: 500 })
  }
}
