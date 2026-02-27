'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Lightbulb, AlertTriangle, Zap, X, ArrowRight } from 'lucide-react'

interface Suggestion {
  id: string
  type: 'action' | 'warning' | 'tip' | 'opportunity'
  title: string
  message: string
  action_label?: string
  action_url?: string
  priority: 'high' | 'medium' | 'low'
}

interface GenieInlineSuggestionProps {
  context: Record<string, unknown>
  maxSuggestions?: number
  compact?: boolean
}

const typeIcon = {
  action: Zap,
  warning: AlertTriangle,
  tip: Lightbulb,
  opportunity: Sparkles,
}

const typeColor = {
  action: 'var(--accent)',
  warning: 'var(--amber)',
  tip: 'var(--cyan)',
  opportunity: 'var(--green)',
}

const typeBg = {
  action: 'rgba(79,127,255,0.08)',
  warning: 'rgba(245,158,11,0.08)',
  tip: 'rgba(34,211,238,0.08)',
  opportunity: 'rgba(34,192,122,0.08)',
}

export default function GenieInlineSuggestion({ context, maxSuggestions = 2, compact = false }: GenieInlineSuggestionProps) {
  const router = useRouter()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/ai/genie-suggestion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!cancelled && data?.suggestions) {
          setSuggestions(data.suggestions.slice(0, maxSuggestions))
        }
      })
      .catch((error) => { console.error(error); })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const visible = suggestions.filter(s => !dismissed.has(s.id))
  if (visible.length === 0 && !loading) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 6 : 8 }}>
      {loading && visible.length === 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: compact ? '8px 12px' : '10px 14px',
          background: 'rgba(79,127,255,0.06)', borderRadius: 10,
          border: '1px solid rgba(79,127,255,0.15)',
        }}>
          <Sparkles size={14} style={{ color: 'var(--accent)', animation: 'pulse 1.5s infinite' }} />
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>Genie is thinking...</span>
        </div>
      )}
      {visible.map(s => {
        const Icon = typeIcon[s.type] || Lightbulb
        const color = typeColor[s.type] || 'var(--accent)'
        const bg = typeBg[s.type] || 'rgba(79,127,255,0.08)'
        return (
          <div key={s.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: compact ? '8px 12px' : '12px 14px',
            background: bg, borderRadius: 10,
            border: `1px solid ${color}25`,
          }}>
            <Icon size={14} style={{ color, marginTop: 2, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)', marginBottom: 2 }}>
                {s.title}
              </div>
              {!compact && (
                <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.4 }}>
                  {s.message}
                </div>
              )}
              {s.action_url && s.action_label && (
                <button
                  onClick={() => router.push(s.action_url!)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 11, fontWeight: 700, color, background: 'transparent',
                    border: 'none', cursor: 'pointer', padding: 0, marginTop: 4,
                  }}
                >
                  {s.action_label} <ArrowRight size={10} />
                </button>
              )}
            </div>
            <button
              onClick={() => setDismissed(prev => new Set([...Array.from(prev), s.id]))}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--text3)', padding: 2, flexShrink: 0,
              }}
            >
              <X size={12} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
