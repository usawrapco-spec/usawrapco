'use client'

import { useState, useEffect } from 'react'
import type { Profile } from '@/types'
import {
  Download, FileText, Loader2, Clock, DollarSign, Users,
  RefreshCw, ExternalLink, Check,
} from 'lucide-react'

interface GustoExport {
  id: string
  export_type: string
  period_start: string
  period_end: string
  file_name: string
  row_count: number
  total_amount: number
  csv_data: string | null
  created_at: string
  exporter?: { id: string; name: string } | null
}

function fmt(n: number) { return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') }
function fmtDateShort(s: string): string {
  const d = new Date(s + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtDateTime(s: string): string {
  return new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: typeof DollarSign }> = {
  w2: { label: 'W2 Payroll', color: 'var(--accent)', icon: Users },
  '1099': { label: '1099 Contractor', color: 'var(--cyan)', icon: DollarSign },
  hours: { label: 'Hours Summary', color: 'var(--amber)', icon: Clock },
}

export default function GustoExportClient({ profile }: { profile: Profile }) {
  const [exports, setExports] = useState<GustoExport[]>([])
  const [loading, setLoading] = useState(true)

  const fetchExports = () => {
    setLoading(true)
    fetch('/api/payroll/gusto-export')
      .then(r => r.json())
      .then(d => { setExports(d.exports || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchExports() }, [])

  const handleRedownload = (exp: GustoExport) => {
    if (!exp.csv_data) return
    const blob = new Blob([exp.csv_data], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = exp.file_name
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      {/* ── Instructions Panel ───────────────────────────────────────────── */}
      <div style={{
        background: 'var(--surface)', borderRadius: 12, padding: 20,
        border: '1px solid #2a2d3a', marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <FileText size={18} color="var(--accent)" />
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', fontFamily: 'var(--font-barlow)' }}>
            Gusto CSV Export
          </span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 12 }}>
          Since Gusto does not have a public API for direct payroll submission, we generate CSV files
          that match Gusto&apos;s import format exactly. Follow these steps to import your payroll:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            {
              step: '1',
              title: 'Run Payroll',
              desc: 'Go to the Dashboard tab and click "Run Payroll" for the current period. This calculates all W2 and 1099 pay.',
              color: 'var(--green)',
            },
            {
              step: '2',
              title: 'Download CSVs',
              desc: 'Click "Export to Gusto CSV" to download separate files for W2 employees, 1099 contractors, and hours summary.',
              color: 'var(--accent)',
            },
            {
              step: '3',
              title: 'Import into Gusto',
              desc: 'Log into Gusto > Payroll > Run Payroll > Import. Upload the CSV. Review amounts and submit.',
              color: 'var(--purple)',
            },
          ].map(s => (
            <div key={s.step} style={{
              padding: 14, borderRadius: 10, background: 'var(--surface2)',
              border: '1px solid #2a2d3a',
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', background: s.color + '22',
                color: s.color, fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-mono)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8,
              }}>{s.step}</div>
              <div style={{ fontWeight: 600, color: 'var(--text1)', fontSize: 13, marginBottom: 4 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          ))}
        </div>

        {/* CSV format info */}
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { type: 'W2 Payroll CSV', fields: 'Employee ID, First Name, Last Name, Pay Type, Hours, Amount', color: 'var(--accent)' },
            { type: '1099 Contractor CSV', fields: 'Contractor ID, First Name, Last Name, Pay Type, Amount, Description', color: 'var(--cyan)' },
            { type: 'Hours Summary CSV', fields: 'Employee ID, First Name, Last Name, Date, Hours, Job/Project, Notes', color: 'var(--amber)' },
          ].map(f => (
            <div key={f.type} style={{
              padding: '10px 12px', borderRadius: 8,
              background: f.color + '08', border: `1px solid ${f.color}33`,
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: f.color, marginBottom: 4, textTransform: 'uppercase' }}>{f.type}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{f.fields}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Export History ────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--surface)', borderRadius: 12, border: '1px solid #2a2d3a',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 16px', borderBottom: '1px solid #2a2d3a',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={16} color="var(--accent)" />
            <span style={{ fontWeight: 700, color: 'var(--text1)' }}>Export History</span>
          </div>
          <button onClick={fetchExports} style={{
            padding: '5px 10px', borderRadius: 6, border: '1px solid #2a2d3a',
            background: 'transparent', color: 'var(--text2)', fontSize: 12,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: 'var(--text2)' }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', marginRight: 8 }} />
            Loading export history...
          </div>
        ) : exports.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
            No exports yet. Run payroll from the Dashboard tab and export to Gusto.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2a2d3a' }}>
                {['Type', 'Period', 'File', 'Rows', 'Total', 'Exported', 'By', 'Actions'].map(h => (
                  <th key={h} style={{
                    textAlign: h === 'Type' || h === 'Period' || h === 'File' || h === 'By' ? 'left' : h === 'Actions' ? 'center' : 'right',
                    padding: '10px 12px', fontSize: 10, color: 'var(--text2)',
                    fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {exports.map(exp => {
                const cfg = TYPE_CONFIG[exp.export_type] || { label: exp.export_type, color: 'var(--text2)', icon: FileText }
                const Icon = cfg.icon
                return (
                  <tr key={exp.id} style={{ borderBottom: '1px solid #1a1d27' }}>
                    <td style={{ padding: 12 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                        background: cfg.color + '22', color: cfg.color,
                      }}>
                        <Icon size={11} /> {cfg.label}
                      </span>
                    </td>
                    <td style={{ padding: 12, fontSize: 13, color: 'var(--text1)' }}>
                      {fmtDateShort(exp.period_start)} — {fmtDateShort(exp.period_end)}
                    </td>
                    <td style={{ padding: 12, fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--font-mono)' }}>
                      {exp.file_name}
                    </td>
                    <td style={{ padding: 12, textAlign: 'right', fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text1)' }}>
                      {exp.row_count}
                    </td>
                    <td style={{ padding: 12, textAlign: 'right', fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--green)' }}>
                      {fmt(exp.total_amount)}
                    </td>
                    <td style={{ padding: 12, textAlign: 'right', fontSize: 12, color: 'var(--text2)' }}>
                      {fmtDateTime(exp.created_at)}
                    </td>
                    <td style={{ padding: 12, fontSize: 12, color: 'var(--text3)' }}>
                      {exp.exporter?.name || '—'}
                    </td>
                    <td style={{ padding: 12, textAlign: 'center' }}>
                      {exp.csv_data ? (
                        <button onClick={() => handleRedownload(exp)} style={{
                          padding: '4px 8px', borderRadius: 6, border: '1px solid #2a2d3a',
                          background: 'transparent', color: 'var(--text2)', fontSize: 11,
                          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}>
                          <Download size={11} /> Re-download
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
