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
      .select('role, org_id')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
    }

    const { callId } = await req.json()
    if (!callId) {
      return NextResponse.json({ error: 'callId is required' }, { status: 400 })
    }

    const orgId = profile.org_id || ORG_ID

    // Fetch the call log
    const { data: call, error: callError } = await admin
      .from('call_logs')
      .select('*')
      .eq('id', callId)
      .eq('org_id', orgId)
      .single()

    if (callError || !call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 })
    }

    // Build analysis prompt from available call data
    const callSummary = [
      `Call ID: ${call.id}`,
      `Direction: ${call.direction || 'unknown'}`,
      `Status: ${call.status || 'unknown'}`,
      `Duration: ${call.duration_seconds ? `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s` : 'unknown'}`,
      `Caller: ${call.caller_name || 'Unknown'} (${call.caller_number || 'no number'})`,
      `Time: ${new Date(call.created_at).toLocaleString('en-US')}`,
      call.notes ? `Existing Notes: ${call.notes}` : '',
      call.recording_url ? `Recording URL available: ${call.recording_url}` : 'No recording available',
    ].filter(Boolean).join('\n')

    const prompt = `Analyze this business call for a vehicle wrap shop (USA Wrap Co):

${callSummary}

Based on the available call metadata, provide:
1. A brief assessment of this call's business importance
2. Any likely follow-up actions needed based on call direction/status/duration
3. Customer sentiment indicators (if a missed call, the urgency)
4. Priority level: high/medium/low

Return a JSON object:
{
  "summary": "Brief 1-2 sentence summary",
  "promises_made": ["array of likely commitments to follow up on"],
  "action_items": ["array of specific action items"],
  "sentiment": "positive|neutral|negative|unknown",
  "priority": "high|medium|low",
  "priority_reason": "Why this priority level"
}`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: 'You are V.I.N.Y.L., the AI chief of staff for USA Wrap Co. Analyze business calls and extract actionable intelligence. Be concise and direct. Always return valid JSON.',
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[analyze-call] Anthropic error:', errText)
      return NextResponse.json({ error: 'AI request failed' }, { status: 500 })
    }

    const aiData = await res.json()
    const rawText = aiData.content?.[0]?.text ?? ''

    let analysis: any = { summary: rawText, action_items: [], promises_made: [], sentiment: 'unknown', priority: 'medium' }
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (jsonMatch) analysis = JSON.parse(jsonMatch[0])
    } catch {}

    // Update call notes with analysis
    const analysisNote = `[V.I.N.Y.L. Analysis — ${new Date().toLocaleString('en-US')}]\n${analysis.summary}\n\nAction Items:\n${analysis.action_items?.map((a: string) => `• ${a}`).join('\n') || 'None'}`

    await admin
      .from('call_logs')
      .update({ notes: analysisNote })
      .eq('id', callId)
      .eq('org_id', orgId)

    return NextResponse.json({ analysis, callId })
  } catch (err: any) {
    console.error('[analyze-call] error:', err)
    return NextResponse.json({ error: err.message || 'Analysis failed' }, { status: 500 })
  }
}
