'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Phone, PhoneIncoming, PhoneOutgoing,
  Clock, Play, Zap, Star, TrendingUp, TrendingDown,
  CheckCircle, AlertTriangle, Loader2,
} from 'lucide-react'
import { C } from '@/lib/portal-theme'

interface CallData {
  id: string; direction: string; status: string
  caller_name: string | null; caller_number: string | null
  duration_seconds: number | null; recording_url: string | null
  notes: string | null; created_at: string
  transcription_text: string | null; transcription_status: string | null
  analysis_status: string | null
}

interface Analysis {
  id: string; score: number; sentiment: string; summary: string
  strengths: string[]; improvements: string[]; action_items: string[]
  talk_ratio: number; keywords: string[]; coaching_feedback: string
  reviewed_by_agent: boolean; created_at: string
}

const scoreColor = (s: number) =>
  s >= 80 ? C.green : s >= 60 ? C.amber : s >= 40 ? C.accent : C.red

const sentimentIcon = (s: string) => {
  if (s === 'positive') return { icon: TrendingUp, color: C.green }
  if (s === 'negative') return { icon: TrendingDown, color: C.red }
  return { icon: Phone, color: C.text2 }
}

export default function CallDetail({ call, analysis }: { call: CallData; analysis: Analysis | null }) {
  const [analyzing, setAnalyzing] = useState(false)
  const [currentAnalysis, setCurrentAnalysis] = useState(analysis)
  const [reviewed, setReviewed] = useState(analysis?.reviewed_by_agent ?? false)

  const duration = call.duration_seconds
    ? `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s`
    : 'N/A'

  const isOut = call.direction === 'outbound'

  async function runAnalysis() {
    setAnalyzing(true)
    const res = await fetch(`/api/sales-portal/calls/${call.id}/analyze`, { method: 'POST' })
    if (res.ok) {
      const { analysis: a } = await res.json()
      setCurrentAnalysis({
        ...a,
        id: call.id,
        reviewed_by_agent: false,
        created_at: new Date().toISOString(),
      })
    }
    setAnalyzing(false)
  }

  async function markReviewed() {
    setReviewed(true)
    await fetch(`/api/sales-portal/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'review_call_feedback',
        title: `Reviewed AI feedback for call with ${call.caller_name || call.caller_number || 'Unknown'}`,
        status: 'done',
      }),
    })
  }

  return (
    <div style={{ padding: '16px', maxWidth: 600, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Link href="/sales-portal/calls" style={{ color: C.text3, textDecoration: 'none' }}>
          <ArrowLeft size={20} />
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text1, fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)' }}>
            {call.caller_name || call.caller_number || 'Unknown'}
          </div>
          <div style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>
            {isOut ? 'Outbound' : 'Inbound'} &bull; {duration} &bull; {new Date(call.created_at).toLocaleString()}
          </div>
        </div>
        {currentAnalysis && (
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: `${scoreColor(currentAnalysis.score)}15`,
            border: `2px solid ${scoreColor(currentAnalysis.score)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column',
          }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: scoreColor(currentAnalysis.score), lineHeight: 1 }}>
              {currentAnalysis.score}
            </div>
          </div>
        )}
      </div>

      {/* Recording */}
      {call.recording_url && (
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: '14px 16px', marginBottom: 12,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
            Recording
          </div>
          <audio
            controls
            src={call.recording_url}
            style={{ width: '100%', height: 36 }}
          />
        </div>
      )}

      {/* Transcription */}
      {call.transcription_text && (
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: '14px 16px', marginBottom: 12,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
            Transcription
          </div>
          <div style={{
            fontSize: 12, color: C.text2, lineHeight: 1.6,
            maxHeight: 200, overflowY: 'auto',
            fontFamily: 'monospace', whiteSpace: 'pre-wrap',
          }}>
            {call.transcription_text}
          </div>
        </div>
      )}

      {/* AI Analysis */}
      {currentAnalysis ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Summary */}
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
              AI Analysis
            </div>
            <div style={{ fontSize: 13, color: C.text1, lineHeight: 1.5, marginBottom: 10 }}>
              {currentAnalysis.summary}
            </div>

            {/* Score bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1, height: 8, borderRadius: 4, background: C.surface2 }}>
                <div style={{
                  width: `${currentAnalysis.score}%`, height: '100%',
                  borderRadius: 4, background: scoreColor(currentAnalysis.score),
                  transition: 'width 0.5s',
                }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(currentAnalysis.score), fontFamily: 'JetBrains Mono, monospace' }}>
                {currentAnalysis.score}/100
              </span>
            </div>

            {/* Metrics row */}
            <div style={{ display: 'flex', gap: 12, fontSize: 11, color: C.text3 }}>
              <span>Sentiment: <span style={{ color: sentimentIcon(currentAnalysis.sentiment).color, fontWeight: 600 }}>
                {currentAnalysis.sentiment}
              </span></span>
              <span>Talk Ratio: <span style={{ color: C.text1, fontWeight: 600 }}>
                {Math.round(currentAnalysis.talk_ratio * 100)}%
              </span></span>
            </div>
          </div>

          {/* Strengths */}
          {currentAnalysis.strengths?.length > 0 && (
            <div style={{
              background: `${C.green}08`, border: `1px solid ${C.green}20`,
              borderRadius: 10, padding: '14px 16px',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                Strengths
              </div>
              {currentAnalysis.strengths.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: 12, color: C.text1 }}>
                  <CheckCircle size={14} color={C.green} style={{ flexShrink: 0, marginTop: 1 }} />
                  {s}
                </div>
              ))}
            </div>
          )}

          {/* Improvements */}
          {currentAnalysis.improvements?.length > 0 && (
            <div style={{
              background: `${C.amber}08`, border: `1px solid ${C.amber}20`,
              borderRadius: 10, padding: '14px 16px',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.amber, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                Areas to Improve
              </div>
              {currentAnalysis.improvements.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: 12, color: C.text1 }}>
                  <AlertTriangle size={14} color={C.amber} style={{ flexShrink: 0, marginTop: 1 }} />
                  {s}
                </div>
              ))}
            </div>
          )}

          {/* Coaching */}
          {currentAnalysis.coaching_feedback && (
            <div style={{
              background: `${C.purple}08`, border: `1px solid ${C.purple}20`,
              borderRadius: 10, padding: '14px 16px',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.purple, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                Coach&apos;s Notes
              </div>
              <div style={{ fontSize: 13, color: C.text1, lineHeight: 1.5 }}>
                {currentAnalysis.coaching_feedback}
              </div>
            </div>
          )}

          {/* Keywords */}
          {currentAnalysis.keywords?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {currentAnalysis.keywords.map((k, i) => (
                <span key={i} style={{
                  padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 600,
                  background: C.surface2, border: `1px solid ${C.border}`, color: C.text2,
                }}>
                  {k}
                </span>
              ))}
            </div>
          )}

          {/* Mark Reviewed */}
          {!reviewed && (
            <button
              onClick={markReviewed}
              style={{
                width: '100%', padding: '12px', borderRadius: 10,
                background: `${C.green}15`, border: `1px solid ${C.green}30`,
                color: C.green, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <CheckCircle size={16} /> Mark as Reviewed
            </button>
          )}
          {reviewed && (
            <div style={{ textAlign: 'center', fontSize: 12, color: C.green, padding: '8px' }}>
              Reviewed
            </div>
          )}
        </div>
      ) : (
        /* No analysis — offer to run */
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: '24px 16px', textAlign: 'center',
        }}>
          <Zap size={28} color={C.amber} style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text1, marginBottom: 4 }}>
            No AI Analysis Yet
          </div>
          <div style={{ fontSize: 12, color: C.text3, marginBottom: 16 }}>
            Run V.I.N.Y.L. analysis to get coaching feedback on this call
          </div>
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            style={{
              padding: '12px 28px', borderRadius: 10,
              background: analyzing ? C.surface2 : C.accent,
              color: analyzing ? C.text3 : '#fff',
              border: 'none', fontSize: 13, fontWeight: 700,
              cursor: analyzing ? 'default' : 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}
          >
            {analyzing ? <><Loader2 size={14} className="animate-spin" /> Analyzing...</> : <><Zap size={14} /> Analyze Call</>}
          </button>
        </div>
      )}

      {/* Notes */}
      {call.notes && !currentAnalysis && (
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: '14px 16px', marginTop: 12,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
            Notes
          </div>
          <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
            {call.notes}
          </div>
        </div>
      )}
    </div>
  )
}
