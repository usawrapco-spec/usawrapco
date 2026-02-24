'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign, Send, CheckCircle2, Clock, AlertTriangle,
  Edit3, X, ChevronDown, Trash2, Plus, CreditCard,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ──────────────────────────────────────────────────────────────────────

type MilestoneStatus = 'pending' | 'invoiced' | 'paid' | 'overdue'
type AmountType = 'flat' | 'percentage'
type DueTrigger = 'at_approval' | 'before_start' | 'at_pickup' | 'net_15' | 'net_30' | 'net_45' | 'net_60' | 'on_completion'

interface PaymentMilestone {
  id: string
  schedule_id: string
  name: string
  amount_type: AmountType
  amount_value: number
  resolved_amount: number
  due_trigger: DueTrigger
  status: MilestoneStatus
  invoice_id: string | null
  paid_at: string | null
  sort_order: number
}

interface PaymentSchedule {
  id: string
  sales_order_id: string
  template: string
  created_at: string
  updated_at: string
}

interface PaymentScheduleProps {
  salesOrderId: string
  total: number
  canWrite: boolean
  isDemo: boolean
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<MilestoneStatus, { label: string; color: string; bg: string }> = {
  pending:  { label: 'Pending',  color: 'var(--text3)',  bg: 'rgba(90,96,128,0.15)' },
  invoiced: { label: 'Invoiced', color: 'var(--accent)', bg: 'rgba(79,127,255,0.15)' },
  paid:     { label: 'Paid',     color: 'var(--green)',  bg: 'rgba(34,192,122,0.15)' },
  overdue:  { label: 'Overdue',  color: 'var(--red)',    bg: 'rgba(242,90,90,0.15)' },
}

const DUE_TRIGGER_LABELS: Record<DueTrigger, string> = {
  at_approval:   'At Approval',
  before_start:  'Before Start',
  at_pickup:     'At Pickup',
  net_15:        'Net 15 Days',
  net_30:        'Net 30 Days',
  net_45:        'Net 45 Days',
  net_60:        'Net 60 Days',
  on_completion: 'On Completion',
}

type TemplateName = 'default' | '50_50' | 'net_30' | '100_upfront' | 'cod'

interface TemplateOption {
  key: TemplateName
  label: string
  description: string
  milestones: Omit<PaymentMilestone, 'id' | 'schedule_id' | 'resolved_amount' | 'invoice_id' | 'paid_at'>[]
}

const TEMPLATES: TemplateOption[] = [
  {
    key: 'default',
    label: 'Default (Deposit + 50/50)',
    description: '$250 deposit, 50% before start, balance at pickup',
    milestones: [
      { name: 'Deposit', amount_type: 'flat', amount_value: 250, due_trigger: 'at_approval', status: 'pending', sort_order: 0 },
      { name: '50% to Start', amount_type: 'percentage', amount_value: 50, due_trigger: 'before_start', status: 'pending', sort_order: 1 },
      { name: 'Balance at Pickup', amount_type: 'percentage', amount_value: 0, due_trigger: 'at_pickup', status: 'pending', sort_order: 2 },
    ],
  },
  {
    key: '50_50',
    label: '50/50 Split',
    description: '50% upfront, 50% at pickup',
    milestones: [
      { name: '50% Upfront', amount_type: 'percentage', amount_value: 50, due_trigger: 'at_approval', status: 'pending', sort_order: 0 },
      { name: '50% at Pickup', amount_type: 'percentage', amount_value: 50, due_trigger: 'at_pickup', status: 'pending', sort_order: 1 },
    ],
  },
  {
    key: 'net_30',
    label: 'Net 30',
    description: '100% due 30 days after approval',
    milestones: [
      { name: 'Full Balance', amount_type: 'percentage', amount_value: 100, due_trigger: 'net_30', status: 'pending', sort_order: 0 },
    ],
  },
  {
    key: '100_upfront',
    label: '100% Upfront',
    description: 'Full amount due at approval',
    milestones: [
      { name: 'Full Payment', amount_type: 'percentage', amount_value: 100, due_trigger: 'at_approval', status: 'pending', sort_order: 0 },
    ],
  },
  {
    key: 'cod',
    label: 'COD (Cash on Delivery)',
    description: 'Full amount due at pickup',
    milestones: [
      { name: 'Cash on Delivery', amount_type: 'percentage', amount_value: 100, due_trigger: 'at_pickup', status: 'pending', sort_order: 0 },
    ],
  },
]

// ─── Helpers ────────────────────────────────────────────────────────────────────

function genId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function resolveAmount(
  milestone: Pick<PaymentMilestone, 'amount_type' | 'amount_value' | 'name'>,
  total: number,
  allMilestones: Pick<PaymentMilestone, 'amount_type' | 'amount_value' | 'name'>[],
): number {
  if (milestone.amount_type === 'flat') {
    return milestone.amount_value
  }
  // If percentage is 0, this is the "remaining balance" milestone
  if (milestone.amount_value === 0) {
    const otherTotal = allMilestones
      .filter(m => m !== milestone)
      .reduce((sum, m) => {
        if (m.amount_type === 'flat') return sum + m.amount_value
        if (m.amount_value > 0) return sum + (total * m.amount_value) / 100
        return sum
      }, 0)
    return Math.max(0, total - otherTotal)
  }
  return (total * milestone.amount_value) / 100
}

function resolveMilestones(
  milestones: PaymentMilestone[],
  total: number,
): PaymentMilestone[] {
  return milestones.map(m => ({
    ...m,
    resolved_amount: resolveAmount(m, total, milestones),
  }))
}

function buildMilestonesFromTemplate(
  template: TemplateOption,
  scheduleId: string,
): PaymentMilestone[] {
  return template.milestones.map(t => ({
    ...t,
    id: genId(),
    schedule_id: scheduleId,
    resolved_amount: 0,
    invoice_id: null,
    paid_at: null,
  }))
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function PaymentSchedule({ salesOrderId, total, canWrite, isDemo }: PaymentScheduleProps) {
  const supabase = createClient()

  const [schedule, setSchedule] = useState<PaymentSchedule | null>(null)
  const [milestones, setMilestones] = useState<PaymentMilestone[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editMilestones, setEditMilestones] = useState<PaymentMilestone[]>([])
  const [editTemplate, setEditTemplate] = useState<TemplateName>('default')

  // ── Fetch existing schedule ─────────────────────────────────────────────────

  const loadSchedule = useCallback(async () => {
    if (isDemo) {
      initDefaultSchedule()
      return
    }

    try {
      const { data: scheduleData, error: scheduleErr } = await supabase
        .from('payment_schedules')
        .select('*')
        .eq('sales_order_id', salesOrderId)
        .maybeSingle()

      if (scheduleErr) {
        console.error('Error fetching payment schedule:', scheduleErr)
        initDefaultSchedule()
        return
      }

      if (scheduleData) {
        setSchedule(scheduleData)

        const { data: msData, error: msErr } = await supabase
          .from('payment_milestones')
          .select('*')
          .eq('schedule_id', scheduleData.id)
          .order('sort_order', { ascending: true })

        if (msErr) {
          console.error('Error fetching milestones:', msErr)
          return
        }

        if (msData && msData.length > 0) {
          setMilestones(resolveMilestones(msData, total))
        } else {
          // Schedule exists but no milestones -- seed defaults
          const defaultTemplate = TEMPLATES[0]
          const seeded = buildMilestonesFromTemplate(defaultTemplate, scheduleData.id)
          setMilestones(resolveMilestones(seeded, total))
        }
      } else {
        initDefaultSchedule()
      }
    } catch {
      initDefaultSchedule()
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salesOrderId, isDemo, total])

  function initDefaultSchedule() {
    const localScheduleId = genId()
    const defaultTemplate = TEMPLATES[0]
    const defaultMilestones = buildMilestonesFromTemplate(defaultTemplate, localScheduleId)
    setSchedule({
      id: localScheduleId,
      sales_order_id: salesOrderId,
      template: 'default',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    setMilestones(resolveMilestones(defaultMilestones, total))
    setLoading(false)
  }

  useEffect(() => {
    loadSchedule()
  }, [loadSchedule])

  // Recompute resolved amounts when total changes
  useEffect(() => {
    if (milestones.length > 0) {
      setMilestones(prev => resolveMilestones(prev, total))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total])

  // ── Actions ─────────────────────────────────────────────────────────────────

  async function handleMarkPaid(milestoneId: string) {
    if (!canWrite) return

    setMilestones(prev =>
      prev.map(m =>
        m.id === milestoneId
          ? { ...m, status: 'paid' as MilestoneStatus, paid_at: new Date().toISOString() }
          : m
      )
    )

    if (!isDemo && !milestoneId.startsWith('local-')) {
      const { error } = await supabase
        .from('payment_milestones')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', milestoneId)

      if (error) console.error('Error marking paid:', error)
    }
  }

  async function handleSendInvoice(milestoneId: string) {
    if (!canWrite) return

    setMilestones(prev =>
      prev.map(m =>
        m.id === milestoneId
          ? { ...m, status: 'invoiced' as MilestoneStatus }
          : m
      )
    )

    if (!isDemo && !milestoneId.startsWith('local-')) {
      const { error } = await supabase
        .from('payment_milestones')
        .update({ status: 'invoiced' })
        .eq('id', milestoneId)

      if (error) console.error('Error updating milestone:', error)
    }
  }

  // ── Modal: Edit Schedule ────────────────────────────────────────────────────

  function openEditModal() {
    const currentTemplate = (schedule?.template || 'default') as TemplateName
    setEditTemplate(currentTemplate)
    setEditMilestones(milestones.map(m => ({ ...m })))
    setShowModal(true)
  }

  function handleTemplateSelect(templateKey: TemplateName) {
    setEditTemplate(templateKey)
    const template = TEMPLATES.find(t => t.key === templateKey)!
    const scheduleId = schedule?.id || genId()
    const newMilestones = buildMilestonesFromTemplate(template, scheduleId)
    setEditMilestones(resolveMilestones(newMilestones, total))
  }

  function handleEditMilestoneName(id: string, name: string) {
    setEditMilestones(prev =>
      prev.map(m => (m.id === id ? { ...m, name } : m))
    )
  }

  function handleEditMilestoneAmountType(id: string, amount_type: AmountType) {
    setEditMilestones(prev => {
      const updated = prev.map(m =>
        m.id === id ? { ...m, amount_type, amount_value: amount_type === 'flat' ? 0 : 0 } : m
      )
      return resolveMilestones(updated, total)
    })
  }

  function handleEditMilestoneAmountValue(id: string, amount_value: number) {
    setEditMilestones(prev => {
      const updated = prev.map(m =>
        m.id === id ? { ...m, amount_value } : m
      )
      return resolveMilestones(updated, total)
    })
  }

  function handleEditMilestoneDueTrigger(id: string, due_trigger: DueTrigger) {
    setEditMilestones(prev =>
      prev.map(m => (m.id === id ? { ...m, due_trigger } : m))
    )
  }

  function handleAddEditMilestone() {
    const scheduleId = schedule?.id || genId()
    const newMilestone: PaymentMilestone = {
      id: genId(),
      schedule_id: scheduleId,
      name: 'New Milestone',
      amount_type: 'flat',
      amount_value: 0,
      resolved_amount: 0,
      due_trigger: 'at_approval',
      status: 'pending',
      invoice_id: null,
      paid_at: null,
      sort_order: editMilestones.length,
    }
    setEditMilestones(prev => [...prev, newMilestone])
  }

  function handleRemoveEditMilestone(id: string) {
    setEditMilestones(prev => {
      const filtered = prev.filter(m => m.id !== id)
      return resolveMilestones(
        filtered.map((m, i) => ({ ...m, sort_order: i })),
        total
      )
    })
  }

  async function handleSaveSchedule() {
    setSaving(true)

    const resolved = resolveMilestones(editMilestones, total)

    if (isDemo) {
      setMilestones(resolved)
      setSchedule(prev => prev ? { ...prev, template: editTemplate, updated_at: new Date().toISOString() } : prev)
      setShowModal(false)
      setSaving(false)
      return
    }

    try {
      let scheduleId = schedule?.id

      // Upsert schedule
      if (scheduleId && !scheduleId.startsWith('local-')) {
        const { error } = await supabase
          .from('payment_schedules')
          .update({ template: editTemplate, updated_at: new Date().toISOString() })
          .eq('id', scheduleId)

        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('payment_schedules')
          .insert({
            sales_order_id: salesOrderId,
            template: editTemplate,
          })
          .select()
          .single()

        if (error) throw error
        scheduleId = data.id
        setSchedule(data)
      }

      // Delete old milestones
      await supabase
        .from('payment_milestones')
        .delete()
        .eq('schedule_id', scheduleId!)

      // Insert new milestones
      const toInsert = resolved.map(m => ({
        schedule_id: scheduleId!,
        name: m.name,
        amount_type: m.amount_type,
        amount_value: m.amount_value,
        resolved_amount: m.resolved_amount,
        due_trigger: m.due_trigger,
        status: m.status,
        sort_order: m.sort_order,
      }))

      const { data: insertedMs, error: insertErr } = await supabase
        .from('payment_milestones')
        .insert(toInsert)
        .select()

      if (insertErr) throw insertErr

      if (insertedMs) {
        setMilestones(resolveMilestones(insertedMs, total))
      } else {
        setMilestones(resolved)
      }
    } catch (err) {
      console.error('Error saving payment schedule:', err)
      // Still update local state on error so the UI is usable
      setMilestones(resolved)
    }

    setShowModal(false)
    setSaving(false)
  }

  // ── Computed ────────────────────────────────────────────────────────────────

  const totalScheduled = milestones.reduce((sum, m) => sum + m.resolved_amount, 0)
  const totalPaid = milestones
    .filter(m => m.status === 'paid')
    .reduce((sum, m) => sum + m.resolved_amount, 0)
  const remaining = total - totalPaid

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="card">
        <div className="section-label">Payment Schedule</div>
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--text3)', fontSize: 13 }}>
          Loading payment schedule...
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="card">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="section-label" style={{ margin: 0 }}>
            Payment Schedule
          </div>
          {canWrite && (
            <button className="btn-ghost btn-sm" onClick={openEditModal}>
              <Edit3 size={12} /> Edit Schedule
            </button>
          )}
        </div>

        {/* Summary bar */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
          marginBottom: 16, padding: '12px 16px',
          background: 'var(--surface2)', borderRadius: 10,
        }}>
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: 2,
            }}>
              Total
            </div>
            <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)' }}>
              {fmtCurrency(total)}
            </div>
          </div>
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: 2,
            }}>
              Paid
            </div>
            <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--green)' }}>
              {fmtCurrency(totalPaid)}
            </div>
          </div>
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: 2,
            }}>
              Remaining
            </div>
            <div className="mono" style={{
              fontSize: 16, fontWeight: 700,
              color: remaining > 0 ? 'var(--amber)' : 'var(--green)',
            }}>
              {fmtCurrency(remaining)}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{
          height: 6, borderRadius: 3, background: 'var(--surface2)',
          marginBottom: 20, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 3,
            background: totalPaid >= total ? 'var(--green)' : 'var(--accent)',
            width: total > 0 ? `${Math.min(100, (totalPaid / total) * 100)}%` : '0%',
            transition: 'width 0.3s ease',
          }} />
        </div>

        {/* Milestones table */}
        {milestones.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--text3)', fontSize: 13 }}>
            <CreditCard size={24} style={{ marginBottom: 8, opacity: 0.4 }} />
            <div>No payment milestones configured.</div>
            {canWrite && (
              <button
                className="btn-primary btn-sm"
                style={{ marginTop: 12 }}
                onClick={openEditModal}
              >
                <Plus size={12} /> Set Up Schedule
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Milestone', 'Amount', 'Due', 'Status', 'Actions'].map(col => (
                    <th
                      key={col}
                      style={{
                        padding: '8px 12px', textAlign: col === 'Amount' ? 'right' : 'left',
                        fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.05em', color: 'var(--text3)',
                        borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {milestones.map((m, idx) => {
                  const sc = STATUS_CONFIG[m.status]
                  return (
                    <tr
                      key={m.id}
                      style={{
                        borderBottom: idx < milestones.length - 1 ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      {/* Milestone name */}
                      <td style={{ padding: '12px 12px', fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {m.status === 'paid' ? (
                            <CheckCircle2 size={14} style={{ color: 'var(--green)', flexShrink: 0 }} />
                          ) : m.status === 'overdue' ? (
                            <AlertTriangle size={14} style={{ color: 'var(--red)', flexShrink: 0 }} />
                          ) : m.status === 'invoiced' ? (
                            <Send size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                          ) : (
                            <Clock size={14} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                          )}
                          {m.name}
                        </div>
                        {m.amount_type === 'percentage' && m.amount_value > 0 && (
                          <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 22 }}>
                            ({m.amount_value}%)
                          </span>
                        )}
                        {m.amount_type === 'percentage' && m.amount_value === 0 && (
                          <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 22 }}>
                            (remaining balance)
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '12px 12px', textAlign: 'right' }}>
                        <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>
                          {fmtCurrency(m.resolved_amount)}
                        </span>
                      </td>

                      {/* Due trigger */}
                      <td style={{ padding: '12px 12px', fontSize: 12, color: 'var(--text2)' }}>
                        {DUE_TRIGGER_LABELS[m.due_trigger]}
                      </td>

                      {/* Status badge */}
                      <td style={{ padding: '12px 12px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', padding: '2px 10px',
                          borderRadius: 6, fontSize: 11, fontWeight: 700,
                          color: sc.color, background: sc.bg,
                        }}>
                          {sc.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 12px' }}>
                        {canWrite && m.status !== 'paid' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn-sm"
                              onClick={() => handleMarkPaid(m.id)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '4px 10px', borderRadius: 6, border: 'none',
                                fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                background: 'rgba(34,192,122,0.15)', color: 'var(--green)',
                                transition: 'all 0.15s',
                              }}
                              onMouseOver={e => { e.currentTarget.style.background = 'rgba(34,192,122,0.25)' }}
                              onMouseOut={e => { e.currentTarget.style.background = 'rgba(34,192,122,0.15)' }}
                            >
                              <DollarSign size={11} /> Mark Paid
                            </button>
                            {m.status === 'pending' && (
                              <button
                                className="btn-sm"
                                onClick={() => handleSendInvoice(m.id)}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  padding: '4px 10px', borderRadius: 6, border: 'none',
                                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                  background: 'rgba(79,127,255,0.15)', color: 'var(--accent)',
                                  transition: 'all 0.15s',
                                }}
                                onMouseOver={e => { e.currentTarget.style.background = 'rgba(79,127,255,0.25)' }}
                                onMouseOut={e => { e.currentTarget.style.background = 'rgba(79,127,255,0.15)' }}
                              >
                                <Send size={11} /> Send Invoice
                              </button>
                            )}
                          </div>
                        )}
                        {m.status === 'paid' && m.paid_at && (
                          <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                            {new Date(m.paid_at).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric',
                            })}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Scheduled vs total warning */}
        {milestones.length > 0 && Math.abs(totalScheduled - total) > 0.01 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginTop: 12,
            padding: '8px 12px', borderRadius: 8, fontSize: 12,
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
            color: 'var(--amber)',
          }}>
            <AlertTriangle size={13} />
            <span>
              Scheduled total ({fmtCurrency(totalScheduled)}) does not match order total ({fmtCurrency(total)}).
              Difference: {fmtCurrency(Math.abs(totalScheduled - total))}.
            </span>
          </div>
        )}
      </div>

      {/* ── Edit Schedule Modal ───────────────────────────────────────────────── */}
      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div style={{
            width: '100%', maxWidth: 680, maxHeight: '90vh',
            background: 'var(--surface)', borderRadius: 14,
            border: '1px solid var(--border)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Modal header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 20px', borderBottom: '1px solid var(--border)',
            }}>
              <h2 style={{
                fontSize: 18, fontWeight: 800, margin: 0,
                fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text1)',
              }}>
                Edit Payment Schedule
              </h2>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 32, height: 32, borderRadius: 8, border: 'none',
                  background: 'var(--surface2)', color: 'var(--text3)', cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal body */}
            <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
              {/* Template selector */}
              <div style={{ marginBottom: 20 }}>
                <label className="field-label">Payment Template</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                  {TEMPLATES.map(t => (
                    <button
                      key={t.key}
                      onClick={() => handleTemplateSelect(t.key)}
                      style={{
                        padding: '10px 14px', borderRadius: 10, border: '1px solid',
                        borderColor: editTemplate === t.key ? 'var(--accent)' : 'var(--border)',
                        background: editTemplate === t.key ? 'rgba(79,127,255,0.08)' : 'var(--surface2)',
                        cursor: 'pointer', textAlign: 'left',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{
                        fontSize: 13, fontWeight: 700,
                        color: editTemplate === t.key ? 'var(--accent)' : 'var(--text1)',
                        marginBottom: 2,
                      }}>
                        {t.label}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.4 }}>
                        {t.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Milestones editor */}
              <div style={{ marginBottom: 16 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: 12,
                }}>
                  <label className="field-label" style={{ margin: 0 }}>
                    Milestones ({editMilestones.length})
                  </label>
                  <button className="btn-ghost btn-sm" onClick={handleAddEditMilestone}>
                    <Plus size={12} /> Add Milestone
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {editMilestones.map((m, idx) => (
                    <div
                      key={m.id}
                      style={{
                        padding: '14px 16px', borderRadius: 10,
                        background: 'var(--surface2)', border: '1px solid var(--border)',
                      }}
                    >
                      <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', marginBottom: 10,
                      }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: 'var(--text3)',
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>
                          Milestone {idx + 1}
                        </span>
                        {editMilestones.length > 1 && (
                          <button
                            onClick={() => handleRemoveEditMilestone(m.id)}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              width: 24, height: 24, borderRadius: 6, border: 'none',
                              background: 'rgba(242,90,90,0.1)', color: 'var(--red)',
                              cursor: 'pointer', transition: 'all 0.15s',
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 1fr 1fr', gap: 10 }}>
                        {/* Name */}
                        <div>
                          <label className="field-label">Name</label>
                          <input
                            value={m.name}
                            onChange={e => handleEditMilestoneName(m.id, e.target.value)}
                            className="field"
                            placeholder="Milestone name"
                          />
                        </div>

                        {/* Amount type */}
                        <div>
                          <label className="field-label">Type</label>
                          <div style={{ position: 'relative' }}>
                            <select
                              value={m.amount_type}
                              onChange={e => handleEditMilestoneAmountType(m.id, e.target.value as AmountType)}
                              className="field"
                              style={{ appearance: 'none', paddingRight: 28 }}
                            >
                              <option value="flat">Flat $</option>
                              <option value="percentage">Percent %</option>
                            </select>
                            <ChevronDown
                              size={12}
                              style={{
                                position: 'absolute', right: 10, top: '50%',
                                transform: 'translateY(-50%)', color: 'var(--text3)',
                                pointerEvents: 'none',
                              }}
                            />
                          </div>
                        </div>

                        {/* Amount value */}
                        <div>
                          <label className="field-label">
                            {m.amount_type === 'flat' ? 'Amount ($)' : 'Percent (%)'}
                          </label>
                          <input
                            type="number"
                            value={m.amount_value}
                            onChange={e => handleEditMilestoneAmountValue(m.id, Number(e.target.value))}
                            className="field mono"
                            min={0}
                            max={m.amount_type === 'percentage' ? 100 : undefined}
                            step={m.amount_type === 'flat' ? 0.01 : 1}
                            placeholder={m.amount_type === 'percentage' ? '0 = remaining' : '0.00'}
                          />
                        </div>

                        {/* Due trigger */}
                        <div>
                          <label className="field-label">Due When</label>
                          <div style={{ position: 'relative' }}>
                            <select
                              value={m.due_trigger}
                              onChange={e => handleEditMilestoneDueTrigger(m.id, e.target.value as DueTrigger)}
                              className="field"
                              style={{ appearance: 'none', paddingRight: 28 }}
                            >
                              {Object.entries(DUE_TRIGGER_LABELS).map(([val, label]) => (
                                <option key={val} value={val}>{label}</option>
                              ))}
                            </select>
                            <ChevronDown
                              size={12}
                              style={{
                                position: 'absolute', right: 10, top: '50%',
                                transform: 'translateY(-50%)', color: 'var(--text3)',
                                pointerEvents: 'none',
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Resolved preview */}
                      <div style={{
                        marginTop: 8, display: 'flex', alignItems: 'center', gap: 6,
                        fontSize: 12, color: 'var(--text3)',
                      }}>
                        <DollarSign size={11} />
                        <span>Resolves to: </span>
                        <span className="mono" style={{ color: 'var(--text1)', fontWeight: 600 }}>
                          {fmtCurrency(m.resolved_amount)}
                        </span>
                        {m.amount_type === 'percentage' && m.amount_value === 0 && (
                          <span style={{ fontStyle: 'italic', color: 'var(--text3)' }}>
                            (auto-calculated remaining balance)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Edit total preview */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', borderRadius: 10,
                background: 'var(--bg)', border: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>
                  Scheduled Total
                </span>
                <span className="mono" style={{
                  fontSize: 16, fontWeight: 700,
                  color: Math.abs(editMilestones.reduce((s, m) => s + m.resolved_amount, 0) - total) < 0.01
                    ? 'var(--green)' : 'var(--amber)',
                }}>
                  {fmtCurrency(editMilestones.reduce((s, m) => s + m.resolved_amount, 0))}
                  <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text3)', marginLeft: 8 }}>
                    / {fmtCurrency(total)}
                  </span>
                </span>
              </div>
            </div>

            {/* Modal footer */}
            <div style={{
              display: 'flex', justifyContent: 'flex-end', gap: 8,
              padding: '16px 20px', borderTop: '1px solid var(--border)',
            }}>
              <button
                className="btn-ghost btn-sm"
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="btn-primary btn-sm"
                onClick={handleSaveSchedule}
                disabled={saving || editMilestones.length === 0}
              >
                {saving ? 'Saving...' : 'Save Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
