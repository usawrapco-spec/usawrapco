'use client'

import { useState, useEffect } from 'react'
import { Sparkles, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'

interface AIBriefingProps {
  orgId: string
  profileId: string
}

interface BriefingData {
  summary: string[]
  timestamp: string
}

export default function AIBriefing({ orgId, profileId }: AIBriefingProps) {
  const [briefing, setBriefing] = useState<BriefingData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    // Check if we already have today's briefing in localStorage
    const today = new Date().toISOString().split('T')[0]
    const key = `usawrap_briefing_${today}_${profileId}`
    const cached = localStorage.getItem(key)

    if (cached) {
      try {
        setBriefing(JSON.parse(cached))
      } catch {
        // If cached data is invalid, fetch new
        fetchBriefing()
      }
    } else {
      fetchBriefing()
    }
  }, [orgId, profileId])

  async function fetchBriefing() {
    setLoading(true)
    setError(false)

    try {
      const res = await fetch('/api/ai/daily-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, profileId }),
      })

      if (!res.ok) throw new Error('Briefing fetch failed')

      const data = await res.json()
      const briefingData: BriefingData = {
        summary: data.summary || [],
        timestamp: new Date().toISOString(),
      }

      setBriefing(briefingData)

      // Cache for today
      const today = new Date().toISOString().split('T')[0]
      const key = `usawrap_briefing_${today}_${profileId}`
      localStorage.setItem(key, JSON.stringify(briefingData))

      setLoading(false)
    } catch (err) {
      console.error('AI Briefing error:', err)
      setError(true)
      setLoading(false)
    }
  }

  if (loading && !briefing) {
    return (
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '20px 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Sparkles size={18} style={{ color: 'var(--accent)' }} />
          <div style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 16,
            fontWeight: 900,
            color: 'var(--text1)',
          }}>
            AI Morning Briefing
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 16,
            height: 16,
            border: '2px solid var(--accent)',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
          }} />
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>
            Analyzing today's schedule...
          </div>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (error && !briefing) {
    return (
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '20px 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Sparkles size={18} style={{ color: 'var(--accent)' }} />
            <div style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              fontSize: 16,
              fontWeight: 900,
              color: 'var(--text1)',
            }}>
              AI Morning Briefing
            </div>
          </div>
          <button
            onClick={fetchBriefing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--text2)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={12} />
            Retry
          </button>
        </div>
        <div style={{
          fontSize: 13,
          color: 'var(--text3)',
          padding: '12px 16px',
          background: 'rgba(242,90,90,0.08)',
          border: '1px solid rgba(242,90,90,0.2)',
          borderRadius: 8,
        }}>
          Unable to generate briefing. Click retry or check back later.
        </div>
      </div>
    )
  }

  if (!briefing) return null

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '20px 24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Sparkles size={18} style={{ color: 'var(--accent)' }} />
          <div style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 16,
            fontWeight: 900,
            color: 'var(--text1)',
          }}>
            Today's Briefing
          </div>
          <div style={{
            fontSize: 10,
            color: 'var(--text3)',
            fontFamily: "'JetBrains Mono', monospace",
            padding: '2px 8px',
            background: 'rgba(79,127,255,0.1)',
            borderRadius: 4,
          }}>
            AI-Generated
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={fetchBriefing}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--text2)',
              fontSize: 12,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            <RotateCcw size={12} />
            Refresh
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '6px',
              background: 'transparent',
              border: 'none',
              borderRadius: 6,
              color: 'var(--text2)',
              cursor: 'pointer',
            }}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {briefing.summary.length === 0 ? (
            <div style={{
              fontSize: 13,
              color: 'var(--text3)',
              padding: '12px 16px',
              background: 'var(--surface2)',
              borderRadius: 8,
              fontStyle: 'italic',
            }}>
              All clear! No urgent items for today.
            </div>
          ) : (
            briefing.summary.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '12px 16px',
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                }}
              >
                <div style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  marginTop: 6,
                  flexShrink: 0,
                }} />
                <div style={{
                  fontSize: 13,
                  color: 'var(--text1)',
                  lineHeight: 1.5,
                  flex: 1,
                }}>
                  {item}
                </div>
              </div>
            ))
          )}

          <div style={{
            marginTop: 4,
            fontSize: 11,
            color: 'var(--text3)',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            Generated {new Date(briefing.timestamp).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </div>
        </div>
      )}
    </div>
  )
}
