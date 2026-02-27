'use client'

import { useState } from 'react'
import { usePortal } from '@/lib/portal-context'
import { C, PORTAL_STAGES, getPortalStageIndex, fmt } from '@/lib/portal-theme'
import Link from 'next/link'
import {
  CheckCircle2, Circle, MapPin, Calendar, MessageSquare,
  Image, ArrowLeft, Clock,
} from 'lucide-react'

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
}

export default function PortalJobDetail({ project, photos, proofs, milestones }: Props) {
  const { token } = usePortal()
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

      {/* Stage timeline */}
      <section style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
      }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Progress</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {PORTAL_STAGES.map((stage, i) => {
            const done = i < currentIdx
            const active = i === currentIdx
            const color = done ? C.green : active ? C.accent : C.text3
            return (
              <div key={stage.key} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                {/* Line */}
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
                {/* Icon */}
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
                {/* Label */}
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
      </section>

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
            <Image size={16} style={{ display: 'inline', marginRight: 6 }} />
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
