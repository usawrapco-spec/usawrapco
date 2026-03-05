'use client'

import { useState } from 'react'
import { usePortal } from '@/lib/portal-context'
import { C, PORTAL_STAGES, getPortalStageIndex, fmt } from '@/lib/portal-theme'
import Link from 'next/link'
import {
  CheckCircle2, Circle, MapPin, Calendar, MessageSquare, Camera,
  Image as ImageIcon, ArrowLeft, Clock, FileText, CreditCard, ClipboardList, ChevronRight,
} from 'lucide-react'
import type { TimelineMilestone } from '@/components/projects/JobTimeline'
import PortalCustomerTimeline from './PortalCustomerTimeline'
import PortalMessages from './PortalMessages'

interface Props {
  project: {
    id: string; title: string; vehicle_desc: string | null; pipe_stage: string
    install_date: string | null; install_address: string | null; is_mobile_install: boolean
    install_completed_date: string | null; warranty_years: number; warranty_expiry: string | null
    created_at: string; notes: string | null
  }
  photos: { id: string; image_url: string; category: string | null; description: string | null; created_at: string }[]
  proofs: { id: string; image_url: string; version_number: number; customer_status: string; created_at: string }[]
  milestones: { id: string; stage: string; approved_at: string | null; notes: string | null }[]
  hasEstimate?: boolean
  hasInvoice?: boolean
  invoicePaid?: boolean
  hasSalesOrder?: boolean
  timelineMilestones?: TimelineMilestone[]
  token?: string
  jobMessages?: { id: string; sender_name: string; body: string; direction: string; created_at: string; project_id?: string | null; customer_id?: string | null; attachment_url?: string | null }[]
  customerId?: string
}

