'use client'

import { Eye, Sparkles } from 'lucide-react'

interface TrafficSegment {
  name: string
  vehiclesPerHour: number
  speed: number
  impressions: number
  color: string
}

interface TrafficAnalysisProps {
  analysis: {
    totalImpressions: number
    segments: TrafficSegment[]
    suggestion: string
    boostAmount?: number
  }
}

export default function TrafficAnalysis({ analysis }: TrafficAnalysisProps) {
  const { totalImpressions, segments, suggestion, boostAmount } = analysis
  const maxImpressions = Math.max(...segments.map(s => s.impressions), 1)

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: 20,
    }}>
      {/* Big Impression Number */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          marginBottom: 6,
        }}>
          <Eye size={14} style={{ color: 'var(--text3)' }} />
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text3)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            Estimated Daily Impressions
          </span>
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 40,
          fontWeight: 900,
          color: 'var(--green)',
          lineHeight: 1.1,
        }}>
          {totalImpressions.toLocaleString()}
        </div>
        {boostAmount != null && boostAmount > 0 && (
          <div style={{
            fontSize: 12,
            color: 'var(--cyan)',
            marginTop: 4,
          }}>
            +{boostAmount.toLocaleString()} from peak hours
          </div>
        )}
      </div>

      {/* Segment Breakdown */}
      {segments.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text3)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 12,
          }}>
            Segment Breakdown
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {segments.map((seg, i) => (
              <div key={i}>
                {/* Segment header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 4,
                }}>
                  <span style={{ fontSize: 13, color: 'var(--text1)', fontWeight: 600 }}>
                    {seg.name}
                  </span>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 13,
                    fontWeight: 700,
                    color: seg.color,
                  }}>
                    {seg.impressions.toLocaleString()}
                  </span>
                </div>

                {/* Colored bar */}
                <div style={{
                  height: 20,
                  borderRadius: 4,
                  background: 'rgba(255,255,255,0.04)',
                  overflow: 'hidden',
                  marginBottom: 4,
                }}>
                  <div style={{
                    height: '100%',
                    width: `${(seg.impressions / maxImpressions) * 100}%`,
                    borderRadius: 4,
                    background: seg.color,
                    opacity: 0.8,
                    transition: 'width 0.5s ease',
                    minWidth: 4,
                  }} />
                </div>

                {/* Stats under bar */}
                <div style={{
                  display: 'flex',
                  gap: 16,
                  fontSize: 11,
                  color: 'var(--text3)',
                }}>
                  <span>
                    {seg.vehiclesPerHour.toLocaleString()} vehicles/hr
                  </span>
                  <span>
                    {seg.speed} mph avg
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Suggestion */}
      {suggestion && (
        <div style={{
          background: 'rgba(139,92,246,0.08)',
          border: '1px solid rgba(139,92,246,0.2)',
          borderRadius: 10,
          padding: 12,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 4,
          }}>
            <Sparkles size={12} style={{ color: 'var(--purple)' }} />
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--purple)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              AI Insight
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>
            {suggestion}
          </div>
        </div>
      )}
    </div>
  )
}
