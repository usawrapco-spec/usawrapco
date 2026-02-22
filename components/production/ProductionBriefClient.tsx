'use client'

import { useRouter } from 'next/navigation'
import { Printer, ArrowLeft, CheckSquare } from 'lucide-react'
import type { Profile } from '@/types'

interface Props { project: any; profile: Profile }

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—'

export default function ProductionBriefClient({ project, profile }: Props) {
  const router = useRouter()
  const fd = (project.form_data as any) || {}
  const fin = (project.fin_data as any) || {}

  const panels = [
    { label: 'Driver Side', sqft: fd.driverSideSqft || '' },
    { label: 'Passenger Side', sqft: fd.passengerSideSqft || '' },
    { label: 'Hood', sqft: fd.hoodSqft || '' },
    { label: 'Roof', sqft: fd.roofSqft || '' },
    { label: 'Tailgate / Rear', sqft: fd.tailgateSqft || '' },
    { label: 'Front Bumper', sqft: fd.frontBumperSqft || '' },
  ].filter(p => p.sqft)

  return (
    <div>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; font-family: Arial, sans-serif; }
          .print-area { background: white !important; color: black !important; }
          .brief-section { border: 1px solid #ccc !important; }
          @page { margin: 0.75in; size: letter; }
        }
        .brief-section { break-inside: avoid; }
      `}</style>

      {/* Toolbar (no-print) */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text2)', fontSize: 12, cursor: 'pointer' }}>
          <ArrowLeft size={13} /> Back
        </button>
        <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          <Printer size={13} /> Print Production Brief
        </button>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>Use browser print → Save as PDF for best results</span>
      </div>

      {/* Brief content */}
      <div className="print-area" style={{ maxWidth: 760, margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 16, borderBottom: '3px solid #1a1d27', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 900, color: '#4f7fff', letterSpacing: '0.02em' }}>USA WRAP CO</div>
            <div style={{ fontSize: 11, color: '#5a6080', marginTop: 2 }}>PRODUCTION BRIEF — INTERNAL USE ONLY</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#0d0f14', fontFamily: 'JetBrains Mono, monospace' }}>JOB #{project.id.substring(0, 8).toUpperCase()}</div>
            <div style={{ fontSize: 11, color: '#5a6080', marginTop: 2 }}>Printed: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
          </div>
        </div>

        {/* Client & Vehicle */}
        <div className="brief-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16, padding: 16, background: '#f8f9fa', borderRadius: 8 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Client</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0d0f14' }}>{fd.client || project.title}</div>
            {fd.company && <div style={{ fontSize: 12, color: '#5a6080' }}>{fd.company}</div>}
            {fd.phone && <div style={{ fontSize: 12, color: '#5a6080' }}>{fd.phone}</div>}
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Vehicle</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0d0f14' }}>{fd.vehicle || fd.selectedVehicle?.name || project.vehicle_desc || '—'}</div>
            {fd.vin && <div style={{ fontSize: 11, color: '#5a6080' }}>VIN: {fd.vin}</div>}
            {fd.vehicleColor && <div style={{ fontSize: 12, color: '#5a6080' }}>Color: {fd.vehicleColor}</div>}
          </div>
        </div>

        {/* Install & Assignment */}
        <div className="brief-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
          <div style={{ padding: '12px 14px', background: '#fff3cd', borderRadius: 8, border: '1px solid #f59e0b44' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', marginBottom: 4 }}>Install Date</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0d0f14' }}>{fd.installDate ? fmtDate(fd.installDate) : project.install_date ? fmtDate(project.install_date) : 'TBD'}</div>
          </div>
          <div style={{ padding: '12px 14px', background: '#d1fae5', borderRadius: 8, border: '1px solid #22c07a44' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#065f46', textTransform: 'uppercase', marginBottom: 4 }}>Installer</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0d0f14' }}>{fd.installer || '—'}</div>
          </div>
          <div style={{ padding: '12px 14px', background: '#ede9fe', borderRadius: 8, border: '1px solid #8b5cf644' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#4c1d95', textTransform: 'uppercase', marginBottom: 4 }}>Sales Agent</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0d0f14' }}>{fd.agent || '—'}</div>
          </div>
        </div>

        {/* Wrap Specs */}
        <div className="brief-section" style={{ padding: 16, background: '#0d0f14', borderRadius: 8, marginBottom: 16, color: '#fff' }}>
          <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, color: '#4f7fff' }}>WRAP SPECIFICATIONS</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'Coverage', value: fd.coverage || fd.wrapType || 'Full Wrap' },
              { label: 'Material / SKU', value: fd.matSku || fd.material || '—' },
              { label: 'Total Sq Ft', value: fd.sqft ? `${fd.sqft} ft²` : '—' },
              { label: 'Est. Hours', value: fd.selectedVehicle?.hrs ? `${fd.selectedVehicle.hrs}h` : fin.laborHrs ? `${fin.laborHrs}h` : '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#e8eaed' }}>{value}</div>
              </div>
            ))}
          </div>

          {fd.designNotes && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #1a1d27' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', marginBottom: 4 }}>Design Notes</div>
              <div style={{ fontSize: 12, color: '#9299b5', lineHeight: 1.5 }}>{fd.designNotes}</div>
            </div>
          )}
        </div>

        {/* Panel Breakdown */}
        {panels.length > 0 && (
          <div className="brief-section" style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', marginBottom: 12, color: '#374151' }}>PANEL BREAKDOWN</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Panel</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Sq Ft</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Lin Ft Used</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Confirmed</th>
                </tr>
              </thead>
              <tbody>
                {panels.map((p, i) => (
                  <tr key={p.label} style={{ borderBottom: i < panels.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <td style={{ padding: '8px 10px', fontSize: 13, color: '#111827', fontWeight: 600 }}>{p.label}</td>
                    <td style={{ padding: '8px 10px', fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: '#111827', textAlign: 'right' }}>{p.sqft}</td>
                    <td style={{ padding: '8px 10px' }}><div style={{ width: 80, height: 20, border: '1px solid #d1d5db', borderRadius: 3 }} /></td>
                    <td style={{ padding: '8px 10px' }}><CheckSquare size={16} style={{ color: '#d1d5db' }} /></td>
                  </tr>
                ))}
                <tr style={{ background: '#f9fafb', fontWeight: 800 }}>
                  <td style={{ padding: '8px 10px', fontSize: 13, color: '#111827' }}>TOTAL</td>
                  <td style={{ padding: '8px 10px', fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: '#111827', textAlign: 'right', fontWeight: 800 }}>
                    {panels.reduce((s, p) => s + (parseFloat(String(p.sqft)) || 0), 0).toFixed(1)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Production Checklist */}
        <div className="brief-section" style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', marginBottom: 12, color: '#374151' }}>PRODUCTION CHECKLIST</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[
              'Print files received & verified',
              'Material allocated (SKU/roll confirmed)',
              'Color profile set for HP Latex',
              'Print complete — all panels',
              'QC check on color accuracy & banding',
              'Lamination applied (if required)',
              'Panels cut to spec',
              'Panels labeled with job # and side',
              'Staged for installer pickup',
              'Linear feet logged',
            ].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                <div style={{ width: 16, height: 16, border: '1.5px solid #d1d5db', borderRadius: 3, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#374151' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="brief-section" style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', marginBottom: 12, color: '#374151' }}>PRODUCTION NOTES</div>
          <div style={{ minHeight: 60, borderBottom: '1px solid #e5e7eb', marginBottom: 12 }} />
          <div style={{ minHeight: 40 }} />
        </div>

        {/* Sign-offs */}
        <div className="brief-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          {['Production Manager', 'QC Inspector', 'Installer'].map(role => (
            <div key={role} style={{ borderTop: '2px solid #d1d5db', paddingTop: 8 }}>
              <div style={{ height: 36 }} />
              <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>{role} Signature</div>
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, color: '#9ca3af' }}>Date:</span>
                <div style={{ borderBottom: '1px solid #d1d5db', width: '60%' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 24, paddingTop: 12, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9ca3af' }}>
          <span>USA WRAP CO — CONFIDENTIAL INTERNAL DOCUMENT</span>
          <span>Job #{project.id.substring(0, 8).toUpperCase()} · Generated {new Date().toISOString().split('T')[0]}</span>
        </div>
      </div>
    </div>
  )
}
