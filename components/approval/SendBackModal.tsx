'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface SendBackModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  orgId: string
  userId: string
  fromStage: string
  onSendBack: (toStage: string) => void
}

const REASONS = [
  { key: 'vinyl_issue',     label: 'Vinyl Issue',          desc: 'Defect, wrinkle, tear, or quality problem with material' },
  { key: 'wrong_dims',      label: 'Wrong Dimensions',     desc: 'Print size doesn\'t match vehicle measurements' },
  { key: 'color_mismatch',  label: 'Color Mismatch',       desc: 'Color doesn\'t match proof or brand guidelines' },
  { key: 'install_quality', label: 'Install Quality',      desc: 'Bubbles, lifting edges, misalignment, poor finish' },
  { key: 'missing_info',    label: 'Missing Information',  desc: 'Required fields, photos, or docs not provided' },
  { key: 'client_change',   label: 'Client Change Request',desc: 'Customer requested design or scope changes' },
  { key: 'other',           label: 'Other',                desc: 'Custom reason — provide details below' },
]

const STAGES = [
  { key: 'sales_in', label: 'Sales Intake' },
  { key: 'production', label: 'Production' },
  { key: 'install', label: 'Install' },
  { key: 'prod_review', label: 'QC Review' },
  { key: 'sales_close', label: 'Sales Close' },
]

