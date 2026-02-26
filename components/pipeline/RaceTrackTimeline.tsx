'use client'

import React, { useState, useCallback, useEffect } from 'react'
import {
  Check, Lock, AlertCircle, ChevronDown, ChevronUp,
  Shield, Trophy, User, Calendar, Flag, FileText,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ── Types ──────────────────────────────────────────────────────────────────────
interface CpState {
  done: boolean
  auto?: boolean
  blocked?: boolean
  by?: string | null
  at?: string | null
  note?: string | null
}

interface Checkpoint {
  id: string
  label: string
  dept: DeptKey
  isHardStop?: boolean
}

type DeptKey = 'sales' | 'contract' | 'design' | 'production' | 'install' | 'close'
type DeptStatus = 'complete' | 'blocked' | 'in_progress' | 'locked' | 'upcoming'

interface Props {
  project: any
  onChecklistUpdate?: (checklist: Record<string, Partial<CpState>>) => void
}

// ── Checkpoint master list ─────────────────────────────────────────────────────
const CHECKPOINTS: Checkpoint[] = [
  // Sales (4)
  { id: 'lead_created',       label: 'Lead Created',       dept: 'sales' },
  { id: 'estimate_sent',      label: 'Estimate Sent',      dept: 'sales' },
  { id: 'proposal_accepted',  label: 'Proposal Accepted',  dept: 'sales' },
  { id: 'deposit_paid',       label: 'Deposit Paid',       dept: 'sales' },
  // Contract (2)
  { id: 'contract_sent',      label: 'Contract Sent',      dept: 'contract' },
  { id: 'contract_signed',    label: 'Contract Signed',    dept: 'contract', isHardStop: true },
  // Design (4)
  { id: 'brief_received',     label: 'Brief Received',     dept: 'design' },
  { id: 'design_in_progress', label: 'In Progress',        dept: 'design' },
  { id: 'proof_sent',         label: 'Proof Sent',         dept: 'design' },
  { id: 'design_approved',    label: 'Approved',           dept: 'design' },
  // Production (4)
  { id: 'print_queued',       label: 'Print Queued',       dept: 'production' },
  { id: 'printing',           label: 'Printing',           dept: 'production' },
  { id: 'print_complete',     label: 'Print Complete',     dept: 'production' },
  { id: 'laminated_ready',    label: 'Lam & Ready',        dept: 'production' },
  // Install (5)
  { id: 'install_scheduled',  label: 'Scheduled',          dept: 'install' },
  { id: 'contract_verified',  label: 'Contract OK',        dept: 'install' },
  { id: 'install_started',    label: 'Started',            dept: 'install' },
  { id: 'install_complete',   label: 'Complete',           dept: 'install' },
  { id: 'qc_passed',          label: 'QC Passed',          dept: 'install' },
  // Close (3)
  { id: 'invoice_sent',       label: 'Invoice Sent',       dept: 'close' },
  { id: 'payment_received',   label: 'Payment Rcvd',       dept: 'close' },
  { id: 'job_complete',       label: 'Job Complete',       dept: 'close' },
]

// Auto-done checkpoints per pipe_stage (waterfall)
const STAGE_AUTODONE: Record<string, string[]> = {
  sales_in: ['lead_created'],
  production: [
    'lead_created', 'estimate_sent', 'proposal_accepted', 'deposit_paid',
    'contract_sent', 'contract_signed', 'brief_received',
  ],
  install: [
    'lead_created', 'estimate_sent', 'proposal_accepted', 'deposit_paid',
    'contract_sent', 'contract_signed', 'brief_received', 'design_in_progress',
    'proof_sent', 'design_approved', 'print_queued', 'printing',
    'print_complete', 'laminated_ready',
  ],
  prod_review: [
    'lead_created', 'estimate_sent', 'proposal_accepted', 'deposit_paid',
    'contract_sent', 'contract_signed', 'brief_received', 'design_in_progress',
    'proof_sent', 'design_approved', 'print_queued', 'printing',
    'print_complete', 'laminated_ready', 'install_scheduled', 'contract_verified',
    'install_started', 'install_complete',
  ],
  sales_close: [
    'lead_created', 'estimate_sent', 'proposal_accepted', 'deposit_paid',
    'contract_sent', 'contract_signed', 'brief_received', 'design_in_progress',
    'proof_sent', 'design_approved', 'print_queued', 'printing',
    'print_complete', 'laminated_ready', 'install_scheduled', 'contract_verified',
    'install_started', 'install_complete', 'qc_passed', 'invoice_sent',
  ],
  done: CHECKPOINTS.map(c => c.id),
}

// Department config
const DEPT_ORDER: DeptKey[] = ['sales', 'contract', 'design', 'production', 'install', 'close']
const DEPTS: Record<DeptKey, { label: string; color: string; abbr: string }> = {
  sales:      { label: 'SALES',      color: '#4f7fff', abbr: 'SLS' },
  contract:   { label: 'CONTRACT',   color: '#f25a5a', abbr: 'CTR' },
  design:     { label: 'DESIGN',     color: '#8b5cf6', abbr: 'DSN' },
  production: { label: 'PRODUCTION', color: '#22c07a', abbr: 'PRD' },
  install:    { label: 'INSTALL',    color: '#22d3ee', abbr: 'INS' },
  close:      { label: 'CLOSE',      color: '#f59e0b', abbr: 'CLO' },
}

// Dept status summary icons/colors
const DEPT_STATUS_DISPLAY: Record<DeptStatus, { icon: string; color: string; label: string }> = {
  complete:    { icon: '✓',  color: '#22c07a', label: '' },
  blocked:     { icon: '!',  color: '#f25a5a', label: '' },
  in_progress: { icon: '●',  color: '#f59e0b', label: '' },
  locked:      { icon: '🔒', color: '#5a6080', label: '' },
  upcoming:    { icon: '○',  color: '#5a6080', label: '' },
}

// ── Helper: compute checkpoint state ──────────────────────────────────────────
function computeState(project: any): Record<string, CpState> {
  const stage = project.pipe_stage || 'sales_in'
  const stored = (project.stage_checklist as Record<string, any>) || {}
  const autoDoneIds = new Set<string>(STAGE_AUTODONE[stage] || ['lead_created'])

  const state: Record<string, CpState> = {}
  for (const cp of CHECKPOINTS) {
    const s = stored[cp.id]
    const autoDone = autoDoneIds.has(cp.id)

    if (s?.done === false) {
      // Explicit manual uncheck overrides auto-done
      state[cp.id] = { done: false, by: s.by, at: s.at, note: s.note }
    } else if (s?.done === true) {
      state[cp.id] = { done: true, by: s.by, at: s.at }
    } else if (autoDone) {
      state[cp.id] = { done: true, auto: true }
    } else {
      state[cp.id] = { done: false }
    }
  }

  // Mark hard stops as blocked if not done
  if (!state['contract_signed']?.done) {
    state['contract_signed'] = { ...state['contract_signed'], blocked: true }
  }
  // Install contract_verified — shows red if install stage reached but not verified
  if (stage === 'install' && !state['contract_verified']?.done) {
    state['contract_verified'] = { ...state['contract_verified'], blocked: true }
  }

  return state
}

function getCompletionPct(state: Record<string, CpState>): number {
  const done = CHECKPOINTS.filter(c => state[c.id]?.done).length
  return Math.round((done / CHECKPOINTS.length) * 100)
}

function getActiveCheckpoint(state: Record<string, CpState>): Checkpoint | null {
  return CHECKPOINTS.find(c => !state[c.id]?.done) ?? null
}

function getDeptStatus(dept: DeptKey, state: Record<string, CpState>): DeptStatus {
  const cps = CHECKPOINTS.filter(c => c.dept === dept)
  const allDone  = cps.every(c => state[c.id]?.done)
  const anyDone  = cps.some(c => state[c.id]?.done)
  const hasHardBlock = cps.some(c => c.isHardStop && state[c.id]?.blocked)

  // Install section locked if contract not signed
  if (dept === 'install' && !state['contract_signed']?.done && !anyDone) {
    return 'locked'
  }
  if (allDone) return 'complete'
  if (hasHardBlock) return 'blocked'
  if (anyDone) return 'in_progress'
  return 'upcoming'
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
  catch { return '' }
}

// ── Main component ────────────────────────────────────────────────────────────
export function RaceTrackTimeline({ project, onChecklistUpdate }: Props) {
  const [expanded, setExpanded]         = useState(false)
  const [selectedCp, setSelectedCp]     = useState<string | null>(null)
  const [pinMode, setPinMode]           = useState(false)
  const [pinValue, setPinValue]         = useState('')
  const [adminUnlocked, setAdminUnlocked] = useState(false)
  const [lockCountdown, setLockCountdown] = useState<number | null>(null)
  const [saving, setSaving]             = useState(false)
  const [localChecklist, setLocalChecklist] = useState<Record<string, any>>(
    (project.stage_checklist as Record<string, any>) || {}
  )

  // Derive state from project + local checklist
  const projectWithLocal = { ...project, stage_checklist: localChecklist }
  const state  = computeState(projectWithLocal)
  const pct    = getCompletionPct(state)
  const active = getActiveCheckpoint(state)
  const isComplete = pct === 100

  // Countdown timer — auto-locks admin after 2 minutes, warns at 30s
  useEffect(() => {
    if (!adminUnlocked) { setLockCountdown(null); return }
    const TOTAL = 2 * 60
    setLockCountdown(TOTAL)
    const interval = setInterval(() => {
      setLockCountdown(prev => (prev === null || prev <= 1) ? null : prev - 1)
    }, 1000)
    const timer = setTimeout(() => setAdminUnlocked(false), TOTAL * 1000)
    return () => { clearInterval(interval); clearTimeout(timer) }
  }, [adminUnlocked]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePinSubmit = useCallback(() => {
    if (pinValue === '1099') {
      setAdminUnlocked(true)
      setPinMode(false)
      setPinValue('')
    } else {
      setPinValue('')
    }
  }, [pinValue])

  const handleToggle = useCallback(async (cpId: string, currentState: boolean) => {
    if (!adminUnlocked) return
    const newDone = !currentState
    const newEntry = newDone
      ? { done: true, by: 'Admin', at: new Date().toISOString() }
      : { done: false, by: null, at: null }

    const newChecklist = { ...localChecklist, [cpId]: newEntry }
    setLocalChecklist(newChecklist)

    setSaving(true)
    try {
      const supabase = createClient()
      await supabase.from('projects')
        .update({ stage_checklist: newChecklist })
        .eq('id', project.id)
      onChecklistUpdate?.(newChecklist)
    } catch (err) {
      // Revert on error
      setLocalChecklist(localChecklist)
    } finally {
      setSaving(false)
    }
  }, [adminUnlocked, localChecklist, project.id, onChecklistUpdate])

  return (
    <>
      {/* CSS animation keyframes */}
      <style>{`
        @keyframes rtPulse {
          0%, 100% { box-shadow: 0 0 0 0 var(--rt-color, #4f7fff); transform: scale(1); }
          50%       { box-shadow: 0 0 0 5px transparent; transform: scale(1.2); }
        }
        @keyframes rtConfetti {
          0%   { opacity: 0; transform: scale(0.96); }
          30%  { opacity: 1; transform: scale(1.02); }
          100% { opacity: 1; transform: scale(1); }
        }
        .rt-active-dot { animation: rtPulse 1.4s ease-in-out infinite; }
        .rt-complete   { animation: rtConfetti 0.6s ease-out forwards; }
      `}</style>

      <div
        className={isComplete ? 'rt-complete' : ''}
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          paddingBottom: 8,
          marginBottom: 8,
        }}
      >
        {/* ── Compact Track Strip ───────────────────────────────────────── */}
        <TrackStrip
          state={state}
          active={active}
          pct={pct}
          isComplete={isComplete}
          expanded={expanded}
          onToggle={() => { setExpanded(v => !v); setSelectedCp(null) }}
        />

        {/* ── Expanded Checklist Panel ──────────────────────────────────── */}
        {expanded && (
          <div
            onClick={e => e.stopPropagation()}
            style={{
              marginTop: 8,
              background: 'rgba(0,0,0,0.25)',
              borderRadius: 8,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {/* Panel header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 10px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.02)',
            }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text2)', letterSpacing: '0.08em' }}>
                JOB CHECKLIST
              </span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {/* PDF Export */}
                <a
                  href={`/api/pdf/job-packet/${project.id}`}
                  title="Export job packet PDF"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '3px 7px', borderRadius: 5,
                    fontSize: 9, fontWeight: 700, color: 'var(--text3)',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    textDecoration: 'none', letterSpacing: '0.05em',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--text1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.10)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                >
                  <FileText size={10} /> PDF
                </a>
                {saving && (
                  <span style={{ fontSize: 9, color: 'var(--text3)' }}>Saving…</span>
                )}
                {adminUnlocked ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {lockCountdown !== null && lockCountdown <= 30 && (
                      <span style={{
                        fontSize: 9, fontWeight: 700,
                        color: lockCountdown <= 10 ? '#f25a5a' : '#f59e0b',
                        animation: lockCountdown <= 10 ? 'pulse 1s ease-in-out infinite' : 'none',
                      }}>
                        {lockCountdown}s
                      </span>
                    )}
                    <button
                      onClick={() => setAdminUnlocked(false)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 3,
                        background: 'rgba(34,192,122,0.15)', color: '#22c07a',
                        border: '1px solid rgba(34,192,122,0.3)',
                        borderRadius: 4, padding: '2px 6px', fontSize: 9, fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <Shield size={9} /> ADMIN
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setPinMode(v => !v)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 3,
                      background: 'transparent', color: 'var(--text3)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 4, padding: '2px 6px', fontSize: 9,
                      cursor: 'pointer',
                    }}
                    title="Admin unlock (PIN 1099)"
                  >
                    <Lock size={9} /> Admin
                  </button>
                )}
              </div>
            </div>

            {/* PIN entry */}
            {pinMode && !adminUnlocked && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 10px',
                background: 'rgba(79,127,255,0.08)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <Shield size={11} color="var(--accent)" />
                <input
                  type="password"
                  value={pinValue}
                  onChange={e => setPinValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handlePinSubmit()}
                  placeholder="Enter PIN"
                  maxLength={6}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 4,
                    color: 'var(--text1)',
                    fontSize: 12,
                    padding: '3px 8px',
                    width: 90,
                    outline: 'none',
                  }}
                  autoFocus
                />
                <button
                  onClick={handlePinSubmit}
                  style={{
                    background: 'var(--accent)', color: '#fff',
                    border: 'none', borderRadius: 4, padding: '3px 10px',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Unlock
                </button>
                <button
                  onClick={() => { setPinMode(false); setPinValue('') }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Checkpoint list grouped by dept */}
            {DEPT_ORDER.map(dept => {
              const dCps = CHECKPOINTS.filter(c => c.dept === dept)
              const dStatus = getDeptStatus(dept, state)
              const dConf = DEPTS[dept]
              const statusDisplay = DEPT_STATUS_DISPLAY[dStatus]

              return (
                <div key={dept}>
                  {/* Dept header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 10px 3px',
                    background: `${dConf.color}08`,
                    borderTop: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    <div style={{ width: 2, height: 12, background: dConf.color, borderRadius: 1 }} />
                    <span style={{ fontSize: 9, fontWeight: 800, color: dConf.color, letterSpacing: '0.08em' }}>
                      {dConf.label}
                    </span>
                    <span style={{
                      marginLeft: 'auto', fontSize: 9, fontWeight: 800,
                      color: statusDisplay.color,
                    }}>
                      {statusDisplay.icon} {dStatus.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  {/* Checkpoints in this dept */}
                  {dCps.map(cp => {
                    const cpState = state[cp.id]
                    const isExpanded = selectedCp === cp.id
                    const isDone = cpState.done
                    const isBlocked = cpState.blocked && !isDone
                    const isActive = active?.id === cp.id

                    return (
                      <div key={cp.id}>
                        <button
                          onClick={() => setSelectedCp(isExpanded ? null : cp.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            width: '100%', padding: '5px 10px 5px 20px',
                            background: isExpanded ? 'rgba(255,255,255,0.04)' : 'transparent',
                            border: 'none', cursor: 'pointer',
                            textAlign: 'left',
                            borderLeft: isActive ? `2px solid ${dConf.color}` : '2px solid transparent',
                          }}
                        >
                          {/* Status indicator */}
                          {adminUnlocked ? (
                            /* Clickable checkbox in admin mode */
                            <div
                              onClick={e => { e.stopPropagation(); handleToggle(cp.id, isDone) }}
                              style={{
                                width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                                background: isDone ? dConf.color : 'transparent',
                                border: `1.5px solid ${isDone ? dConf.color : isBlocked ? '#f25a5a' : 'rgba(255,255,255,0.2)'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                            >
                              {isDone && <Check size={9} color="#fff" strokeWidth={3} />}
                            </div>
                          ) : (
                            <div style={{
                              width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                              background: isDone ? dConf.color : isBlocked ? 'rgba(242,90,90,0.15)' : 'transparent',
                              border: `1.5px solid ${isDone ? dConf.color : isBlocked ? '#f25a5a' : 'rgba(255,255,255,0.15)'}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {isDone && <Check size={8} color="#fff" strokeWidth={3} />}
                              {isBlocked && !isDone && <AlertCircle size={8} color="#f25a5a" />}
                            </div>
                          )}

                          {/* Label */}
                          <span style={{
                            flex: 1,
                            fontSize: 11,
                            fontWeight: isActive ? 700 : 500,
                            color: isDone ? 'var(--text2)' : isBlocked ? '#f25a5a' : isActive ? 'var(--text1)' : 'var(--text2)',
                            textDecoration: isDone && !cpState.auto ? 'line-through' : 'none',
                            textDecorationColor: 'rgba(255,255,255,0.3)',
                          }}>
                            {cp.label}
                            {cp.isHardStop && (
                              <span style={{ marginLeft: 4, fontSize: 9, color: '#f25a5a', fontWeight: 800 }}>
                                GATE
                              </span>
                            )}
                          </span>

                          {/* Completion info */}
                          {isDone && (
                            <span style={{ fontSize: 9, color: 'var(--text3)', flexShrink: 0 }}>
                              {cpState.auto ? 'auto' : fmtDate(cpState.at)}
                            </span>
                          )}
                          {isActive && !isDone && (
                            <span style={{ fontSize: 9, color: dConf.color, fontWeight: 800, flexShrink: 0 }}>
                              ACTIVE
                            </span>
                          )}
                        </button>

                        {/* Expanded details row */}
                        {isExpanded && (
                          <div style={{
                            padding: '4px 10px 6px 42px',
                            background: 'rgba(255,255,255,0.02)',
                            fontSize: 10,
                            color: 'var(--text3)',
                            display: 'flex', flexDirection: 'column', gap: 2,
                          }}>
                            {isDone && cpState.by && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <User size={9} />
                                <span>{cpState.by}</span>
                                {cpState.at && (
                                  <>
                                    <Calendar size={9} style={{ marginLeft: 4 }} />
                                    <span>{fmtDate(cpState.at)}</span>
                                  </>
                                )}
                              </div>
                            )}
                            {isDone && cpState.auto && (
                              <div style={{ color: 'var(--text3)', fontStyle: 'italic' }}>
                                Auto-completed when job moved to {project.pipe_stage?.replace('_', ' ')}
                              </div>
                            )}
                            {!isDone && isBlocked && (
                              <div style={{ color: '#f25a5a', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Lock size={9} />
                                <span>
                                  {cp.isHardStop
                                    ? 'Hard stop — must be completed before proceeding'
                                    : 'Blocked — requires contract signed first'}
                                </span>
                              </div>
                            )}
                            {!isDone && !isBlocked && !isActive && (
                              <div style={{ fontStyle: 'italic' }}>Pending</div>
                            )}
                            {cpState.note && (
                              <div style={{ color: 'var(--text2)', fontStyle: 'italic' }}>
                                Note: {cpState.note}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {/* Complete celebration row */}
            {isComplete && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '8px 10px',
                background: 'rgba(34,192,122,0.08)',
                borderTop: '1px solid rgba(34,192,122,0.2)',
              }}>
                <Trophy size={13} color="#22c07a" />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#22c07a' }}>
                  Job Complete — All checkpoints cleared!
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// ── Track Strip sub-component ─────────────────────────────────────────────────
function TrackStrip({
  state,
  active,
  pct,
  isComplete,
  expanded,
  onToggle,
}: {
  state: Record<string, CpState>
  active: Checkpoint | null
  pct: number
  isComplete: boolean
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div>
      {/* Department label row */}
      <div style={{ display: 'flex', marginBottom: 3, paddingLeft: 2, paddingRight: 2 }}>
        {DEPT_ORDER.map(dept => {
          const count = CHECKPOINTS.filter(c => c.dept === dept).length
          const dStatus = getDeptStatus(dept, state)
          const dConf = DEPTS[dept]
          const isAllDone = dStatus === 'complete'
          return (
            <div
              key={dept}
              style={{
                flex: count,
                textAlign: 'center',
                paddingTop: 1,
              }}
            >
              <span style={{
                fontSize: 7.5,
                fontWeight: 900,
                color: isAllDone ? dConf.color : dStatus === 'in_progress' ? dConf.color : 'var(--text3)',
                letterSpacing: '0.06em',
                opacity: isAllDone ? 1 : dStatus === 'in_progress' ? 0.9 : 0.5,
              }}>
                {dConf.abbr}
              </span>
            </div>
          )
        })}
        {/* Expand button */}
        <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 6, flexShrink: 0 }}>
          <button
            onClick={e => { e.stopPropagation(); onToggle() }}
            style={{
              background: expanded ? 'rgba(79,127,255,0.15)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${expanded ? 'rgba(79,127,255,0.35)' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: 6, cursor: 'pointer',
              color: expanded ? 'var(--accent)' : 'var(--text2)',
              padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 3,
              fontSize: 9, fontWeight: 700, letterSpacing: '.04em',
              minWidth: 52, justifyContent: 'center',
            }}
            title={expanded ? 'Collapse checklist' : 'Expand checklist'}
          >
            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            {expanded ? 'Less' : 'Tasks'}
          </button>
        </div>
      </div>

      {/* The race track */}
      <div
        style={{
          position: 'relative',
          height: 30,
          background: 'rgba(0,0,0,0.35)',
          borderRadius: 6,
          overflow: 'visible',
          cursor: 'default',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 3,
          paddingRight: 3,
          border: isComplete ? '1px solid rgba(34,192,122,0.3)' : '1px solid rgba(255,255,255,0.06)',
          boxShadow: isComplete ? '0 0 12px rgba(34,192,122,0.15)' : 'none',
        }}
      >
        {/* Road center line */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: 6,
          right: 6,
          height: 2,
          background: 'rgba(255,255,255,0.05)',
          transform: 'translateY(-50%)',
          borderRadius: 1,
          pointerEvents: 'none',
        }} />

        {/* Progress fill on road */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: 6,
          width: pct > 0 ? `calc(${pct}% - 12px)` : 0,
          height: 2,
          background: isComplete
            ? '#22c07a'
            : `linear-gradient(90deg, #4f7fff, ${active ? DEPTS[active.dept].color : '#4f7fff'})`,
          transform: 'translateY(-50%)',
          borderRadius: 1,
          pointerEvents: 'none',
          transition: 'width 0.4s ease',
          zIndex: 1,
        }} />

        {/* Dept zones + checkpoint dots */}
        <div style={{
          display: 'flex',
          width: '100%',
          position: 'relative',
          zIndex: 2,
          alignItems: 'center',
        }}>
          {DEPT_ORDER.map((dept, di) => {
            const dCps = CHECKPOINTS.filter(c => c.dept === dept)
            const dConf = DEPTS[dept]
            const dStatus = getDeptStatus(dept, state)

            return (
              <div
                key={dept}
                style={{
                  flex: dCps.length,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-evenly',
                  paddingLeft: di === 0 ? 0 : 2,
                  paddingRight: di === DEPT_ORDER.length - 1 ? 0 : 2,
                  borderLeft: di > 0 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                  position: 'relative',
                  height: 30,
                  background: dStatus === 'in_progress'
                    ? `${dConf.color}0a`
                    : 'transparent',
                }}
              >
                {dCps.map(cp => {
                  const cps = state[cp.id]
                  const isDone = cps?.done
                  const isActivecp = active?.id === cp.id
                  const isBlocked = cps?.blocked && !isDone
                  const dotColor = isDone
                    ? dConf.color
                    : isBlocked ? '#f25a5a'
                    : isActivecp ? dConf.color
                    : 'rgba(255,255,255,0.15)'

                  return (
                    <div
                      key={cp.id}
                      title={cp.label}
                      className={isActivecp ? 'rt-active-dot' : ''}
                      style={{
                        width: isActivecp ? 12 : 10,
                        height: isActivecp ? 12 : 10,
                        borderRadius: '50%',
                        flexShrink: 0,
                        background: isDone ? dotColor : isBlocked ? 'rgba(242,90,90,0.2)' : 'rgba(0,0,0,0.6)',
                        border: `${isActivecp ? 2 : 1.5}px solid ${isDone ? dotColor : isBlocked ? '#f25a5a' : isActivecp ? dConf.color : 'rgba(255,255,255,0.18)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: isDone
                          ? `0 0 4px ${dotColor}60`
                          : isActivecp
                            ? `0 0 6px ${dConf.color}80`
                            : 'none',
                        '--rt-color': dConf.color,
                      } as React.CSSProperties & { '--rt-color'?: string }}
                    >
                      {isDone && (
                        <Check
                          size={6}
                          color="#fff"
                          strokeWidth={3}
                          style={{ display: 'block' }}
                        />
                      )}
                      {isActivecp && !isDone && (
                        <Flag
                          size={5}
                          color={dConf.color}
                          style={{ display: 'block' }}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Progress bar + pct + active label */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        marginTop: 4,
        paddingLeft: 1, paddingRight: 1,
      }}>
        {/* Thin progress bar */}
        <div style={{
          flex: 1,
          height: 2,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 1,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${pct}%`,
            height: '100%',
            background: isComplete ? '#22c07a' : 'var(--accent)',
            transition: 'width 0.4s ease',
            borderRadius: 1,
          }} />
        </div>

        {/* Percentage */}
        <span style={{
          fontSize: 9,
          fontWeight: 800,
          fontFamily: 'JetBrains Mono, monospace',
          color: isComplete ? '#22c07a' : 'var(--text2)',
          flexShrink: 0,
        }}>
          {isComplete ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Trophy size={9} color="#22c07a" /> 100%
            </span>
          ) : `${pct}%`}
        </span>
      </div>

      {/* Dept summary badges */}
      <DeptSummaryRow state={state} />
    </div>
  )
}

// ── Dept summary badges ────────────────────────────────────────────────────────
function DeptSummaryRow({ state }: { state: Record<string, CpState> }) {
  return (
    <div style={{
      display: 'flex',
      gap: 3,
      marginTop: 5,
      flexWrap: 'nowrap',
      overflow: 'hidden',
    }}>
      {DEPT_ORDER.map(dept => {
        const dStatus = getDeptStatus(dept, state)
        const dConf = DEPTS[dept]
        const disp = DEPT_STATUS_DISPLAY[dStatus]

        return (
          <div
            key={dept}
            title={`${dConf.label}: ${dStatus.replace('_', ' ')}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              padding: '2px 5px',
              borderRadius: 4,
              background: dStatus === 'complete'
                ? `${dConf.color}18`
                : dStatus === 'blocked'
                  ? 'rgba(242,90,90,0.12)'
                  : dStatus === 'in_progress'
                    ? `${dConf.color}10`
                    : 'rgba(255,255,255,0.04)',
              border: `1px solid ${
                dStatus === 'complete'
                  ? `${dConf.color}40`
                  : dStatus === 'blocked'
                    ? 'rgba(242,90,90,0.3)'
                    : dStatus === 'in_progress'
                      ? `${dConf.color}30`
                      : 'rgba(255,255,255,0.06)'
              }`,
              flex: 1,
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 8, fontWeight: 800, color: disp.color }}>
              {dConf.abbr}
            </span>
            <span style={{ fontSize: 8, color: disp.color }}>
              {dStatus === 'complete' ? '✓'
                : dStatus === 'blocked' ? '!'
                : dStatus === 'in_progress' ? '●'
                : dStatus === 'locked' ? '⊘'
                : '○'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// Re-export X for internal use
function X({ size, ...props }: { size: number; [k: string]: any }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
