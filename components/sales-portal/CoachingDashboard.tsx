'use client'

import { useMemo } from 'react'
import {
  TrendingUp, Target, Mic, Brain, Star,
  CheckCircle, AlertTriangle,
} from 'lucide-react'
import { C } from '@/lib/portal-theme'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
  BarChart, Bar, Cell, PieChart, Pie,
} from 'recharts'

interface Analysis {
  score: number; sentiment: string
  strengths: string[]; improvements: string[]
  keywords: string[]; talk_ratio: number
  coaching_feedback: string; created_at: string
}

const scoreColor = (s: number) =>
  s >= 80 ? C.green : s >= 60 ? C.amber : s >= 40 ? C.accent : C.red

export default function CoachingDashboard({ analyses }: { analyses: Analysis[] }) {
  const stats = useMemo(() => {
    if (analyses.length === 0) return null

    const avgScore = Math.round(analyses.reduce((s, a) => s + a.score, 0) / analyses.length)
    const avgTalkRatio = +(analyses.reduce((s, a) => s + (a.talk_ratio || 0.5), 0) / analyses.length).toFixed(2)

    // Sentiment distribution
    const sentiments = { positive: 0, neutral: 0, negative: 0, mixed: 0 }
    analyses.forEach(a => { if (a.sentiment in sentiments) (sentiments as any)[a.sentiment]++ })

    // Daily scores
    const dayMap = new Map<string, number[]>()
    analyses.forEach(a => {
      const d = new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      if (!dayMap.has(d)) dayMap.set(d, [])
      dayMap.get(d)!.push(a.score)
    })
    const dailyScores = [...dayMap.entries()].map(([date, scores]) => ({
      date,
      score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    }))

    // Top strengths/improvements
    const sCount = new Map<string, number>()
    const iCount = new Map<string, number>()
    analyses.forEach(a => {
      (a.strengths || []).forEach(s => sCount.set(s, (sCount.get(s) || 0) + 1))
      ;(a.improvements || []).forEach(s => iCount.set(s, (iCount.get(s) || 0) + 1))
    })
    const topStrengths = [...sCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    const topImprovements = [...iCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

    // Recent feedback
    const latestFeedback = analyses.slice(-3).reverse()
      .map(a => a.coaching_feedback).filter(Boolean)

    // Score trend (first half vs second half)
    const mid = Math.floor(analyses.length / 2)
    const firstHalf = analyses.slice(0, mid)
    const secondHalf = analyses.slice(mid)
    const firstAvg = firstHalf.length > 0 ? Math.round(firstHalf.reduce((s, a) => s + a.score, 0) / firstHalf.length) : 0
    const secondAvg = secondHalf.length > 0 ? Math.round(secondHalf.reduce((s, a) => s + a.score, 0) / secondHalf.length) : 0
    const trend = secondAvg - firstAvg

    return { avgScore, avgTalkRatio, sentiments, dailyScores, topStrengths, topImprovements, latestFeedback, trend }
  }, [analyses])

  if (!stats || analyses.length === 0) {
    return (
      <div style={{ padding: '20px 16px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text1, margin: '0 0 4px', fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)' }}>
          AI Coaching
        </h1>
        <div style={{ padding: '60px 20px', color: C.text3 }}>
          <Brain size={40} strokeWidth={1} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div style={{ fontSize: 14, color: C.text2, marginBottom: 4 }}>No coaching data yet</div>
          <div style={{ fontSize: 12 }}>Make calls and run AI analysis to see your coaching insights</div>
        </div>
      </div>
    )
  }

  const sentimentData = Object.entries(stats.sentiments)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({
      name,
      value,
      color: name === 'positive' ? C.green : name === 'negative' ? C.red : name === 'mixed' ? C.amber : C.text2,
    }))

  return (
    <div style={{ padding: '20px 16px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text1, margin: '0 0 4px', fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)' }}>
        AI Coaching
      </h1>
      <p style={{ fontSize: 13, color: C.text3, margin: '0 0 16px' }}>
        Last 30 days &bull; {analyses.length} calls analyzed
      </p>

      {/* Top Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 10px', textAlign: 'center' }}>
          <Target size={16} color={scoreColor(stats.avgScore)} style={{ marginBottom: 4 }} />
          <div style={{ fontSize: 22, fontWeight: 700, color: scoreColor(stats.avgScore), fontFamily: 'JetBrains Mono, monospace' }}>
            {stats.avgScore}
          </div>
          <div style={{ fontSize: 10, color: C.text3, textTransform: 'uppercase' }}>Avg Score</div>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 10px', textAlign: 'center' }}>
          <TrendingUp size={16} color={stats.trend >= 0 ? C.green : C.red} style={{ marginBottom: 4 }} />
          <div style={{ fontSize: 22, fontWeight: 700, color: stats.trend >= 0 ? C.green : C.red, fontFamily: 'JetBrains Mono, monospace' }}>
            {stats.trend >= 0 ? '+' : ''}{stats.trend}
          </div>
          <div style={{ fontSize: 10, color: C.text3, textTransform: 'uppercase' }}>Trend</div>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 10px', textAlign: 'center' }}>
          <Mic size={16} color={C.accent} style={{ marginBottom: 4 }} />
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text1, fontFamily: 'JetBrains Mono, monospace' }}>
            {Math.round(stats.avgTalkRatio * 100)}%
          </div>
          <div style={{ fontSize: 10, color: C.text3, textTransform: 'uppercase' }}>Talk Ratio</div>
        </div>
      </div>

      {/* Score Trend Chart */}
      {stats.dailyScores.length > 1 && (
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: '14px 16px', marginBottom: 16,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
            Score Trend
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={stats.dailyScores}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.text3 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: C.text3 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                contentStyle={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: C.text1 }}
              />
              <Line type="monotone" dataKey="score" stroke={C.accent} strokeWidth={2} dot={{ fill: C.accent, r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Sentiment Breakdown */}
      {sentimentData.length > 0 && (
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: '14px 16px', marginBottom: 16,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
            Call Sentiment
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ResponsiveContainer width={100} height={100}>
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%" cy="50%"
                  innerRadius={25} outerRadius={45}
                  dataKey="value"
                  stroke="none"
                >
                  {sentimentData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {sentimentData.map(s => (
                <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                  <span style={{ color: C.text2, textTransform: 'capitalize', flex: 1 }}>{s.name}</span>
                  <span style={{ color: C.text1, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Strengths & Improvements */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        <div style={{
          background: `${C.green}08`, border: `1px solid ${C.green}20`,
          borderRadius: 10, padding: '14px 12px',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
            Top Strengths
          </div>
          {stats.topStrengths.map(([text, count], i) => (
            <div key={i} style={{ fontSize: 11, color: C.text1, marginBottom: 4, display: 'flex', gap: 4, alignItems: 'flex-start' }}>
              <CheckCircle size={12} color={C.green} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ flex: 1 }}>{text}</span>
            </div>
          ))}
          {stats.topStrengths.length === 0 && (
            <div style={{ fontSize: 11, color: C.text3 }}>No data yet</div>
          )}
        </div>
        <div style={{
          background: `${C.amber}08`, border: `1px solid ${C.amber}20`,
          borderRadius: 10, padding: '14px 12px',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.amber, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
            Focus Areas
          </div>
          {stats.topImprovements.map(([text, count], i) => (
            <div key={i} style={{ fontSize: 11, color: C.text1, marginBottom: 4, display: 'flex', gap: 4, alignItems: 'flex-start' }}>
              <AlertTriangle size={12} color={C.amber} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ flex: 1 }}>{text}</span>
            </div>
          ))}
          {stats.topImprovements.length === 0 && (
            <div style={{ fontSize: 11, color: C.text3 }}>No data yet</div>
          )}
        </div>
      </div>

      {/* Latest Feedback */}
      {stats.latestFeedback.length > 0 && (
        <div style={{
          background: `${C.purple}08`, border: `1px solid ${C.purple}20`,
          borderRadius: 10, padding: '14px 16px',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.purple, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
            Recent Coaching Notes
          </div>
          {stats.latestFeedback.map((fb, i) => (
            <div key={i} style={{
              fontSize: 12, color: C.text1, lineHeight: 1.5,
              padding: '8px 0',
              borderTop: i > 0 ? `1px solid ${C.purple}15` : 'none',
            }}>
              {fb}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
