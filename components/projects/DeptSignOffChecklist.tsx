'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { CheckCircle2, Circle, Lock, RotateCcw, AlertTriangle } from 'lucide-react'

/* ─── Types ─────────────────────────────────────────────────────────────────── */

type DeptStage = 'dept_sales' | 'dept_production' | 'dept_install'

interface ChecklistItemRow {
  id: string
  project_id: string
  stage: DeptStage
  item_key: string
  completed: boolean
  completed_by: string | null
  completed_at: string | null
}

interface DeptSignOffRow {
  id: string
  project_id: string
  stage: string
  approved_by: string | null
  approved_at: string | null
  note: string | null
  approver?: { name: string; avatar_url: string | null } | null
}

/* ─── Checklist definitions ─────────────────────────────────────────────────── */

const DEPT_ITEMS: Record<DeptStage, { key: string; label: string; required: boolean }[]> = {
  dept_sales: [
    { key: 'quote_sent',      label: 'Quote / estimate sent to customer',       required: true },
    { key: 'design_deposit',  label: 'Design deposit collected',                required: true },
    { key: 'intake_sent',     label: 'Design intake form sent to customer',     required: true },
    { key: 'intake_completed',label: 'Customer completed design intake',        required: false },
    { key: 'date_confirmed',  label: 'Install / drop-off date confirmed',       required: true },
    { key: 'vehicle_info',    label: 'Vehicle info & job notes documented',     required: true },
  ],
  dept_production: [
    { key: 'brief_received',   label: 'Design brief received',                           required: true },
    { key: 'mockup_created',   label: 'Mockup / proof created',                          required: true },
    { key: 'proof_sent',       label: 'Proof sent to customer',                          required: true },
    { key: 'proof_approved',   label: 'Customer approved proof',                         required: true },
    { key: 'print_file_ready', label: 'Print file prepared (correct bleed, CMYK, DPI)', required: true },
    { key: 'material_ordered', label: 'Material ordered / pulled from inventory',        required: true },
    { key: 'print_queued',     label: 'Print job queued',                                required: true },
    { key: 'print_qcd',        label: "Print completed and QC'd",                        required: true },
  ],
  dept_install: [
    { key: 'vehicle_received', label: 'Vehicle received / checked in',    required: true },
    { key: 'surface_prep',     label: 'Surface prep completed',           required: true },
    { key: 'vinyl_verified',   label: 'Vinyl condition verified',         required: true },
    { key: 'install_done',     label: 'Installation completed',           required: true },
    { key: 'no_defects',       label: 'No bubbles / lifting / edge issues', required: true },
    { key: 'walkthrough',      label: 'Customer walkthrough done',        required: true },
    { key: 'photos_taken',     label: 'Post-install photos taken',        required: true },
    { key: 'vehicle_returned', label: 'Vehicle returned to customer',     required: true },
  ],
}

const DEPT_META: Record<DeptStage, { label: string; color: string; signOffLabel: string; shortLabel: string }> = {
  dept_sales:      { label: 'SALES DEPARTMENT',              color: '#4f7fff', signOffLabel: 'SIGN OFF — SALES',      shortLabel: 'Sales' },
  dept_production: { label: 'DESIGN / PRODUCTION DEPARTMENT',color: '#22c07a', signOffLabel: 'SIGN OFF — PRODUCTION', shortLabel: 'Production' },
  dept_install:    { label: 'INSTALL DEPARTMENT',            color: '#22d3ee', signOffLabel: 'SIGN OFF — INSTALL',    shortLabel: 'Install' },
}

const ALL_STAGES: DeptStage[] = ['dept_sales', 'dept_production', 'dept_install']

/* ─── Props ─────────────────────────────────────────────────────────────────── */

interface DeptSignOffChecklistProps {
  projectId: string
  orgId: string
  profile: Profile
  onAllSigned?: (allSigned: boolean) => void
  onCloseJob?: () => void
}

/* ─── Component ─────────────────────────────────────────────────────────────── */

