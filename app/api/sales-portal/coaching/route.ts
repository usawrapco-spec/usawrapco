import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
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

    if (!profile || !['sales_agent', 'admin', 'owner'].includes(profile.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const url = new URL(req.url)
    const days = parseInt(url.searchParams.get('days') || '30')

    const since = new Date()
    since.setDate(since.getDate() - days)

    // Get all analyses for this agent in the time range
    const { data: analyses } = await admin
      .from('call_analyses')
      .select('score, sentiment, strengths, improvements, keywords, talk_ratio, coaching_feedback, created_at')
      .eq('agent_id', user.id)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: true })

    const all = analyses || []

    // Calculate trends
    const avgScore = all.length > 0
      ? Math.round(all.reduce((s, a) => s + (a.score || 0), 0) / all.length)
      : 0

    const avgTalkRatio = all.length > 0
      ? +(all.reduce((s, a) => s + (a.talk_ratio || 0.5), 0) / all.length).toFixed(2)
      : 0.5

    // Sentiment distribution
    const sentiments = { positive: 0, neutral: 0, negative: 0, mixed: 0 }
    all.forEach(a => { if (a.sentiment && sentiments.hasOwnProperty(a.sentiment)) (sentiments as any)[a.sentiment]++ })

    // Daily scores for chart
    const dailyScores: { date: string; score: number; count: number }[] = []
    const dayMap = new Map<string, number[]>()
    all.forEach(a => {
      const d = new Date(a.created_at).toISOString().split('T')[0]
      if (!dayMap.has(d)) dayMap.set(d, [])
      dayMap.get(d)!.push(a.score || 0)
    })
    dayMap.forEach((scores, date) => {
      dailyScores.push({
        date,
        score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        count: scores.length,
      })
    })

    // Top strengths and improvements (frequency count)
    const strengthCount = new Map<string, number>()
    const improvementCount = new Map<string, number>()
    all.forEach(a => {
      (a.strengths || []).forEach((s: string) => strengthCount.set(s, (strengthCount.get(s) || 0) + 1))
      ;(a.improvements || []).forEach((s: string) => improvementCount.set(s, (improvementCount.get(s) || 0) + 1))
    })

    const topStrengths = [...strengthCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([text, count]) => ({ text, count }))

    const topImprovements = [...improvementCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([text, count]) => ({ text, count }))

    return NextResponse.json({
      totalCalls: all.length,
      avgScore,
      avgTalkRatio,
      sentiments,
      dailyScores,
      topStrengths,
      topImprovements,
      latestFeedback: all.slice(-3).reverse().map(a => a.coaching_feedback).filter(Boolean),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
