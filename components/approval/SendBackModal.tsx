'use client'

import { useState } from 'react'
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

    // Insert send-back record
    await supabase.from('send_backs').insert({
      org_id: orgId,
      project_id: projectId,
      from_stage: fromStage,
      to_stage: targetStage,
      reason,
      reason_detail: detail || null,
      sent_by: userId,
    })

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
    onClose()
    setReason('')
    setDetail('')
    setToStage('')
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