export default function DeptSignOffChecklist({ projectId, orgId, profile, onAllSigned, onCloseJob }: DeptSignOffChecklistProps) {
  const supabase = createClient()
  const [items, setItems] = useState<ChecklistItemRow[]>([])
  const [signOffs, setSignOffs] = useState<DeptSignOffRow[]>([])
  const [loading, setLoading] = useState(true)
  const [signingOff, setSigningOff] = useState<DeptStage | null>(null)
  const [resetting, setResetting] = useState<DeptStage | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const isAdmin = ['admin', 'owner'].includes(profile.role)

  const fetchData = useCallback(async () => {
    const [itemsRes, signOffsRes] = await Promise.all([
      supabase
        .from('checklist_items')
        .select('*')
        .eq('project_id', projectId),
      supabase
        .from('stage_approvals')
        .select('*, approver:approved_by(name, avatar_url)')
        .eq('project_id', projectId)
        .in('stage', ALL_STAGES),
    ])
    if (itemsRes.data) setItems(itemsRes.data as ChecklistItemRow[])
    if (signOffsRes.data) setSignOffs(signOffsRes.data as DeptSignOffRow[])
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    fetchData()
    const ch = supabase.channel(`checklist-${projectId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'checklist_items',
        filter: `project_id=eq.${projectId}`,
      }, () => fetchData())
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'stage_approvals',
        filter: `project_id=eq.${projectId}`,
      }, () => fetchData())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [projectId, fetchData])

  // Helpers
  const getItemsForStage = (stage: DeptStage) => items.filter(i => i.stage === stage)
  const getSignOff = (stage: DeptStage) => signOffs.find(s => s.stage === stage) ?? null

  const getStageStatus = (stage: DeptStage): 'not_started' | 'in_progress' | 'signed_off' => {
    if (getSignOff(stage)) return 'signed_off'
    const stageItems = getItemsForStage(stage)
    if (stageItems.some(i => i.completed)) return 'in_progress'
    return 'not_started'
  }

  const requiredAllComplete = (stage: DeptStage): boolean => {
    const required = DEPT_ITEMS[stage].filter(i => i.required).map(i => i.key)
    const completedKeys = getItemsForStage(stage).filter(i => i.completed).map(i => i.item_key)
    return required.every(k => completedKeys.includes(k))
  }

  const allSigned = ALL_STAGES.every(s => !!getSignOff(s))

  useEffect(() => {
    onAllSigned?.(allSigned)
  }, [allSigned, onAllSigned])

  const statusDotColor = (stage: DeptStage) => {
    const s = getStageStatus(stage)
    if (s === 'signed_off') return '#22c07a'
    if (s === 'in_progress') return '#f59e0b'
    return '#5a6080'
  }

  // Toggle a checklist item
  const handleToggle = async (stage: DeptStage, itemKey: string) => {
    if (getSignOff(stage)) return // locked
    const toggleKey = `${stage}:${itemKey}`
    setToggling(toggleKey)
    const existing = items.find(i => i.stage === stage && i.item_key === itemKey)
    if (existing) {
      const nowComplete = !existing.completed
      await supabase
        .from('checklist_items')
        .update({
          completed: nowComplete,
          completed_by: nowComplete ? profile.id : null,
          completed_at: nowComplete ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
    } else {
      await supabase.from('checklist_items').insert({
        project_id: projectId,
        org_id: orgId,
        stage,
        item_key: itemKey,
        completed: true,
        completed_by: profile.id,
        completed_at: new Date().toISOString(),
      })
    }
    await fetchData()
    setToggling(null)
  }

  // Sign off a department
  const handleSignOff = async (stage: DeptStage) => {
    if (!requiredAllComplete(stage)) return
    setSigningOff(stage)
    await supabase.from('stage_approvals').upsert({
      project_id: projectId,
      org_id: orgId,
      stage,
      status: 'approved',
      approved_by: profile.id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'project_id,stage' })
    await fetchData()
    setSigningOff(null)
  }

  // Reset a sign-off (admin only)
  const handleReset = async (stage: DeptStage) => {
    setResetting(stage)
    const existing = signOffs.find(s => s.stage === stage)
    if (existing) {
      await supabase.from('stage_approvals').delete().eq('id', existing.id)
    }
    await fetchData()
    setResetting(null)
  }

  // Missing depts message
  const missingDepts = ALL_STAGES
    .filter(s => !getSignOff(s))
    .map(s => DEPT_META[s].shortLabel)
    .join(' / ')

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1,2,3].map(i => (
          <div key={i} style={{ height: 180, background: 'var(--surface)', borderRadius: 12, opacity: 0.4 }} />
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Status dots header ───────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        padding: '12px 18px', background: 'var(--surface)',
        border: '1px solid var(--surface2)', borderRadius: 12,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700, color: 'var(--text3)',
          textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0,
        }}>
          Department Status
        </span>
        {ALL_STAGES.map(stage => (
          <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              background: statusDotColor(stage),
              boxShadow: `0 0 8px ${statusDotColor(stage)}80`,
              display: 'inline-block', flexShrink: 0,
            }} />
            <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>
              {DEPT_META[stage].shortLabel}
            </span>
          </div>
        ))}
        {allSigned && (
          <span style={{
            marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: '#22c07a',
            background: 'rgba(34,192,122,0.1)', border: '1px solid rgba(34,192,122,0.25)',
            padding: '3px 12px', borderRadius: 20,
          }}>
            ALL DEPARTMENTS SIGNED OFF
          </span>
        )}
      </div>

      {/* ── Department sections ──────────────────────────────────────── */}
      {ALL_STAGES.map(stage => {
        const meta = DEPT_META[stage]
        const stageSignOff = getSignOff(stage)
        const stageItems = getItemsForStage(stage)
        const completedCount = stageItems.filter(i => i.completed).length
        const totalCount = DEPT_ITEMS[stage].length
        const canSignOff = requiredAllComplete(stage)
        const status = getStageStatus(stage)
        const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

        return (
          <div key={stage} style={{
            background: 'var(--surface)',
            border: `1px solid ${stageSignOff ? `${meta.color}40` : 'var(--surface2)'}`,
            borderRadius: 14, overflow: 'hidden',
            boxShadow: stageSignOff ? `0 0 0 1px ${meta.color}20` : 'none',
          }}>

            {/* Section header */}
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--surface2)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: `${meta.color}06`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: statusDotColor(stage),
                  boxShadow: `0 0 8px ${statusDotColor(stage)}80`,
                  display: 'inline-block', flexShrink: 0,
                }} />
                <span style={{
                  fontSize: 13, fontWeight: 800, color: meta.color,
                  fontFamily: 'Barlow Condensed, sans-serif',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  {meta.label}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--text3)',
                  fontFamily: 'JetBrains Mono, monospace',
                }}>
                  {completedCount}/{totalCount}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 20,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  background: status === 'signed_off'
                    ? 'rgba(34,192,122,0.15)'
                    : status === 'in_progress'
                    ? 'rgba(245,158,11,0.15)'
                    : 'rgba(90,96,128,0.12)',
                  color: status === 'signed_off'
                    ? '#22c07a'
                    : status === 'in_progress'
                    ? '#f59e0b'
                    : '#5a6080',
                }}>
                  {status === 'signed_off' ? 'SIGNED OFF' : status === 'in_progress' ? 'IN PROGRESS' : 'NOT STARTED'}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ height: 3, background: 'var(--surface2)' }}>
              <div style={{
                height: '100%',
                width: `${progressPct}%`,
                background: stageSignOff ? '#22c07a' : meta.color,
                transition: 'width 0.3s ease',
              }} />
            </div>

            {/* Checklist items */}
            <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {DEPT_ITEMS[stage].map(item => {
                const row = stageItems.find(r => r.item_key === item.key)
                const isChecked = row?.completed ?? false
                const locked = !!stageSignOff
                const key = `${stage}:${item.key}`

                return (
                  <div
                    key={item.key}
                    onClick={() => !locked && !toggling && handleToggle(stage, item.key)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '8px 10px', borderRadius: 8,
                      cursor: locked ? 'default' : 'pointer',
                      background: isChecked ? `${meta.color}08` : 'transparent',
                      transition: 'background 0.15s',
                      opacity: toggling === key ? 0.6 : 1,
                    }}
                    onMouseEnter={e => { if (!locked) e.currentTarget.style.background = `${meta.color}10` }}
                    onMouseLeave={e => { e.currentTarget.style.background = isChecked ? `${meta.color}08` : 'transparent' }}
                  >
                    {locked ? (
                      <Lock size={14} style={{ color: isChecked ? meta.color : 'var(--text3)', flexShrink: 0, marginTop: 1 }} />
                    ) : isChecked ? (
                      <CheckCircle2 size={16} style={{ color: meta.color, flexShrink: 0, marginTop: 1 }} />
                    ) : (
                      <Circle size={16} style={{ color: 'var(--text3)', flexShrink: 0, marginTop: 1 }} />
                    )}
                    <span style={{
                      fontSize: 13, flex: 1,
                      color: isChecked ? 'var(--text1)' : 'var(--text2)',
                      fontWeight: isChecked ? 600 : 400,
                    }}>
                      {item.label}
                      {item.required && !isChecked && !locked && (
                        <span style={{ color: 'var(--red)', marginLeft: 3, fontSize: 12, fontWeight: 700 }}>*</span>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Sign-off footer */}
            <div style={{
              padding: '12px 18px', borderTop: '1px solid var(--surface2)',
              background: 'rgba(0,0,0,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}>
              {stageSignOff ? (
                <>
                  <div style={{
                    fontSize: 13, color: '#22c07a', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <CheckCircle2 size={15} style={{ color: '#22c07a', flexShrink: 0 }} />
                    Signed off by{' '}
                    <span style={{ fontWeight: 700 }}>
                      {(stageSignOff.approver as any)?.name || 'team member'}
                    </span>
                    {stageSignOff.approved_at && (
                      <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: 12 }}>
                        &middot; {new Date(stageSignOff.approved_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleReset(stage)}
                      disabled={resetting === stage}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '5px 10px', borderRadius: 6, fontSize: 11,
                        border: '1px solid var(--surface2)', background: 'transparent',
                        color: 'var(--text3)', cursor: 'pointer', fontWeight: 600,
                        opacity: resetting === stage ? 0.6 : 1,
                      }}
                    >
                      <RotateCcw size={11} /> Reset
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={() => canSignOff && handleSignOff(stage)}
                  disabled={!canSignOff || signingOff === stage}
                  style={{
                    padding: '10px 24px', borderRadius: 8, border: 'none',
                    background: canSignOff ? meta.color : 'var(--surface2)',
                    color: canSignOff ? '#fff' : 'var(--text3)',
                    fontSize: 13, fontWeight: 800, letterSpacing: '0.04em',
                    textTransform: 'uppercase', fontFamily: 'Barlow Condensed, sans-serif',
                    cursor: canSignOff ? 'pointer' : 'not-allowed',
                    opacity: signingOff === stage ? 0.6 : 1,
                    boxShadow: canSignOff ? `0 4px 14px ${meta.color}40` : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  {signingOff === stage ? 'Signing...' : meta.signOffLabel}
                </button>
              )}
            </div>
          </div>
        )
      })}

      {/* ── Close Job gate ───────────────────────────────────────────── */}
      <div style={{
        background: 'var(--surface)',
        border: `1px solid ${allSigned ? 'rgba(34,192,122,0.35)' : 'var(--surface2)'}`,
        borderRadius: 14, padding: '18px 20px',
        boxShadow: allSigned ? '0 0 0 1px rgba(34,192,122,0.1)' : 'none',
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: 'var(--text3)',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14,
        }}>
          Close Job
        </div>

        {!allSigned && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 8, marginBottom: 14,
            background: 'rgba(242,90,90,0.08)',
            border: '1px solid rgba(242,90,90,0.2)',
          }}>
            <AlertTriangle size={15} style={{ color: 'var(--red)', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--red)', fontWeight: 600 }}>
              Cannot close — {missingDepts} sign-off pending
            </span>
          </div>
        )}

        <button
          disabled={!allSigned}
          onClick={() => { if (allSigned && onCloseJob) onCloseJob() }}
          style={{
            width: '100%', padding: '14px 20px', borderRadius: 10, border: 'none',
            background: allSigned ? '#22c07a' : 'var(--surface2)',
            color: allSigned ? '#fff' : 'var(--text3)',
            fontSize: 16, fontWeight: 900, letterSpacing: '0.04em',
            fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase',
            cursor: allSigned ? 'pointer' : 'not-allowed',
            boxShadow: allSigned ? '0 4px 20px rgba(34,192,122,0.35)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          {allSigned ? 'CLOSE JOB' : 'CLOSE JOB — Awaiting Sign-Offs'}
        </button>
      </div>
    </div>
  )
}
