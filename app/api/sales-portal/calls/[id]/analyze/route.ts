import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    if (!profile || !['sales_agent', 'admin', 'owner'].includes(profile.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 500 })

    const callId = params.id

    // Fetch call
    const { data: call } = await admin
      .from('call_logs')
      .select('*')
      .eq('id', callId)
      .eq('org_id', profile.org_id)
      .single()

    if (!call) return NextResponse.json({ error: 'Call not found' }, { status: 404 })

    // Mark as analyzing
    await admin.from('call_logs')
      .update({ analysis_status: 'processing' })
      .eq('id', callId)

    // Build context
    const duration = call.duration_seconds
      ? `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s`
      : 'unknown'

    const callInfo = [
      `Direction: ${call.direction || 'outbound'}`,
      `Duration: ${duration}`,
      `Customer: ${call.caller_name || 'Unknown'} (${call.caller_number || 'no number'})`,
      `Time: ${new Date(call.created_at).toLocaleString('en-US')}`,
      `Status: ${call.status || 'unknown'}`,
      call.notes ? `Agent Notes: ${call.notes}` : '',
      call.transcription_text ? `\nTranscription:\n${call.transcription_text}` : '',
    ].filter(Boolean).join('\n')

    const hasTranscript = !!call.transcription_text

    const prompt = `Analyze this sales call made by a sales agent at USA Wrap Co (a vehicle wrap shop).

${callInfo}

${hasTranscript ? 'A full transcription is provided above.' : 'No transcription is available — analyze based on metadata only.'}

Provide a comprehensive sales coaching analysis. Return a JSON object:
{
  "summary": "2-3 sentence summary of the call",
  "score": <number 0-100, overall performance score>,
  "sentiment": "positive|neutral|negative|mixed",
  "strengths": ["specific things the agent did well"],
  "improvements": ["specific areas to improve"],
  "action_items": ["follow-up actions needed"],
  "talk_ratio": <number 0-1, estimated agent talk ratio, 0.5 = balanced>,
  "keywords": ["key topics discussed"],
  "coaching_feedback": "2-3 sentences of personalized coaching advice for this agent"
}

${hasTranscript
  ? 'Evaluate: rapport building, needs discovery, objection handling, closing technique, product knowledge, professionalism.'
  : 'Since no transcript is available, score based on call duration and outcome. Short calls or no-answers score lower. Longer completed calls score higher. Provide general coaching tips.'
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
        max_tokens: 1500,
        system: 'You are V.I.N.Y.L., an expert AI sales coach for USA Wrap Co. You analyze sales calls and provide actionable, encouraging feedback to help agents improve. Always return valid JSON.',
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      await admin.from('call_logs').update({ analysis_status: 'failed' }).eq('id', callId)
      return NextResponse.json({ error: 'AI request failed' }, { status: 500 })
    }

    const aiData = await res.json()
    const rawText = aiData.content?.[0]?.text ?? ''

    let analysis: any = {
      summary: rawText, score: 50, sentiment: 'neutral',
      strengths: [], improvements: [], action_items: [],
      talk_ratio: 0.5, keywords: [], coaching_feedback: '',
    }
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (jsonMatch) analysis = { ...analysis, ...JSON.parse(jsonMatch[0]) }
    } catch {}

    // Save to call_analyses
    await admin.from('call_analyses').upsert({
      org_id: profile.org_id,
      call_log_id: callId,
      agent_id: user.id,
      transcription: call.transcription_text || null,
      summary: analysis.summary,
      sentiment: analysis.sentiment,
      score: Math.min(100, Math.max(0, analysis.score)),
      strengths: analysis.strengths,
      improvements: analysis.improvements,
      action_items: analysis.action_items,
      talk_ratio: analysis.talk_ratio,
      keywords: analysis.keywords,
      coaching_feedback: analysis.coaching_feedback,
      reviewed_by_agent: false,
    }, { onConflict: 'call_log_id' })

    // Update call_logs status
    await admin.from('call_logs')
      .update({ analysis_status: 'complete' })
      .eq('id', callId)

    // Auto-generate tasks from action items
    if (analysis.action_items?.length > 0) {
      const tasks = analysis.action_items.slice(0, 3).map((item: string) => ({
        org_id: profile.org_id,
        agent_id: user.id,
        task_date: new Date().toISOString().split('T')[0],
        type: 'follow_up',
        title: item,
        description: `From call analysis: ${analysis.summary?.substring(0, 100)}`,
        related_call_id: callId,
        priority: 'normal',
        status: 'pending',
      }))
      await admin.from('agent_daily_tasks').insert(tasks)
    }

    return NextResponse.json({ analysis, callId })
  } catch (err: any) {
    console.error('[sales-portal/calls/analyze] error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
