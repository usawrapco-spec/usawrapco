import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()

  // Gather performance data
  const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString()

  const [conversationsRes, messagesRes, projectsRes, campaignsRes] = await Promise.all([
    admin.from('conversations').select('*').eq('org_id', ORG_ID).gte('created_at', oneWeekAgo),
    admin.from('messages').select('*').gte('created_at', oneWeekAgo).order('created_at', { ascending: false }).limit(500),
    admin.from('projects').select('*').eq('org_id', ORG_ID).gte('created_at', oneWeekAgo),
    admin.from('campaigns').select('*').eq('org_id', ORG_ID),
  ])

  const conversations = (conversationsRes as any).data || []
  const messages = (messagesRes as any).data || []
  const projects = (projectsRes as any).data || []
  const campaigns = (campaignsRes as any).data || []

  // Calculate metrics
  const totalConversations = conversations.length
  const escalatedCount = conversations.filter((c: any) => c.status === 'escalated').length
  const convertedCount = conversations.filter((c: any) => c.status === 'converted').length
  const aiMessages = messages.filter((m: any) => m.role === 'ai')
  const avgConfidence = aiMessages.length > 0
    ? aiMessages.reduce((sum: number, m: any) => sum + (m.ai_confidence || 0), 0) / aiMessages.length
    : 0
  const totalCost = aiMessages.reduce((sum: number, m: any) => sum + (m.cost_cents || 0), 0) / 100

  const report = {
    period: `${oneWeekAgo.slice(0, 10)} to ${new Date().toISOString().slice(0, 10)}`,
    conversations: {
      total: totalConversations,
      escalated: escalatedCount,
      converted: convertedCount,
      escalation_rate: totalConversations > 0 ? `${Math.round((escalatedCount / totalConversations) * 100)}%` : 'N/A',
      conversion_rate: totalConversations > 0 ? `${Math.round((convertedCount / totalConversations) * 100)}%` : 'N/A',
    },
    ai_performance: {
      total_ai_messages: aiMessages.length,
      avg_confidence: avgConfidence.toFixed(2),
      total_cost: `$${totalCost.toFixed(2)}`,
      cost_per_conversation: totalConversations > 0 ? `$${(totalCost / totalConversations).toFixed(2)}` : 'N/A',
    },
    pipeline: {
      new_projects: projects.length,
      total_revenue: projects.reduce((sum: number, p: any) => sum + (p.revenue || 0), 0),
    },
    campaigns: {
      active: campaigns.filter((c: any) => c.status === 'active').length,
      total_sent: campaigns.reduce((sum: number, c: any) => sum + (c.stats?.sent || 0), 0),
      total_replies: campaigns.reduce((sum: number, c: any) => sum + (c.stats?.replied || 0), 0),
    },
  }

  // Ask AI for improvement suggestions
  try {
    const anthropic = new Anthropic()
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `You are analyzing the weekly performance of V.I.N.Y.L., an AI sales broker for USA Wrap Co.

Performance data:
${JSON.stringify(report, null, 2)}

Provide specific, actionable recommendations to improve:
1. Reduce escalation rate
2. Increase conversion rate
3. Reduce cost per conversation
4. Improve campaign effectiveness

Return JSON:
{
  "summary": "one paragraph overview",
  "recommendations": [
    {"area": "area", "action": "specific action", "expected_impact": "what this will improve", "priority": "high|medium|low"}
  ],
  "playbook_updates": [
    {"category": "category_name", "suggestion": "new guidance to add to playbook"}
  ],
  "campaign_adjustments": [
    {"adjustment": "what to change", "reason": "why"}
  ]
}`,
      }],
    })

    const text = (response.content[0] as any).text || '{}'
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {}

    // Log this analysis
    await admin.from('activity_log').insert({
      org_id: ORG_ID,
      actor_type: 'ai',
      actor_name: 'V.I.N.Y.L. Self-Improve',
      action: 'weekly_analysis',
      details: JSON.stringify({ report, analysis }),
      metadata: { type: 'self_improve' },
    })

    return NextResponse.json({ report, analysis })
  } catch (err: any) {
    return NextResponse.json({ report, analysis: null, error: err.message }, { status: 200 })
  }
}
