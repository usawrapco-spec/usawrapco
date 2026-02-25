'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Target, Edit2, Check, X } from 'lucide-react'

interface Goal {
  id: string
  label: string
  target: number
  type: 'revenue' | 'jobs' | 'gp' | 'customers'
  color: string
}

const DEFAULT_GOALS: Goal[] = [
  { id: 'revenue',   label: 'Monthly Revenue',  target: 50000, type: 'revenue',   color: '#22c07a' },
  { id: 'jobs',      label: 'Jobs Closed',       target: 10,    type: 'jobs',      color: '#4f7fff' },
  { id: 'gp',        label: 'Gross Profit',      target: 20000, type: 'gp',        color: '#8b5cf6' },
  { id: 'customers', label: 'New Customers',     target: 8,     type: 'customers', color: '#22d3ee' },
]

interface Props {
  profileId: string
  actuals: {
    revenue: number
    jobs: number
    gp: number
    customers: number
  }
  canSeeFinancials: boolean
}

export default function GoalsTracker({ profileId, actuals, canSeeFinancials }: Props) {
  const [goals, setGoals] = useState<Goal[]>(DEFAULT_GOALS)
  const [editing, setEditing] = useState(false)
  const [editTargets, setEditTargets] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('profiles')
      .select('settings')
      .eq('id', profileId)
      .single()
      .then(({ data }) => {
        const saved = (data?.settings as any)?.goals as Record<string, number> | undefined
        if (saved) {
          setGoals(prev => prev.map(g => ({ ...g, target: saved[g.id] ?? g.target })))
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId])

  function startEdit() {
    const t: Record<string, string> = {}
    goals.forEach(g => { t[g.id] = String(g.target) })
    setEditTargets(t)
    setEditing(true)
  }

  async function saveGoals() {
    setSaving(true)
    const parsed: Record<string, number> = {}
    goals.forEach(g => {
      const val = parseFloat(editTargets[g.id] ?? String(g.target))
      parsed[g.id] = isNaN(val) ? g.target : val
    })

    const { data: profile } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', profileId)
      .single()

    const current = (profile?.settings as Record<string, any>) || {}
    await supabase
      .from('profiles')
      .update({ settings: { ...current, goals: parsed } })
      .eq('id', profileId)

    setGoals(prev => prev.map(g => ({ ...g, target: parsed[g.id] })))
    setSaving(false)
    setEditing(false)
  }

  const getActual = (type: Goal['type']) => {
    switch (type) {
      case 'revenue':   return actuals.revenue
      case 'jobs':      return actuals.jobs
      case 'gp':        return actuals.gp
      case 'customers': return actuals.customers
    }
  }

  return (
    <div style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--card-border)',
      borderRadius: 16,
      padding: '20px 24px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Target size={14} style={{ color: 'var(--accent)' }} />
          <span style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 14, fontWeight: 800,
            color: 'var(--text1)',
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
          }}>
            Monthly Goals
          </span>
          <span style={{
            fontSize: 10, color: 'var(--text3)',
            fontFamily: 'JetBrains Mono, monospace',
            padding: '2px 7px',
            background: 'var(--surface2)',
            borderRadius: 4,
          }}>
            {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </span>
        </div>

        {!editing ? (
          <button
            onClick={startEdit}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 11px', borderRadius: 6,
              background: 'transparent',
              border: '1px solid var(--card-border)',
              color: 'var(--text2)', fontSize: 11, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Edit2 size={11} />
            Set Targets
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={saveGoals}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 11px', borderRadius: 6,
                background: 'var(--accent)', border: 'none',
                color: '#fff', fontSize: 11, fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              <Check size={11} />
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => setEditing(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 11px', borderRadius: 6,
                background: 'transparent',
                border: '1px solid var(--card-border)',
                color: 'var(--text2)', fontSize: 11, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <X size={11} />
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Goal rows */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>
        {goals.map(goal => {
          const actual = getActual(goal.type)
          const isFinancial = goal.type === 'revenue' || goal.type === 'gp'
          const show = !isFinancial || canSeeFinancials
          const pct = show && goal.target > 0
            ? Math.min(100, Math.round((actual / goal.target) * 100))
            : 0

          const fmtActual = isFinancial
            ? (show ? `$${actual.toLocaleString()}` : '--')
            : String(actual)
          const fmtTarget = isFinancial
            ? (show ? `$${goal.target.toLocaleString()}` : '--')
            : String(goal.target)

          return (
            <div key={goal.id}>
              {/* Label + values row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {goal.label}
                </span>

                {editing ? (
                  /* Inline target input */
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {isFinancial && (
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>$</span>
                    )}
                    <input
                      type="number"
                      min={0}
                      value={editTargets[goal.id] ?? String(goal.target)}
                      onChange={e => setEditTargets(prev => ({ ...prev, [goal.id]: e.target.value }))}
                      style={{
                        width: 72, padding: '3px 7px', borderRadius: 5,
                        background: 'var(--surface2)',
                        border: '1px solid var(--accent)',
                        color: 'var(--text1)', fontSize: 12,
                        fontFamily: 'JetBrains Mono, monospace',
                        textAlign: 'right', outline: 'none',
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 12,
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 700,
                      color: 'var(--text1)',
                    }}>
                      {fmtActual}
                      <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: 11 }}>
                        {' / '}{fmtTarget}
                      </span>
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 800,
                      fontFamily: 'JetBrains Mono, monospace',
                      color: !show ? 'var(--text3)'
                        : pct >= 100 ? 'var(--green)'
                        : pct >= 75  ? 'var(--amber)'
                        : goal.color,
                      minWidth: 34, textAlign: 'right',
                    }}>
                      {show ? `${pct}%` : '--'}
                    </span>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              <div style={{ height: 8, borderRadius: 4, background: 'var(--surface2)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4,
                  background: !show ? 'var(--surface2)'
                    : pct >= 100 ? 'var(--green)'
                    : `linear-gradient(90deg, ${goal.color}99 0%, ${goal.color} 100%)`,
                  width: show ? `${pct}%` : '0%',
                  transition: 'width 0.9s cubic-bezier(0.22, 1, 0.36, 1)',
                  boxShadow: show && pct > 0 ? `0 0 6px ${goal.color}60` : 'none',
                }} />
              </div>

              {show && pct >= 100 && (
                <div style={{ fontSize: 10, color: 'var(--green)', fontWeight: 700, marginTop: 3 }}>
                  Goal reached!
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
