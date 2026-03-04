'use client'

import { useState } from 'react'
import MockupBox from '@/components/projects/MockupBox'
import ProofingPanel from '@/components/projects/ProofingPanel'
import JobChat from '@/components/chat/JobChat'
import { Image as ImageIcon, CheckSquare, MessageSquare, Palette, Link2, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react'
import type { Profile, Project } from '@/types'

interface Props {
  project: Project
  profile: Profile
  orgId: string
  currentUserId: string
  currentUserName: string
  designBrief?: string
  onBriefChange?: (v: string) => void
  onBriefBlur?: (v: string) => void
}

type Section = 'brief' | 'intake' | 'mockups' | 'proofs' | 'chat'

const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: 'var(--text1)', fontSize: 13, boxSizing: 'border-box' }

export default function JobDesignTab({ project, profile, orgId, currentUserId, currentUserName, designBrief = '', onBriefChange, onBriefBlur }: Props) {
  const [section, setSection] = useState<Section>('brief')
  const [intakeCopied, setIntakeCopied] = useState(false)

  const fd = (project.form_data as any) || {}
  const customerName = project.customer?.name || fd.client || fd.clientName || project.title || ''
  const customerPhone = fd.clientPhone || fd.phone || (project.customer as any)?.phone || null
  const customerEmail = fd.clientEmail || fd.email || project.customer?.email || null
  const vehicle = project.vehicle_desc || [fd.vehicleYear, fd.vehicleMake, fd.vehicleModel].filter(Boolean).join(' ') || ''
  const proofToken = fd.proof_token || null
  const intakeToken = fd.intake_token || null
  const intakeSubmitted = !!fd.intake_submitted_at

  const intakeLink = intakeToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/onboard/${intakeToken}`
    : null

  const SECTIONS: { key: Section; label: string; icon: React.ReactNode }[] = [
    { key: 'brief',   label: 'Design Brief', icon: <Palette size={13} /> },
    { key: 'intake',  label: 'Customer Intake', icon: <Link2 size={13} /> },
    { key: 'mockups', label: 'Mockups', icon: <ImageIcon size={13} /> },
    { key: 'proofs',  label: 'Proofs',  icon: <CheckSquare size={13} /> },
    { key: 'chat',    label: 'Designer Chat', icon: <MessageSquare size={13} /> },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Section selector */}
      <div style={{ display: 'flex', gap: 2, background: 'var(--surface)', borderRadius: 10, padding: 4, flexWrap: 'wrap' }}>
        {SECTIONS.map(s => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            style={{
              flex: 1, minWidth: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              padding: '7px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
              background: section === s.key ? 'var(--accent)' : 'transparent',
              color: section === s.key ? '#fff' : 'var(--text2)',
            }}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* Design Brief */}
      {section === 'brief' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Completion indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: designBrief.trim() ? 'rgba(34,192,122,0.08)' : 'rgba(242,90,90,0.06)', border: `1px solid ${designBrief.trim() ? 'rgba(34,192,122,0.25)' : 'rgba(242,90,90,0.2)'}` }}>
            {designBrief.trim()
              ? <CheckCircle2 size={13} style={{ color: 'var(--green)' }} />
              : <AlertCircle size={13} style={{ color: 'var(--red)' }} />}
            <span style={{ fontSize: 12, fontWeight: 700, color: designBrief.trim() ? 'var(--green)' : 'var(--red)' }}>
              {designBrief.trim() ? 'Design brief complete' : 'Design brief required — describe design direction'}
            </span>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: 'Barlow Condensed, sans-serif' }}>Design Direction *</div>
            <textarea
              value={designBrief}
              onChange={e => onBriefChange?.(e.target.value)}
              onBlur={e => onBriefBlur?.(e.target.value)}
              placeholder="Describe the design direction, customer's vision, style preferences, colors, themes, must-haves or must-avoids…"
              style={{ ...inputStyle, minHeight: 120, resize: 'vertical', border: !designBrief.trim() ? '1px solid rgba(242,90,90,0.3)' : '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontFamily: 'Barlow Condensed, sans-serif' }}>Install Logistics</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4, fontWeight: 600 }}>Install Location</div>
                <input value={fd.install_location || ''} readOnly placeholder="Address or 'shop'" style={inputStyle} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4, fontWeight: 600 }}>Install Type</div>
                <input value={fd.install_type || ''} readOnly placeholder="Shop / Mobile / Off-site" style={inputStyle} />
              </div>
            </div>
          </div>

          {(fd.surface_prep_notes || fd.wrap_restrictions) && (
            <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 16 }}>
              {fd.surface_prep_notes && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Surface Prep Notes</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{fd.surface_prep_notes}</div>
                </div>
              )}
              {fd.wrap_restrictions && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Wrap Restrictions</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{fd.wrap_restrictions}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Customer Intake */}
      {section === 'intake' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: intakeSubmitted ? 'rgba(34,192,122,0.08)' : 'rgba(79,127,255,0.06)', border: `1px solid ${intakeSubmitted ? 'rgba(34,192,122,0.25)' : 'rgba(79,127,255,0.2)'}` }}>
            {intakeSubmitted
              ? <CheckCircle2 size={13} style={{ color: 'var(--green)' }} />
              : <AlertCircle size={13} style={{ color: 'var(--accent)' }} />}
            <span style={{ fontSize: 12, fontWeight: 700, color: intakeSubmitted ? 'var(--green)' : 'var(--accent)' }}>
              {intakeSubmitted ? `Customer intake submitted${fd.intake_submitted_at ? ` on ${new Date(fd.intake_submitted_at).toLocaleDateString()}` : ''}` : 'Customer intake pending'}
            </span>
          </div>

          {/* Send link */}
          <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)', marginBottom: 6 }}>Customer Design Intake Link</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>
              Send this link to your customer so they can upload their logo, brand colors, design inspiration photos, and answer questions about their project.
            </div>
            {intakeLink ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1, padding: '7px 10px', background: 'var(--bg)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {intakeLink}
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(intakeLink); setIntakeCopied(true); setTimeout(() => setIntakeCopied(false), 2000) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 6, border: 'none', background: intakeCopied ? 'rgba(34,192,122,0.15)' : 'var(--accent)', color: intakeCopied ? 'var(--green)' : '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}
                >
                  {intakeCopied ? <Check size={13} /> : <Copy size={13} />}
                  {intakeCopied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>
                No intake link generated yet. Create an onboarding token to generate a link.
              </div>
            )}
          </div>

          {/* Submitted data */}
          {intakeSubmitted && (
            <div style={{ background: 'var(--surface)', border: '1px solid rgba(34,192,122,0.2)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', marginBottom: 12 }}>Customer Submitted</div>
              {fd.intake_brand_colors && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Brand Colors</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>{fd.intake_brand_colors}</div>
                </div>
              )}
              {fd.intake_design_brief && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Customer's Design Notes</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{fd.intake_design_brief}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {section === 'mockups' && (
        <MockupBox
          projectId={project.id}
          orgId={orgId}
          proofToken={proofToken}
          customerName={customerName}
          customerPhone={customerPhone}
          customerEmail={customerEmail}
          vehicle={vehicle}
        />
      )}

      {section === 'proofs' && (
        <ProofingPanel project={project} profile={profile} />
      )}

      {section === 'chat' && (
        <div style={{ background: 'var(--surface)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden', height: 480 }}>
          <JobChat
            projectId={project.id}
            orgId={orgId}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            customerName={customerName}
            installerName=""
            defaultChannel="designer"
          />
        </div>
      )}
    </div>
  )
}
