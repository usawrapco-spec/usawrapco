'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShieldCheck, AlertTriangle, X, Check, ArrowRight, Lock, Unlock } from 'lucide-react'
import type { Profile } from '@/types'
import { canAccess } from '@/types'

const headingFont = 'Barlow Condensed, sans-serif'
const monoFont = 'JetBrains Mono, monospace'

// Gate requirements for each pipeline stage transition
const GATE_REQUIREMENTS: Record<string, { label: string; permission: string; checklist: string[] }> = {
  'sales_in→production': {
    label: 'Sales Sign-Off',
    permission: 'sign_off_sales',
    checklist: [
      'Customer info complete (name, email, phone)',
      'Vehicle info verified (year, make, model)',
      'Estimate approved by customer',
      'Deposit received or payment terms set',
      'Design brief submitted',
      'Materials ordered or in stock',
    ],
  },
  'production→install': {
    label: 'Production Sign-Off',
    permission: 'sign_off_production',
    checklist: [
      'Print file approved and printed',
      'Lamination complete',
      'Quality check passed (no color issues, bubbles, alignment)',
      'Materials cut and ready for install',
      'Install scheduled with customer',
      'Vehicle drop-off confirmed',
    ],
  },
  'install→prod_review': {
    label: 'Install Complete',
    permission: 'sign_off_install',
    checklist: [
      'All panels installed per spec',
      'Edges sealed and tucked',
      'No bubbles, wrinkles, or lifting',
      'Customer walkthrough completed',
      'Before/after photos taken',
      'Install time logged',
    ],
  },
  'prod_review→sales_close': {
    label: 'QC Approval',
    permission: 'sign_off_production',
    checklist: [
      'QC inspection passed',
      'Photo documentation complete',
      'No defects or rework needed',
      'Customer satisfaction confirmed',
    ],
  },
  'sales_close→done': {
    label: 'Final Close',
    permission: 'sign_off_sales',
    checklist: [
      'Final invoice sent',
      'Payment collected in full',
      'Customer review requested',
      'Warranty info provided',
      'Job files archived',
    ],
  },
}

interface Props {
  isOpen: boolean
  onClose: () => void
  project: any
  fromStage: string
  toStage: string
  profile: Profile
  onConfirm: (notes: string) => void
}

export default function StageGateModal({ isOpen, onClose, project, fromStage, toStage, profile, onConfirm }: Props) {
  const gateKey = `${fromStage}→${toStage}`
  const gate = GATE_REQUIREMENTS[gateKey]
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [notes, setNotes] = useState('')
  const [override, setOverride] = useState(false)

  if (!isOpen || !gate) return null

  const hasPermission = canAccess(profile.role, gate.permission as any) ||
    profile.role === 'owner' || profile.role === 'admin'
  const allChecked = checked.size === gate.checklist.length
  const canProceed = (allChecked || override) && hasPermission

  function toggleCheck(i: number) {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, width: 520, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={18} style={{ color: 'var(--accent)' }} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 900, fontFamily: headingFont, color: 'var(--text1)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {gate.label}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                {project.title || 'Job'} · Moving to {toStage.replace('_', ' ')}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {/* Permission check */}
          {!hasPermission && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', marginBottom: 16,
              background: 'rgba(242,90,90,0.08)', border: '1px solid rgba(242,90,90,0.2)', borderRadius: 10,
            }}>
              <Lock size={16} style={{ color: 'var(--red)', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)' }}>Permission Required</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                  You need the &ldquo;{gate.permission.replace(/_/g, ' ')}&rdquo; permission to approve this transition.
                </div>
              </div>
            </div>
          )}

          {/* Checklist */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, fontFamily: headingFont }}>
              Sign-Off Checklist ({checked.size}/{gate.checklist.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {gate.checklist.map((item, i) => {
                const isChecked = checked.has(i)
                return (
                  <div
                    key={i}
                    onClick={() => toggleCheck(i)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                      background: isChecked ? 'rgba(34,192,122,0.06)' : 'var(--bg)',
                      border: `1px solid ${isChecked ? 'rgba(34,192,122,0.2)' : 'var(--border)'}`,
                      borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                      background: isChecked ? 'var(--green)' : 'transparent',
                      border: `2px solid ${isChecked ? 'var(--green)' : 'var(--text3)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isChecked && <Check size={12} color="#fff" />}
                    </div>
                    <span style={{
                      fontSize: 13, color: isChecked ? 'var(--text1)' : 'var(--text2)',
                      textDecoration: isChecked ? 'line-through' : 'none',
                    }}>{item}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Override (admin only) */}
          {(profile.role === 'owner' || profile.role === 'admin') && !allChecked && (
            <div
              onClick={() => setOverride(!override)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 16,
                background: override ? 'rgba(245,158,11,0.08)' : 'var(--bg)',
                border: `1px solid ${override ? 'rgba(245,158,11,0.2)' : 'var(--border)'}`,
                borderRadius: 8, cursor: 'pointer',
              }}
            >
              <Unlock size={14} style={{ color: override ? 'var(--amber)' : 'var(--text3)' }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: override ? 'var(--amber)' : 'var(--text2)' }}>
                  Admin Override
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  Skip remaining checklist items (logged for audit)
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, fontFamily: headingFont }}>
              Sign-Off Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any notes for this stage transition..."
              style={{
                width: '100%', minHeight: 60, padding: '10px 12px', background: 'var(--bg)',
                border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)',
                fontSize: 13, outline: 'none', resize: 'vertical',
              }}
            />
          </div>

          {/* Incomplete warning */}
          {!allChecked && !override && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginTop: 12,
              fontSize: 12, color: 'var(--amber)',
            }}>
              <AlertTriangle size={14} />
              Complete all checklist items or use admin override to proceed
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px', borderRadius: 9, fontWeight: 700, fontSize: 13,
            cursor: 'pointer', background: 'var(--surface2)', border: '1px solid var(--border)',
            color: 'var(--text2)',
          }}>
            Cancel
          </button>
          <button
            onClick={() => canProceed && onConfirm(notes)}
            disabled={!canProceed}
            style={{
              flex: 1, padding: '10px', borderRadius: 9, fontWeight: 800, fontSize: 13,
              cursor: canProceed ? 'pointer' : 'not-allowed',
              background: canProceed ? 'var(--green)' : 'var(--surface2)',
              border: 'none', color: canProceed ? '#fff' : 'var(--text3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              opacity: canProceed ? 1 : 0.5,
            }}
          >
            <ShieldCheck size={14} /> Approve & Advance
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