export default function PortalJobDetail({ project, photos, proofs, milestones, hasEstimate, hasInvoice, invoicePaid, hasSalesOrder, timelineMilestones, token: tokenProp, jobMessages, customerId }: Props) {
  const portal = usePortal()
  const token = tokenProp || portal.token
  const base = `/portal/${token}`
  const currentIdx = getPortalStageIndex(project.pipe_stage)
  const [lightbox, setLightbox] = useState<string | null>(null)

  return (
    <div style={{ padding: '20px 16px' }}>
      {/* Back */}
      <Link href={`${base}/jobs`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: C.accent, textDecoration: 'none', fontSize: 13, marginBottom: 16 }}>
        <ArrowLeft size={16} /> All Projects
      </Link>

      {/* Title */}
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)' }}>
        {project.title}
      </h1>
      {project.vehicle_desc && (
        <div style={{ fontSize: 13, color: C.text2, marginBottom: 20 }}>{project.vehicle_desc}</div>
      )}

      {/* Job Timeline */}
      <section style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
      }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Progress</h2>
        {timelineMilestones ? (
          <PortalCustomerTimeline milestones={timelineMilestones} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {PORTAL_STAGES.map((stage, i) => {
              const done = i < currentIdx
              const active = i === currentIdx
              const color = done ? C.green : active ? C.accent : C.text3
              return (
                <div key={stage.key} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                  {i < PORTAL_STAGES.length - 1 && (
                    <div style={{
                      position: 'absolute',
                      left: 9,
                      top: 22,
                      width: 2,
                      height: 28,
                      background: done ? C.green : C.border,
                    }} />
                  )}
                  <div style={{ flexShrink: 0, marginTop: 1 }}>
                    {done ? (
                      <CheckCircle2 size={20} color={C.green} />
                    ) : active ? (
                      <div style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: `2px solid ${C.accent}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <div style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: C.accent,
                          animation: 'portalPulse 2s ease-in-out infinite',
                        }} />
                      </div>
                    ) : (
                      <Circle size={20} color={C.text3} />
                    )}
                  </div>
                  <div style={{ paddingBottom: 20 }}>
                    <div style={{ fontSize: 14, fontWeight: active ? 600 : 400, color }}>
                      {stage.label}
                    </div>
                    {active && (
                      <div style={{ fontSize: 11, color: C.accent, marginTop: 2 }}>Current stage</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Upload Photos CTA */}
      <Link
        href={`${base}/upload?project=${project.id}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '14px 20px',
          background: `${C.green}15`,
          border: `1px solid ${C.green}35`,
          color: C.green,
          borderRadius: 12,
          fontWeight: 600,
          fontSize: 14,
          textDecoration: 'none',
          marginBottom: 20,
        }}
      >
        <Camera size={18} />
        Upload Photos & Measurements
      </Link>

      {/* Details */}
      <section style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
      }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Details</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {project.install_date && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={14} color={C.text3} />
              <span style={{ fontSize: 13, color: C.text2 }}>Install: {fmt(project.install_date)}</span>
            </div>
          )}
          {project.install_address && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MapPin size={14} color={C.text3} />
              <span style={{ fontSize: 13, color: C.text2 }}>{project.install_address}</span>
            </div>
          )}
          {project.install_completed_date && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={14} color={C.green} />
              <span style={{ fontSize: 13, color: C.text2 }}>Completed: {fmt(project.install_completed_date)}</span>
            </div>
          )}
          {project.warranty_expiry && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={14} color={C.text3} />
              <span style={{ fontSize: 13, color: C.text2 }}>Warranty until {fmt(project.warranty_expiry)}</span>
            </div>
          )}
        </div>
      </section>

      {/* Milestones */}
      {milestones.length > 0 && (
        <section style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Milestones</h2>
          {milestones.map((m) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
              <CheckCircle2 size={14} color={C.green} />
              <span style={{ fontSize: 13 }}>{m.stage}</span>
              {m.approved_at && <span style={{ fontSize: 11, color: C.text3, marginLeft: 'auto' }}>{fmt(m.approved_at)}</span>}
            </div>
          ))}
        </section>
      )}

      {/* Photos */}
      {photos.length > 0 && (
        <section style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
            <ImageIcon size={16} style={{ display: 'inline', marginRight: 6 }} />
            Photos
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {photos.slice(0, 9).map((photo) => (
              <div
                key={photo.id}
                onClick={() => setLightbox(photo.image_url)}
                style={{
                  aspectRatio: '1',
                  borderRadius: 8,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  background: C.surface2,
                }}
              >
                <img
                  src={photo.image_url}
                  alt={photo.description || 'Project photo'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Documents section */}
      {(hasEstimate || hasInvoice || hasSalesOrder) && (
        <section style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          overflow: 'hidden',
          marginBottom: 20,
        }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}` }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Documents</h2>
          </div>
          {hasEstimate && (
            <Link href={`${base}/jobs/${project.id}/estimate`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: (hasInvoice || hasSalesOrder) ? `1px solid ${C.border}` : 'none' }}>
                <FileText size={18} color={C.accent} strokeWidth={1.8} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>Estimate</span>
                <ChevronRight size={16} color={C.text3} />
              </div>
            </Link>
          )}
          {hasSalesOrder && (
            <Link href={`${base}/jobs/${project.id}/sales-order`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: hasInvoice ? `1px solid ${C.border}` : 'none' }}>
                <ClipboardList size={18} color={'#8b5cf6'} strokeWidth={1.8} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>Sales Order</span>
                <ChevronRight size={16} color={C.text3} />
              </div>
            </Link>
          )}
          {hasInvoice && (
            <Link href={`${base}/jobs/${project.id}/invoice`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                <CreditCard size={18} color={invoicePaid ? '#22c07a' : '#f59e0b'} strokeWidth={1.8} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>Invoice</span>
                {invoicePaid ? (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#22c07a', padding: '2px 8px', background: '#22c07a18', borderRadius: 5 }}>PAID</span>
                ) : (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', padding: '2px 8px', background: '#f59e0b18', borderRadius: 5 }}>DUE</span>
                )}
                <ChevronRight size={16} color={C.text3} />
              </div>
            </Link>
          )}
        </section>
      )}

      {/* Quick action */}
      <Link
        href={`${base}/messages`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '14px 20px',
          background: C.accent,
          color: '#fff',
          borderRadius: 12,
          fontWeight: 600,
          fontSize: 14,
          textDecoration: 'none',
        }}
      >
        <MessageSquare size={18} />
        Message the Team
      </Link>

      {/* Job Chat */}
      {jobMessages && customerId && (
        <div style={{ marginTop: 20, background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageSquare size={16} style={{ color: C.accent }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text1, fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Job Chat
            </span>
            <span style={{ fontSize: 11, color: C.text3 }}>({jobMessages.length} messages)</span>
          </div>
          <div style={{ maxHeight: 400, overflow: 'hidden' }}>
            <PortalMessages
              initialMessages={jobMessages}
              customerId={customerId}
              customerName={portal.customer.name}
              orgId={portal.customer.id}
              projectId={project.id}
            />
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.9)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <img src={lightbox} alt="" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 8 }} />
        </div>
      )}

      {/* Pulse animation */}
      <style>{`
        @keyframes portalPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
    </div>
  )
}
