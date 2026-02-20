'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import InstallTimer from '@/components/install/InstallTimer'
import SendBackModal from '@/components/approval/SendBackModal'

interface StageApprovalProps {
  projectId: string
  orgId: string
  userId: string
  userName: string
  currentStage: string
  project: any
  onStageAdvance: (newStage: string) => void
}

// Define what each stage requires before sign-off
const STAGE_CONFIG: Record<string, {
  label: string
  color: string
  icon: string
  desc: string
  checklist: { key: string; label: string; required: boolean }[]
  requiredFields?: string[]
}> = {
  sales_in: {
    label: 'Sales Intake',
    color: '#4f7fff',
    icon: '📋',
    desc: 'Sales rep reviews job, confirms scope & pricing, sends to production.',
    checklist: [
      { key: 'client_info', label: 'Client info complete (name, phone, email)', required: true },
      { key: 'vehicle_info', label: 'Vehicle info entered (type, color, year)', required: true },
      { key: 'scope_confirmed', label: 'Wrap scope confirmed with customer', required: true },
      { key: 'pricing_set', label: 'Pricing & margins set', required: true },
      { key: 'deposit_collected', label: 'Deposit collected or payment terms agreed', required: false },
      { key: 'design_brief', label: 'Design brief / instructions provided', required: false },
    ],
  },
  production: {
    label: 'Production',
    color: '#22c07a',
    icon: '🖨',
    desc: 'Print, laminate, cut all panels. Log linear feet printed. Confirm material.',
    checklist: [
      { key: 'design_approved', label: 'Design approved by customer', required: true },
      { key: 'files_print_ready', label: 'Print files prepared & verified', required: true },
      { key: 'material_ordered', label: 'Material type confirmed & available', required: true },
      { key: 'printed', label: 'Panels printed', required: true },
      { key: 'laminated', label: 'Panels laminated', required: true },
      { key: 'cut', label: 'Panels cut to size', required: true },
      { key: 'linear_ft_logged', label: 'Linear feet printed logged', required: true },
      { key: 'quality_check', label: 'Print quality verified — no banding, color shift, or defects', required: true },
    ],
  },
  install: {
    label: 'Install',
    color: '#22d3ee',
    icon: '🔧',
    desc: 'Installer wraps vehicle, logs actual hours & notes, signs off on work.',
    checklist: [
      { key: 'vinyl_inspected', label: 'Vinyl inspected — no visible defects', required: true },
      { key: 'color_confirmed', label: 'Color confirmed — matches approved design', required: true },
      { key: 'dims_correct', label: 'Print dimensions correct', required: true },
      { key: 'surface_prepped', label: 'Vehicle surface prepped & clean', required: true },
      { key: 'install_complete', label: 'Wrap installation complete', required: true },
      { key: 'post_heat', label: 'Post-heat applied throughout', required: true },
      { key: 'no_bubbles', label: 'No bubbles or lifting edges', required: true },
      { key: 'edges_tucked', label: 'Edges properly finished & tucked', required: true },
      { key: 'seams_aligned', label: 'Seams aligned and hidden', required: true },
      { key: 'vehicle_cleaned', label: 'Vehicle cleaned & presentable', required: true },
      { key: 'photos_taken', label: 'Photos taken for record', required: true },
    ],
  },
  prod_review: {
    label: 'Production QC',
    color: '#f59e0b',
    icon: '🔍',
    desc: 'Production manager reviews install quality, logs actuals, approves or sends back.',
    checklist: [
      { key: 'visual_inspection', label: 'Visual inspection passed — no defects visible', required: true },
      { key: 'edges_check', label: 'All edges sealed and tucked properly', required: true },
      { key: 'alignment_check', label: 'Graphics aligned per proof', required: true },
      { key: 'actuals_logged', label: 'Actual hours and material logged', required: true },
      { key: 'photos_reviewed', label: 'After photos reviewed and acceptable', required: true },
      { key: 'installer_hours', label: 'Installer hours verified', required: false },
    ],
  },
  sales_close: {
    label: 'Sales Close',
    color: '#8b5cf6',
    icon: '✅',
    desc: 'Final review, customer delivery, payment collection, job closure.',
    checklist: [
      { key: 'customer_notified', label: 'Customer notified — vehicle is ready', required: true },
      { key: 'final_photos', label: 'Final photos sent to customer', required: false },
      { key: 'payment_collected', label: 'Final payment collected', required: true },
      { key: 'customer_satisfied', label: 'Customer satisfaction confirmed', required: true },
      { key: 'warranty_explained', label: 'Warranty & care instructions provided', required: false },
    ],
  },
}