export default function SendBackModal({ isOpen, onClose, projectId, orgId, userId, fromStage, onSendBack }: SendBackModalProps) {
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState('')
  const [toStage, setToStage] = useState('')
  const [sending, setSending] = useState(false)
  const [undoData, setUndoData] = useState<{ sendBackId: string; prevStage: string; countdown: number } | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const supabase = createClient()

  if (!isOpen) return null

  // Default send-back target is one stage prior
  const stageOrder = STAGES.map(s => s.key)
  const fromIdx = stageOrder.indexOf(fromStage)
  const defaultTo = fromIdx > 0 ? stageOrder[fromIdx - 1] : 'sales_in'
  const targetStage = toStage || defaultTo

  const handleSendBack = async () => {
    if (!reason) return
    setSending(true)

    // Insert send-back record — capture the ID for potential undo
    const { data: sbRecord } = await supabase.from('send_backs').insert({
      org_id: orgId,
      project_id: projectId,
      from_stage: fromStage,
      to_stage: targetStage,
      reason,
      reason_detail: detail || null,
      sent_by: userId,
    }).select('id').single()

    // Update project stage
    await supabase.from('projects').update({
      pipe_stage: targetStage,
      updated_at: new Date().toISOString(),
    }).eq('id', projectId)

    // Update stage approval to sent_back
    await supabase.from('stage_approvals').upsert({
      org_id: orgId,
      project_id: projectId,
      stage: fromStage,
      status: 'sent_back',
      notes: `Send-back: ${reason} — ${detail}`,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'project_id,stage' })

    setSending(false)
    onSendBack(targetStage)

    // Show undo state — auto-close after 10s
    const UNDO_TIMEOUT = 10
    setUndoData({ sendBackId: sbRecord?.id || '', prevStage: fromStage, countdown: UNDO_TIMEOUT })
    setReason('')
    setDetail('')
    setToStage('')
  }

  const handleUndo = async () => {
    if (!undoData) return
    if (undoTimerRef.current) clearInterval(undoTimerRef.current)

    // Revert project stage
    await supabase.from('projects').update({
      pipe_stage: undoData.prevStage,
      updated_at: new Date().toISOString(),
    }).eq('id', projectId)

    // Revert stage approval
    await supabase.from('stage_approvals').upsert({
      org_id: orgId,
      project_id: projectId,
      stage: fromStage,
      status: 'pending',
      notes: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'project_id,stage' })

    // Remove the send_back record
    if (undoData.sendBackId) {
      await supabase.from('send_backs').delete().eq('id', undoData.sendBackId)
    }

    // Notify parent of undo
    onSendBack(undoData.prevStage)
    setUndoData(null)
    onClose()
  }

  // Countdown timer for undo state
  useEffect(() => {
    if (!undoData) return
    undoTimerRef.current = setInterval(() => {
      setUndoData(prev => {
        if (!prev) return null
        if (prev.countdown <= 1) {
          if (undoTimerRef.current) clearInterval(undoTimerRef.current)
          // Auto-close
          setTimeout(() => onClose(), 0)
          return null
        }
        return { ...prev, countdown: prev.countdown - 1 }
      })
    }, 1000)
    return () => { if (undoTimerRef.current) clearInterval(undoTimerRef.current) }
  }, [undoData?.sendBackId])

  // Undo confirmation state — shown instead of normal modal content
  if (undoData) {
    return (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 32, maxWidth: 400, width: '90vw',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center',
        }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text1)' }}>Job Sent Back</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
            Job moved back to <strong style={{ color: 'var(--text1)' }}>{STAGES.find(s => s.key === targetStage)?.label}</strong>.
            <br />You have <strong style={{ color: undoData.countdown <= 3 ? '#ef4444' : 'var(--amber)' }}>{undoData.countdown}s</strong> to undo.
          </div>
          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            <button
              onClick={handleUndo}
              style={{
                flex: 1, padding: '12px 20px', borderRadius: 10, fontWeight: 800,
                fontSize: 14, cursor: 'pointer', border: '2px solid var(--amber)',
                background: 'rgba(245,158,11,0.10)', color: 'var(--amber)',
              }}
            >
              Undo
            </button>
            <button
              onClick={() => { if (undoTimerRef.current) clearInterval(undoTimerRef.current); setUndoData(null); onClose() }}
              style={{
                flex: 1, padding: '12px 20px', borderRadius: 10, fontWeight: 700,
                fontSize: 13, cursor: 'pointer', background: 'var(--surface2)',
                border: '1px solid var(--border)', color: 'var(--text2)',
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 32,
        maxWidth: 520,
        width: '95vw',
        maxHeight: '85vh',
        overflowY: 'auto',
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#ef4444' }}>Send Back Job</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text3)', fontSize:20, cursor:'pointer', lineHeight:1 }}>x</button>
        </div>

        {/* Send to which stage */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
            Send Back To
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STAGES.filter(s => stageOrder.indexOf(s.key) < fromIdx).map(s => (
              <button key={s.key} onClick={() => setToStage(s.key)} style={{
                padding: '8px 16px', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer',
                border: '2px solid',
                background: targetStage === s.key ? 'rgba(239,68,68,0.15)' : 'var(--surface2)',
                borderColor: targetStage === s.key ? '#ef4444' : 'var(--border)',
                color: targetStage === s.key ? '#ef4444' : 'var(--text2)',
              }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reason selection */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
            Reason *
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {REASONS.map(r => (
              <button key={r.key} onClick={() => setReason(r.key)} style={{
                padding: '12px 16px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                border: '2px solid',
                background: reason === r.key ? 'rgba(239,68,68,0.08)' : 'var(--surface2)',
                borderColor: reason === r.key ? '#ef4444' : 'var(--border)',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: reason === r.key ? '#ef4444' : 'var(--text1)' }}>{r.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{r.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
            Details {reason === 'other' ? '*' : '(optional)'}
          </div>
          <textarea
            value={detail}
            onChange={e => setDetail(e.target.value)}
            rows={3}
            placeholder="Describe the issue, what needs to be fixed..."
            style={{
              width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--text1)',
              outline: 'none', resize: 'none',
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleSendBack}
            disabled={!reason || sending || (reason === 'other' && !detail)}
            style={{
              flex: 1, padding: '14px 24px', borderRadius: 10, fontWeight: 800, fontSize: 14,
              cursor: 'pointer', border: 'none',
              background: '#ef4444', color: '#fff',
              opacity: (!reason || sending) ? 0.5 : 1,
            }}
          >
            {sending ? 'Sending back...' : `Send Back to ${STAGES.find(s => s.key === targetStage)?.label}`}
          </button>
          <button onClick={onClose} style={{
            padding: '14px 20px', borderRadius: 10, fontWeight: 700, fontSize: 13,
            cursor: 'pointer', background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)',
          }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
