'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  Zap,
  X,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  TrendingUp,
  Edit3,
  History,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────
interface WorkflowTrigger {
  id: string
  org_id: string
  name: string
  description?: string
  trigger_event: string
  actions: any
  active: boolean
  run_count: number
  last_run_at?: string
  created_at: string
  updated_at?: string
}

interface WorkflowRun {
  id: string
  org_id: string
  trigger_id: string
  trigger_name: string
  status: 'success' | 'failed' | 'running'
  actions_taken?: any
  error?: string
  created_at: string
}

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

interface Props {
  profile: Profile
  initialTriggers: WorkflowTrigger[]
  initialRuns: WorkflowRun[]
}

export default function AutomationsPageClient({ profile, initialTriggers, initialRuns }: Props) {
  const supabase = createClient()
  const [triggers, setTriggers] = useState<WorkflowTrigger[]>(initialTriggers)
  const [runs, setRuns] = useState<WorkflowRun[]>(initialRuns)
  const [tab, setTab] = useState<'triggers' | 'history'>('triggers')
  const [editingTrigger, setEditingTrigger] = useState<WorkflowTrigger | null>(null)

  const orgId = profile.org_id || ORG_ID

  // Stats
  const stats = useMemo(() => {
    const now = new Date()
    const thisMonth = runs.filter(r => {
      const d = new Date(r.created_at)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    const successCount = thisMonth.filter(r => r.status === 'success').length
    const successRate = thisMonth.length > 0 ? Math.round((successCount / thisMonth.length) * 100) : 0

    // Most triggered
    const triggerCounts: Record<string, number> = {}
    thisMonth.forEach(r => {
      triggerCounts[r.trigger_name] = (triggerCounts[r.trigger_name] || 0) + 1
    })
    const mostTriggered = Object.entries(triggerCounts).sort((a, b) => b[1] - a[1])[0]

    return {
      totalRuns: thisMonth.length,
      successRate,
      mostTriggered: mostTriggered ? mostTriggered[0] : 'None yet',
      mostTriggeredCount: mostTriggered ? mostTriggered[1] : 0,
    }
  }, [runs])

  const toggleActive = async (trigger: WorkflowTrigger) => {
    const newActive = !trigger.active
    // Optimistic update
    setTriggers(prev => prev.map(t => t.id === trigger.id ? { ...t, active: newActive } : t))
    const { error } = await supabase.from('workflow_triggers').update({ active: newActive }).eq('id', trigger.id)
    if (error) {
      // Revert on failure
      console.error('Failed to toggle trigger:', error)
      setTriggers(prev => prev.map(t => t.id === trigger.id ? { ...t, active: trigger.active } : t))
    }
  }

  const saveTrigger = async (trigger: WorkflowTrigger) => {
    const updates = {
      name: trigger.name,
      description: trigger.description,
      active: trigger.active,
    }
    const { error } = await supabase.from('workflow_triggers').update(updates).eq('id', trigger.id)
    if (error) {
      console.error('Failed to save trigger:', error)
      return
    }
    // Only update the fields we actually saved, preserving run_count/last_run_at etc.
    setTriggers(prev => prev.map(t => t.id === trigger.id ? { ...t, ...updates } : t))
    setEditingTrigger(null)
  }

  const formatTime = (ts?: string) => {
    if (!ts) return 'Never'
    const d = new Date(ts)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return d.toLocaleDateString()
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={20} style={{ color: 'var(--amber)' }} />
            Automations
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', margin: '4px 0 0' }}>
            Manage workflow triggers and automation rules
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 16, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Activity size={16} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase' }}>Runs This Month</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>
            {stats.totalRuns}
          </div>
        </div>
        <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 16, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <CheckCircle size={16} style={{ color: 'var(--green)' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase' }}>Success Rate</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>
            {stats.successRate}%
          </div>
        </div>
        <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 16, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <TrendingUp size={16} style={{ color: 'var(--amber)' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase' }}>Most Triggered</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', lineHeight: 1.3 }}>
            {stats.mostTriggered}
          </div>
          {stats.mostTriggeredCount > 0 && (
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
              {stats.mostTriggeredCount} runs
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {([
          { key: 'triggers' as const, label: 'Workflow Triggers', icon: Zap },
          { key: 'history' as const, label: 'Run History', icon: History },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 16px', fontSize: 13, fontWeight: 600,
              background: 'none', border: 'none', cursor: 'pointer',
              color: tab === t.key ? 'var(--accent)' : 'var(--text3)',
              borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Triggers Tab */}
      {tab === 'triggers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {triggers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
              <Zap size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p style={{ fontSize: 14 }}>No workflow triggers configured</p>
            </div>
          ) : (
            triggers.map(trigger => (
              <div
                key={trigger.id}
                style={{
                  background: 'var(--surface)',
                  borderRadius: 10,
                  padding: 16,
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  opacity: trigger.active ? 1 : 0.6,
                }}
              >
                {/* Active toggle */}
                <button
                  onClick={() => toggleActive(trigger)}
                  style={{
                    width: 44, height: 24, borderRadius: 12,
                    background: trigger.active ? 'var(--green)' : 'var(--surface2)',
                    border: 'none', cursor: 'pointer', position: 'relative',
                    flexShrink: 0, transition: 'background 0.2s',
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: '#fff', position: 'absolute', top: 3,
                    left: trigger.active ? 23 : 3, transition: 'left 0.2s',
                  }} />
                </button>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>
                      {trigger.name}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                    {trigger.description || trigger.trigger_event}
                  </div>
                </div>

                {/* Stats */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {trigger.run_count || 0} runs
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                    Last: {formatTime(trigger.last_run_at)}
                  </div>
                </div>

                {/* Edit button */}
                <button
                  onClick={() => setEditingTrigger(trigger)}
                  style={{
                    background: 'var(--surface2)', border: 'none', borderRadius: 6,
                    padding: '6px 8px', cursor: 'pointer', color: 'var(--text2)',
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  <Edit3 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div style={{ background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
          {runs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
              <History size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p style={{ fontSize: 14 }}>No workflow runs yet</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Trigger</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Time</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {runs.map(run => (
                  <tr key={run.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>{run.trigger_name}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
                        background: run.status === 'success' ? 'rgba(34,192,122,0.1)' : run.status === 'failed' ? 'rgba(242,90,90,0.1)' : 'rgba(79,127,255,0.1)',
                        color: run.status === 'success' ? 'var(--green)' : run.status === 'failed' ? 'var(--red)' : 'var(--accent)',
                      }}>
                        {run.status === 'success' ? <CheckCircle size={12} /> : run.status === 'failed' ? <XCircle size={12} /> : <Clock size={12} />}
                        {run.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text2)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {formatTime(run.created_at)}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text3)' }}>
                      {run.actions_taken
                        ? (typeof run.actions_taken === 'string' ? run.actions_taken : JSON.stringify(run.actions_taken).slice(0, 50))
                        : '-'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Edit Trigger Modal */}
      {editingTrigger && (
        <EditTriggerModal
          trigger={editingTrigger}
          onClose={() => setEditingTrigger(null)}
          onSave={saveTrigger}
        />
      )}
    </div>
  )
}

// ── Edit Trigger Modal ─────────────────────────────────
function EditTriggerModal({ trigger, onClose, onSave }: {
  trigger: WorkflowTrigger
  onClose: () => void
  onSave: (t: WorkflowTrigger) => void
}) {
  const [form, setForm] = useState({ ...trigger })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{
        position: 'relative', background: 'var(--surface)', borderRadius: 12,
        padding: 24, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto',
        border: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif', margin: 0 }}>
            Edit Trigger
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4, display: 'block' }}>Name</label>
            <input
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text1)', fontSize: 13 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4, display: 'block' }}>Description</label>
            <textarea
              value={form.description || ''}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={2}
              style={{ width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text1)', fontSize: 13, resize: 'vertical' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4, display: 'block' }}>Trigger Event</label>
            <input
              value={form.trigger_event}
              readOnly
              style={{ width: '100%', padding: '8px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text3)', fontSize: 13 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4, display: 'block' }}>Active</label>
            <button
              onClick={() => setForm(p => ({ ...p, active: !p.active }))}
              style={{
                width: 44, height: 24, borderRadius: 12,
                background: form.active ? 'var(--green)' : 'var(--surface2)',
                border: 'none', cursor: 'pointer', position: 'relative',
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 3,
                left: form.active ? 23 : 3, transition: 'left 0.2s',
              }} />
            </button>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4, display: 'block' }}>Actions (JSON)</label>
            <pre style={{
              width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 6, color: 'var(--text2)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
              overflow: 'auto', maxHeight: 200, whiteSpace: 'pre-wrap', margin: 0,
            }}>
              {JSON.stringify(form.actions, null, 2)}
            </pre>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 6, background: 'var(--surface2)', color: 'var(--text2)', fontSize: 13, border: 'none', cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            style={{ padding: '8px 20px', borderRadius: 6, background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