const STAGE_ORDER = ['sales_in', 'production', 'install', 'prod_review', 'sales_close']

export default function StageApproval({ projectId, orgId, userId, userName, currentStage, project, onStageAdvance }: StageApprovalProps) {
  const [approvals, setApprovals] = useState<Record<string, any>>({})
  const [checklist, setChecklist] = useState<Record<string, boolean>>({})
  const [sendBacks, setSendBacks] = useState<any[]>([])
  const [showSendBack, setShowSendBack] = useState(false)
  const [vinylNotes, setVinylNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const config = STAGE_CONFIG[currentStage]
  const stageIdx = STAGE_ORDER.indexOf(currentStage)

  // Load approvals and send-backs
  useEffect(() => {
    const load = async () => {
      const [appRes, sbRes] = await Promise.all([
        supabase.from('stage_approvals').select('*').eq('project_id', projectId),
        supabase.from('send_backs').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      ])

      if (appRes.data) {
        const map: Record<string, any> = {}
        appRes.data.forEach(a => { map[a.stage] = a })
        setApprovals(map)

        // Load current stage checklist
        const current = map[currentStage]
        if (current?.checklist) {
          setChecklist(current.checklist)
        }
      }

      if (sbRes.data) {
        setSendBacks(sbRes.data)
      }
    }
    load()
  }, [projectId, currentStage])

  const toggleCheck = (key: string) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const requiredComplete = config?.checklist
    .filter(c => c.required)
    .every(c => checklist[c.key]) || false

  const allComplete = config?.checklist.every(c => checklist[c.key]) || false

  const signOff = async () => {
    if (!requiredComplete) return
    setSaving(true)

    // Save approval
    await supabase.from('stage_approvals').upsert({
      org_id: orgId,
      project_id: projectId,
      stage: currentStage,
      status: 'approved',
      approved_by: userId,
      approved_at: new Date().toISOString(),
      checklist,
      notes: vinylNotes || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'project_id,stage' })

    // Advance to next stage
    const nextIdx = stageIdx + 1
    const nextStage = nextIdx < STAGE_ORDER.length ? STAGE_ORDER[nextIdx] : 'done'
    const newStatus = nextStage === 'done' ? 'closed' : project.status

    await supabase.from('projects').update({
      pipe_stage: nextStage === 'done' ? 'sales_close' : nextStage,
      status: newStatus,
      updated_at: new Date().toISOString(),
    }).eq('id', projectId)

    setSaving(false)
    onStageAdvance(nextStage)
  }

  if (!config) return null

  // Recent send-backs for this stage
  const recentSendBacks = sendBacks.filter(sb => sb.to_stage === currentStage && !sb.resolved)

  return (
    <div>
      {/* Send-back alerts */}
      {recentSendBacks.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {recentSendBacks.map(sb => (
            <div key={sb.id} style={{
              padding: '12px 16px', borderRadius: 10, marginBottom: 8,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
            }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#ef4444', marginBottom: 4 }}>
                ⚠️ SENT BACK from {STAGE_CONFIG[sb.from_stage]?.label}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                Reason: <strong>{sb.reason.replace(/_/g, ' ')}</strong>
                {sb.reason_detail && ` — ${sb.reason_detail}`}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pipeline overview - all stages */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20 }}>
        {STAGE_ORDER.map((stageKey, i) => {
          const cfg = STAGE_CONFIG[stageKey]
          const approval = approvals[stageKey]
          const isComplete = approval?.status === 'approved'
          const isCurrent = stageKey === currentStage
          const isSentBack = approval?.status === 'sent_back'

          return (
            <div key={stageKey} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              {i > 0 && <div style={{ position: 'absolute', left: 0, top: 18, width: '50%', height: 2, background: i <= stageIdx ? cfg.color : 'var(--border)' }} />}
              {i < STAGE_ORDER.length - 1 && <div style={{ position: 'absolute', right: 0, top: 18, width: '50%', height: 2, background: i < stageIdx ? STAGE_CONFIG[STAGE_ORDER[i + 1]].color : 'var(--border)' }} />}
              <div style={{
                width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 900, zIndex: 1, marginBottom: 6,
                background: isComplete ? cfg.color : isSentBack ? '#ef4444' : isCurrent ? `${cfg.color}20` : 'var(--surface2)',
                border: `2px solid ${isComplete ? cfg.color : isSentBack ? '#ef4444' : isCurrent ? cfg.color : 'var(--border)'}`,
                color: isComplete ? '#fff' : isSentBack ? '#fff' : isCurrent ? cfg.color : 'var(--text3)',
                boxShadow: isCurrent ? `0 0 16px ${cfg.color}40` : 'none',
              }}>
                {isComplete ? '✓' : isSentBack ? '!' : cfg.icon}
              </div>
              <div style={{
                fontSize: 9, fontWeight: 700, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '.04em',
                color: isCurrent ? cfg.color : isComplete ? 'var(--green)' : 'var(--text3)',
              }}>
                {cfg.label}
              </div>
              {isComplete && (
                <div style={{ fontSize: 8, color: 'var(--green)', fontWeight: 700, marginTop: 2 }}>SIGNED OFF</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Current stage card */}
      <div style={{
        background: `${config.color}08`,
        border: `1px solid ${config.color}30`,
        borderRadius: 14,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${config.color}20`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: 8 }}>
              {config.icon} {config.label}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{config.desc}</div>
          </div>
          <div style={{
            padding: '5px 14px', borderRadius: 8, fontSize: 11, fontWeight: 800,
            background: `${config.color}18`, color: config.color,
            border: `1px solid ${config.color}40`,
          }}>
            CURRENT STAGE
          </div>
        </div>

        {/* Install timer (only on install stage) */}
        {currentStage === 'install' && (
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${config.color}20` }}>
            <InstallTimer
              projectId={projectId}
              orgId={orgId}
              installerId={userId}
            />
          </div>
        )}

        {/* Vinyl condition notes (install stage) */}
        {currentStage === 'install' && (
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${config.color}20` }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
              Vinyl Condition Notes (if any issue)
            </div>
            <textarea
              value={vinylNotes}
              onChange={e => setVinylNotes(e.target.value)}
              rows={2}
              placeholder="Note any issues — will send back to production if needed..."
              style={{
                width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--text1)',
                outline: 'none', resize: 'none',
              }}
            />
          </div>
        )}

        {/* Checklist */}
        <div style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>
            Requirements Checklist
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {config.checklist.map(item => (
              <label key={item.key} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 8, cursor: 'pointer',
                background: checklist[item.key] ? 'rgba(34,197,94,0.06)' : 'var(--surface2)',
                border: `1px solid ${checklist[item.key] ? 'rgba(34,197,94,0.2)' : 'var(--border)'}`,
              }}>
                <input
                  type="checkbox"
                  checked={!!checklist[item.key]}
                  onChange={() => toggleCheck(item.key)}
                  style={{ width: 18, height: 18, accentColor: '#22c55e', cursor: 'pointer' }}
                />
                <span style={{
                  fontSize: 12, fontWeight: 600,
                  color: checklist[item.key] ? 'var(--green)' : 'var(--text2)',
                  textDecoration: checklist[item.key] ? 'line-through' : 'none',
                }}>
                  {item.required ? '' : '(optional) '}{item.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{
          padding: '16px 20px',
          borderTop: `1px solid ${config.color}20`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <button
            onClick={() => setShowSendBack(true)}
            disabled={stageIdx === 0}
            style={{
              padding: '10px 20px', borderRadius: 9, fontWeight: 700, fontSize: 13,
              cursor: stageIdx === 0 ? 'not-allowed' : 'pointer',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
              color: '#ef4444', opacity: stageIdx === 0 ? 0.4 : 1,
            }}
          >
            ⬅ Send Back
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {!requiredComplete && (
              <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>
                ⚠ Complete all required items
              </span>
            )}
            <button
              onClick={signOff}
              disabled={!requiredComplete || saving}
              style={{
                padding: '12px 28px', borderRadius: 10, fontWeight: 800, fontSize: 14,
                cursor: requiredComplete ? 'pointer' : 'not-allowed', border: 'none',
                background: requiredComplete ? config.color : 'var(--surface2)',
                color: requiredComplete ? '#fff' : 'var(--text3)',
                opacity: saving ? 0.6 : 1,
                boxShadow: requiredComplete ? `0 4px 16px ${config.color}40` : 'none',
              }}
            >
              {saving ? 'Signing off...' : `✓ Sign Off ${config.label}`}
            </button>
          </div>
        </div>
      </div>

      {/* Send back modal */}
      <SendBackModal
        isOpen={showSendBack}
        onClose={() => setShowSendBack(false)}
        projectId={projectId}
        orgId={orgId}
        userId={userId}
        fromStage={currentStage}
        onSendBack={(toStage) => onStageAdvance(toStage)}
      />
    </div>
  )
}
