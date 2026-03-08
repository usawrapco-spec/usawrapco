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
    const { actionItem, entities, entityType } = await req.json()

    if (!actionItem) {
      return NextResponse.json({ error: 'actionItem is required' }, { status: 400 })
    }

    // Fetch feedback patterns for this entity type
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: feedback } = await admin
      .from('action_item_feedback')
      .select('feedback_type, suggestion_type, suggestion_label')
      .eq('org_id', orgId)
      .gte('created_at', thirtyDaysAgo)
      .limit(50)

    const accepted = (feedback || []).filter(f => f.feedback_type === 'suggestion_accepted')
    const dismissed = (feedback || []).filter(f => f.feedback_type === 'suggestion_dismissed')
    const acceptedLabels = accepted.map(f => f.suggestion_label).filter(Boolean).slice(0, 5)
    const dismissedLabels = dismissed.map(f => f.suggestion_label).filter(Boolean).slice(0, 5)

    const systemPrompt = `You are V.I.N.Y.L., the AI chief of staff for USA Wrap Co. The owner is looking at a specific action item and its referenced records. Generate 3-5 concrete suggested next steps they can take.

Return a JSON array of suggestions:
[
  {
    "label": "Send follow-up to Chance about the estimate",
    "type": "send_message|update_status|create_task|ai_draft",
    "draft": "Optional draft message content if type is send_message or ai_draft",
    "target_name": "Optional name of person/entity this targets",
    "description": "Brief 1-line description of what this action does"
  }
]

Types:
- send_message: Draft/send a message (SMS, email) to someone. Include a "draft" field with the message.
- update_status: Change status of records. Include "new_status" field.
- create_task: Create a follow-up task. Include "task_title" and optional "due_in_days".
- ai_draft: Have AI draft something (email, proposal, etc). Include "draft" field.

Be specific and actionable. Use names from the data. Keep suggestions practical.`

    const userPrompt = `ACTION ITEM: "${actionItem.text}" (Priority: ${actionItem.priority})

ENTITY TYPE: ${entityType || 'general'}

REFERENCED RECORDS:
${JSON.stringify(entities || [], null, 2)}

${acceptedLabels.length > 0 ? `\nOwner tends to accept suggestions like: ${acceptedLabels.join(', ')}` : ''}
${dismissedLabels.length > 0 ? `\nOwner tends to dismiss suggestions like: ${dismissedLabels.join(', ')}` : ''}

Generate practical next step suggestions for this action item.`

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
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[ai/action-suggest] Anthropic error:', res.status, errText)
      return NextResponse.json({ error: 'AI request failed' }, { status: 500 })
    }

    const aiData = await res.json()
    const rawText = aiData.content?.[0]?.text ?? ''

    let suggestions: any[] = []
    try {
      const jsonMatch = rawText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0])
      }
    } catch {
      suggestions = []
    }

    return NextResponse.json({ suggestions })
  } catch (err: any) {
    console.error('[ai/action-suggest] error:', err)
    return NextResponse.json({ error: err.message || 'Failed to generate suggestions' }, { status: 500 })
  }
}
