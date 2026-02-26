'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Brain, RefreshCw, ChevronDown, ChevronUp, Square, CheckSquare,
  AlertTriangle, AlertCircle, Info, Plus, Trash2, ExternalLink,
  Clock, Sparkles,
} from 'lucide-react'

interface BriefSection {
  title: string
  level: 'critical' | 'warning' | 'info'
  items: string[]
}

interface ActionItem {
  id: string
  text: string
  priority: 'high' | 'medium' | 'low'
}

interface Instruction {
  id: string
  value: string
  created_at: string
}

interface Props {
  orgId: string
  ownerName: string
  profileId: string
}

function sectionColor(level: string) {
  if (level === 'critical') return { icon: AlertTriangle, color: '#f25a5a', bg: 'rgba(242,90,90,0.08)', border: 'rgba(242,90,90,0.2)' }
  if (level === 'warning') return { icon: AlertCircle, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' }
  return { icon: Info, color: '#4f7fff', bg: 'rgba(79,127,255,0.08)', border: 'rgba(79,127,255,0.2)' }
}

function priorityColor(p: string) {
  if (p === 'high') return '#f25a5a'
  if (p === 'medium') return '#f59e0b'
  return '#22c07a'
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function VinylDailyBrief({ ownerName, profileId }: Props) {
  const [sections, setSections] = useState<BriefSection[]>([])
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [recapId, setRecapId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [doneItems, setDoneItems] = useState<Set<string>>(new Set())
  const [showActions, setShowActions] = useState(true)
  const [instructions, setInstructions] = useState<Instruction[]>([])
  const [trainInput, setTrainInput] = useState('')
  const [trainLoading, setTrainLoading] = useState(false)

  // Load done items from localStorage
  useEffect(() => {
    if (!recapId) return
    try {
      const stored = localStorage.getItem(`vinyl_done_${recapId}`)
      if (stored) setDoneItems(new Set(JSON.parse(stored)))
    } catch {}
  }, [recapId])

  function persistDone(updated: Set<string>) {
    if (!recapId) return
    try { localStorage.setItem(`vinyl_done_${recapId}`, JSON.stringify([...updated])) } catch {}
  }

  function toggleDone(itemId: string) {
    setDoneItems(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      persistDone(next)
      return next
    })
  }

  const loadRecap = useCallback(async (force = false) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/recap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      })
      if (!res.ok) throw new Error('Failed to load brief')
      const data = await res.json()
      setSections(data.sections || [])
      setActionItems(data.action_items || [])
      setGeneratedAt(data.generated_at)
      setRecapId(data.id)
      // Default: expand all sections
      const expanded: Record<string, boolean> = {}
      ;(data.sections || []).forEach((_: any, i: number) => { expanded[i] = true })
      setExpandedSections(expanded)
    } catch (e: any) {
      setError(e.message || 'Failed to generate brief')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadInstructions = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/train')
      if (res.ok) {
        const data = await res.json()
        setInstructions(data.instructions || [])
      }
    } catch {}
  }, [])

  useEffect(() => {
    loadRecap()
    loadInstructions()
  }, [loadRecap, loadInstructions])

  async function saveInstruction() {
    if (!trainInput.trim()) return
    setTrainLoading(true)
    try {
      const res = await fetch('/api/ai/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: trainInput }),
      })
      if (res.ok) {
        setTrainInput('')
        await loadInstructions()
      }
    } finally {
      setTrainLoading(false)
    }
  }

  async function deleteInstruction(id: string) {
    try {
      await fetch(`/api/ai/train/${id}`, { method: 'DELETE' })
      await loadInstructions()
    } catch {}
  }

  const pendingCount = actionItems.filter(a => !doneItems.has(a.id)).length
  const criticalSections = sections.filter(s => s.level === 'critical')

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(79,127,255,0.06) 0%, rgba(139,92,246,0.06) 100%)',
      border: '1px solid rgba(79,127,255,0.2)',
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 24,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(13,15,20,0.5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #4f7fff, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Brain size={16} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontFamily: 'Barlow Condensed, sans-serif',
                fontWeight: 900, fontSize: 16,
                color: 'var(--text1)', letterSpacing: '0.04em',
              }}>
                V.I.N.Y.L. DAILY BRIEF
              </span>
              {criticalSections.length > 0 && (
                <span style={{
                  background: 'rgba(242,90,90,0.2)',
                  border: '1px solid rgba(242,90,90,0.4)',
                  color: '#f25a5a', fontSize: 10, fontWeight: 700,
                  padding: '1px 6px', borderRadius: 4, letterSpacing: '0.06em',
                }}>
                  {criticalSections.length} CRITICAL
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
              {greeting()}, {ownerName?.split(' ')[0] || 'Owner'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {generatedAt && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text3)' }}>
              <Clock size={11} />
              {new Date(generatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </div>
          )}
          <button
            onClick={() => loadRecap(true)}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text2)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <RefreshCw size={11} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? 'Refreshing...' : 'Refresh Brief'}
          </button>
          <Link href="/ai" style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '5px 10px', borderRadius: 6,
            background: 'rgba(79,127,255,0.15)',
            border: '1px solid rgba(79,127,255,0.3)',
            color: '#4f7fff', fontSize: 11, fontWeight: 600,
            textDecoration: 'none',
          }}>
            <ExternalLink size={11} />
            Full View
          </Link>
        </div>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading && !sections.length && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text3)', fontSize: 13 }}>
            <Sparkles size={20} style={{ marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
            V.I.N.Y.L. is analyzing your business...
          </div>
        )}

        {error && (
          <div style={{ padding: '12px 16px', background: 'rgba(242,90,90,0.08)', borderRadius: 8, fontSize: 13, color: '#f25a5a' }}>
            {error}
          </div>
        )}

        {/* Brief Sections */}
        {sections.map((section, idx) => {
          const { icon: SIcon, color, bg, border } = sectionColor(section.level)
          const isOpen = expandedSections[idx] !== false
          return (
            <div key={idx} style={{ border: `1px solid ${border}`, borderRadius: 10, overflow: 'hidden' }}>
              <button
                onClick={() => setExpandedSections(p => ({ ...p, [idx]: !p[idx] }))}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', background: bg, border: 'none', cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <SIcon size={14} color={color} />
                  <span style={{ fontSize: 12, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {section.title}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: "'JetBrains Mono', monospace" }}>
                    ({section.items?.length || 0})
                  </span>
                </div>
                {isOpen ? <ChevronUp size={13} color="var(--text3)" /> : <ChevronDown size={13} color="var(--text3)" />}
              </button>
              {isOpen && (
                <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6, background: 'rgba(0,0,0,0.15)' }}>
                  {(section.items || []).map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--text1)', lineHeight: 1.5 }}>
                      <div style={{ width: 4, height: 4, borderRadius: '50%', background: color, marginTop: 7, flexShrink: 0 }} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* Action Items */}
        {actionItems.length > 0 && (
          <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden' }}>
            <button
              onClick={() => setShowActions(p => !p)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: 'none', cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckSquare size={14} color="#22c07a" />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Action Items
                </span>
                {pendingCount > 0 && (
                  <span style={{
                    background: 'rgba(34,192,122,0.15)', border: '1px solid rgba(34,192,122,0.3)',
                    color: '#22c07a', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                  }}>
                    {pendingCount} pending
                  </span>
                )}
              </div>
              {showActions ? <ChevronUp size={13} color="var(--text3)" /> : <ChevronDown size={13} color="var(--text3)" />}
            </button>
            {showActions && (
              <div style={{ padding: '8px 14px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {actionItems.map(item => {
                  const done = doneItems.has(item.id)
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleDone(item.id)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '7px 10px', borderRadius: 7,
                        background: done ? 'rgba(34,192,122,0.04)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${done ? 'rgba(34,192,122,0.15)' : 'rgba(255,255,255,0.05)'}`,
                        cursor: 'pointer', textAlign: 'left', width: '100%',
                      }}
                    >
                      {done
                        ? <CheckSquare size={14} color="#22c07a" style={{ flexShrink: 0, marginTop: 1 }} />
                        : <Square size={14} color="var(--text3)" style={{ flexShrink: 0, marginTop: 1 }} />
                      }
                      <div style={{ flex: 1 }}>
                        <span style={{
                          fontSize: 12.5, color: done ? 'var(--text3)' : 'var(--text1)',
                          textDecoration: done ? 'line-through' : 'none',
                        }}>
                          {item.text}
                        </span>
                      </div>
                      <div style={{
                        fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                        color: priorityColor(item.priority),
                        background: `${priorityColor(item.priority)}18`,
                        flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>
                        {item.priority}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Train V.I.N.Y.L. */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingTop: 12, marginTop: 4,
        }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Train V.I.N.Y.L.
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              value={trainInput}
              onChange={e => setTrainInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveInstruction()}
              placeholder={`e.g. "Always alert me when a customer hasn't been contacted in 3 days"`}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7,
                padding: '7px 12px', color: 'var(--text1)', fontSize: 12, outline: 'none',
              }}
            />
            <button
              onClick={saveInstruction}
              disabled={trainLoading || !trainInput.trim()}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '7px 14px', borderRadius: 7,
                background: trainInput.trim() ? 'rgba(79,127,255,0.2)' : 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(79,127,255,0.3)',
                color: '#4f7fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <Plus size={12} />
              Save
            </button>
          </div>
          {instructions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {instructions.map(inst => (
                <div key={inst.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '6px 10px', borderRadius: 6,
                  background: 'rgba(139,92,246,0.06)',
                  border: '1px solid rgba(139,92,246,0.15)',
                }}>
                  <span style={{ fontSize: 12, color: 'var(--text2)', flex: 1, lineHeight: 1.4 }}>{inst.value}</span>
                  <button
                    onClick={() => deleteInstruction(inst.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text3)', flexShrink: 0 }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
