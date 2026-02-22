'use client'

import { Printer, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ProductionBriefClientProps {
  project: any
  profile: any
}

export default function ProductionBriefClient({ project, profile }: ProductionBriefClientProps) {
  const router = useRouter()
  const fd = project.form_data || {}
  const fin = project.fin_data || {}

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
      <button
        onClick={() => router.back()}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          marginBottom: 24, background: 'none', border: 'none',
          cursor: 'pointer', color: 'var(--text3)', fontSize: 13, fontWeight: 600,
        }}
      >
        <ArrowLeft size={14} /> Back
      </button>

      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 32, marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <Printer size={24} style={{ color: 'var(--green)' }} />
          <div>
            <div style={{
              fontFamily: 'Barlow Condensed, sans-serif', fontSize: 24,
              fontWeight: 900, color: 'var(--text1)', textTransform: 'uppercase',
            }}>
              Production Brief
            </div>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>
              Job #{project.id?.slice(0, 8)} — {project.title}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <InfoBlock label="Customer" value={fd.client || fd.clientName || project.title || '—'} />
          <InfoBlock label="Vehicle" value={project.vehicle_desc || fd.vehicle || '—'} />
          <InfoBlock label="Wrap Type" value={fd.wrapDetail || fd.jobType || '—'} />
          <InfoBlock label="Material" value={fd.matSku || '—'} />
          <InfoBlock label="Square Feet" value={fd.sqft ? `${fd.sqft} sqft` : '—'} />
          <InfoBlock label="Linear Feet Est." value={fd.sqft ? `${Math.ceil(parseFloat(fd.sqft) / 4.5)} lf` : '—'} />
          <InfoBlock label="Install Date" value={project.install_date ? new Date(project.install_date).toLocaleDateString() : '—'} />
          <InfoBlock label="Priority" value={project.priority || 'normal'} />
        </div>

        {fd.designNotes && (
          <div style={{ marginTop: 20 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: 'var(--text3)',
              textTransform: 'uppercase', marginBottom: 6,
            }}>Design Notes</div>
            <div style={{
              padding: 12, background: 'var(--surface2)', borderRadius: 8,
              fontSize: 13, color: 'var(--text2)', lineHeight: 1.5,
            }}>
              {fd.designNotes}
            </div>
          </div>
        )}

        {fd.coverage && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: 'var(--text3)',
              textTransform: 'uppercase', marginBottom: 6,
            }}>Coverage</div>
            <div style={{
              padding: 12, background: 'var(--surface2)', borderRadius: 8,
              fontSize: 13, color: 'var(--text2)',
            }}>
              {fd.coverage}
            </div>
          </div>
        )}

        <div style={{
          marginTop: 24, padding: 16, background: 'rgba(34,192,122,0.06)',
          border: '1px solid rgba(34,192,122,0.2)', borderRadius: 10,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: 'var(--green)',
            textTransform: 'uppercase', marginBottom: 8,
          }}>Print Checklist</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              'Files prepped and color-proofed',
              'Material loaded and calibrated',
              'Test print verified',
              'All panels printed and cut',
              'Laminated / over-coated',
              'Quality check passed',
            ].map(item => (
              <label key={item} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 13, color: 'var(--text2)', cursor: 'pointer',
              }}>
                <input type="checkbox" style={{ accentColor: 'var(--green)' }} />
                {item}
              </label>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={() => window.print()}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', padding: '12px 24px', borderRadius: 10,
          background: 'var(--accent)', border: 'none', color: '#fff',
          fontSize: 14, fontWeight: 700, cursor: 'pointer',
        }}
      >
        <Printer size={16} /> Print Brief
      </button>
    </div>
  )
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 700, color: 'var(--text3)',
        textTransform: 'uppercase', marginBottom: 4,
      }}>{label}</div>
      <div style={{
        fontSize: 14, fontWeight: 600, color: 'var(--text1)',
      }}>{value}</div>
    </div>
  )
}
