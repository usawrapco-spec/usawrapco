'use client'

import { useState, useRef } from 'react'
import { Upload, X, Check, AlertCircle, ChevronDown, FileText, ArrowRight } from 'lucide-react'

interface ImportRow {
  name: string
  email?: string
  phone?: string
  company_name?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  notes?: string
  lead_source?: string
}

interface Props {
  onClose: () => void
  onImported: (created: number, updated: number) => void
}

// DB field → display label
const DB_FIELDS = [
  { key: 'name',         label: 'Name *',       required: true  },
  { key: 'phone',        label: 'Phone',        required: false },
  { key: 'email',        label: 'Email',        required: false },
  { key: 'company_name', label: 'Company',      required: false },
  { key: 'address',      label: 'Address',      required: false },
  { key: 'city',         label: 'City',         required: false },
  { key: 'state',        label: 'State',        required: false },
  { key: 'zip',          label: 'Zip',          required: false },
  { key: 'notes',        label: 'Notes',        required: false },
  { key: 'lead_source',  label: 'Lead Source',  required: false },
  { key: '__skip__',     label: '— Skip —',     required: false },
] as const

type DBKey = typeof DB_FIELDS[number]['key']

// Auto-detect common column header names → DB field
function autoMap(header: string): DBKey {
  const h = header.toLowerCase().trim()
  if (/^(name|full.?name|customer.?name|first.?name|contact)/.test(h)) return 'name'
  if (/^(phone|cell|mobile|tel|phone.?number|mobile.?number|ph)/.test(h)) return 'phone'
  if (/^(email|e.?mail|email.?address)/.test(h)) return 'email'
  if (/^(company|business|co\.?|company.?name|business.?name|employer)/.test(h)) return 'company_name'
  if (/^(address|street|addr|street.?address)/.test(h)) return 'address'
  if (/^(city|town)/.test(h)) return 'city'
  if (/^(state|province|st\.?)/.test(h)) return 'state'
  if (/^(zip|postal|zip.?code|postal.?code)/.test(h)) return 'zip'
  if (/^(note|notes|comment|comments|memo)/.test(h)) return 'notes'
  if (/^(source|lead.?source|referral|how.?did)/.test(h)) return 'lead_source'
  return '__skip__'
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    if (!line.trim()) continue
    const cols: string[] = []
    let cur = ''
    let inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
        else inQuote = !inQuote
      } else if (ch === ',' && !inQuote) {
        cols.push(cur); cur = ''
      } else {
        cur += ch
      }
    }
    cols.push(cur)
    rows.push(cols)
  }
  return rows
}

export default function CustomerImportModal({ onClose, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'done'>('upload')
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<number, DBKey>>({})
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ created: number; updated: number; skipped: number; errors: string[] } | null>(null)
  const [dragOver, setDragOver] = useState(false)

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const rows = parseCSV(text)
      if (rows.length < 2) return
      const hdrs = rows[0]
      const data = rows.slice(1).filter(r => r.some(c => c.trim()))
      setHeaders(hdrs)
      setRawRows(data)
      const auto: Record<number, DBKey> = {}
      hdrs.forEach((h, i) => { auto[i] = autoMap(h) })
      setMapping(auto)
      setStep('map')
    }
    reader.readAsText(file)
  }

  function buildRows(): ImportRow[] {
    // Find which column index maps to each field
    const colFor = (field: string) => {
      const entry = Object.entries(mapping).find(([, v]) => v === field)
      return entry ? parseInt(entry[0]) : -1
    }
    const nameCol = colFor('name')
    if (nameCol === -1) return []

    return rawRows.map(row => {
      const get = (field: string) => {
        const idx = colFor(field)
        return idx >= 0 ? (row[idx] || '').trim() : ''
      }
      return {
        name:         get('name'),
        phone:        get('phone') || undefined,
        email:        get('email') || undefined,
        company_name: get('company_name') || undefined,
        address:      get('address') || undefined,
        city:         get('city') || undefined,
        state:        get('state') || undefined,
        zip:          get('zip') || undefined,
        notes:        get('notes') || undefined,
        lead_source:  get('lead_source') || undefined,
      }
    }).filter(r => r.name)
  }

  const previewRows = buildRows().slice(0, 5)
  const totalRows   = buildRows().length

  async function handleImport() {
    const rows = buildRows()
    if (!rows.length) return
    setImporting(true)
    try {
      const res = await fetch('/api/customers/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      const data = await res.json()
      if (data.success) {
        setResult(data)
        setStep('done')
      } else {
        setResult({ created: 0, updated: 0, skipped: 0, errors: [data.error || 'Import failed'] })
        setStep('done')
      }
    } catch (e: any) {
      setResult({ created: 0, updated: 0, skipped: 0, errors: [e.message] })
      setStep('done')
    }
    setImporting(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      zIndex: 9999, display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, width: '100%', maxWidth: 640,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 24px', borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 900, color: 'var(--text1)' }}>
              Import Customers
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
              CSV or spreadsheet export · Existing customers updated, new ones added
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* ── STEP: UPLOAD ─────────────────────────────────────────────── */}
          {step === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 12, padding: '40px 24px',
                  textAlign: 'center', cursor: 'pointer',
                  background: dragOver ? 'rgba(79,127,255,0.05)' : 'var(--surface2)',
                  transition: 'all 0.15s',
                }}
              >
                <Upload size={32} style={{ color: 'var(--accent)', margin: '0 auto 12px' }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 4 }}>
                  Drop your CSV here or click to browse
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                  Supports .csv files exported from Excel, Google Sheets, or any CRM
                </div>
                <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              </div>

              {/* Template hint */}
              <div style={{
                padding: '12px 16px', background: 'var(--surface2)',
                border: '1px solid var(--border)', borderRadius: 10,
                fontSize: 12, color: 'var(--text3)', lineHeight: 1.6,
              }}>
                <div style={{ fontWeight: 700, color: 'var(--text2)', marginBottom: 4 }}>Expected columns (any order):</div>
                Name · Phone · Email · Company · Address · City · State · Zip · Notes · Lead Source
                <br />
                Only <strong style={{ color: 'var(--text1)' }}>Name</strong> is required. All others are optional.
              </div>
            </div>
          )}

          {/* ── STEP: MAP ────────────────────────────────────────────────── */}
          {step === 'map' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                Found <strong style={{ color: 'var(--text1)' }}>{rawRows.length}</strong> rows and{' '}
                <strong style={{ color: 'var(--text1)' }}>{headers.length}</strong> columns.
                Review the column mapping below.
              </div>

              <div style={{
                border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden',
              }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr',
                  padding: '8px 14px', background: 'var(--surface2)',
                  fontSize: 10, fontWeight: 700, color: 'var(--text3)',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  borderBottom: '1px solid var(--border)',
                }}>
                  <span>Spreadsheet Column</span>
                  <span>Maps To</span>
                </div>
                {headers.map((h, i) => (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr',
                    padding: '8px 14px', alignItems: 'center',
                    borderBottom: i < headers.length - 1 ? '1px solid var(--border)' : 'none',
                    background: mapping[i] === '__skip__' ? 'transparent' : 'rgba(79,127,255,0.03)',
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 13, color: 'var(--text1)', fontWeight: 600 }}>{h}</span>
                      {rawRows[0]?.[i] && (
                        <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
                          e.g. {rawRows[0][i].slice(0, 28)}{rawRows[0][i].length > 28 ? '…' : ''}
                        </span>
                      )}
                    </div>
                    <div style={{ position: 'relative' }}>
                      <select
                        value={mapping[i] || '__skip__'}
                        onChange={e => setMapping(m => ({ ...m, [i]: e.target.value as DBKey }))}
                        style={{
                          width: '100%', padding: '6px 28px 6px 10px',
                          background: 'var(--surface2)', border: '1px solid var(--border)',
                          borderRadius: 6, color: mapping[i] === '__skip__' ? 'var(--text3)' : 'var(--text1)',
                          fontSize: 12, appearance: 'none', cursor: 'pointer', outline: 'none',
                        }}
                      >
                        {DB_FIELDS.map(f => (
                          <option key={f.key} value={f.key}>{f.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={12} style={{
                        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                        pointerEvents: 'none', color: 'var(--text3)',
                      }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Warn if no name column */}
              {!Object.values(mapping).includes('name') && (
                <div style={{
                  display: 'flex', gap: 8, padding: '10px 14px',
                  background: 'rgba(242,90,90,0.08)', border: '1px solid rgba(242,90,90,0.25)',
                  borderRadius: 8, fontSize: 13, color: 'var(--red)',
                }}>
                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  Map at least one column to <strong>Name</strong> to continue.
                </div>
              )}
            </div>
          )}

          {/* ── STEP: PREVIEW ────────────────────────────────────────────── */}
          {step === 'preview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                Ready to import <strong style={{ color: 'var(--text1)' }}>{totalRows}</strong> customers.
                Existing matches (by email or name) will be updated — not duplicated.
              </div>

              {/* Preview table */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{
                  padding: '8px 14px', background: 'var(--surface2)',
                  fontSize: 10, fontWeight: 700, color: 'var(--text3)',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  borderBottom: '1px solid var(--border)',
                }}>
                  Preview — first {previewRows.length} of {totalRows} rows
                </div>
                {previewRows.map((row, i) => (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                    padding: '8px 14px', gap: 8,
                    borderBottom: i < previewRows.length - 1 ? '1px solid var(--border)' : 'none',
                    fontSize: 12,
                  }}>
                    <span style={{ color: 'var(--text1)', fontWeight: 600 }}>{row.name}</span>
                    <span style={{ color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>{row.phone || '—'}</span>
                    <span style={{ color: 'var(--text3)' }}>{row.email || row.company_name || '—'}</span>
                  </div>
                ))}
                {totalRows > 5 && (
                  <div style={{ padding: '8px 14px', fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>
                    …and {totalRows - 5} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STEP: DONE ───────────────────────────────────────────────── */}
          {step === 'done' && result && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                display: 'inline-flex', background: result.errors.length ? 'rgba(245,158,11,0.1)' : 'rgba(34,192,122,0.1)',
                borderRadius: '50%', padding: 18, marginBottom: 16,
              }}>
                {result.errors.length
                  ? <AlertCircle size={36} style={{ color: 'var(--amber)' }} />
                  : <Check size={36} style={{ color: 'var(--green)' }} />
                }
              </div>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 900, color: 'var(--text1)', marginBottom: 12 }}>
                Import Complete
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 16 }}>
                <Stat label="Added" value={result.created} color="var(--green)" />
                <Stat label="Updated" value={result.updated} color="var(--accent)" />
                <Stat label="Skipped" value={result.skipped} color="var(--text3)" />
              </div>
              {result.errors.length > 0 && (
                <div style={{
                  padding: '10px 14px', background: 'rgba(242,90,90,0.08)',
                  border: '1px solid rgba(242,90,90,0.2)', borderRadius: 8,
                  fontSize: 12, color: 'var(--red)', textAlign: 'left',
                  maxHeight: 120, overflowY: 'auto',
                }}>
                  {result.errors.map((e, i) => <div key={i}>{e}</div>)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          padding: '16px 24px', borderTop: '1px solid var(--border)',
        }}>
          {step === 'done' ? (
            <button onClick={() => onImported(result?.created ?? 0, result?.updated ?? 0)} style={btnPrimary}>
              <Check size={14} /> Done
            </button>
          ) : (
            <>
              <button onClick={onClose} style={btnGhost}>Cancel</button>
              {step === 'upload' && null}
              {step === 'map' && (
                <button
                  onClick={() => setStep('preview')}
                  disabled={!Object.values(mapping).includes('name')}
                  style={Object.values(mapping).includes('name') ? btnPrimary : btnDisabled}
                >
                  Preview {totalRows} rows <ArrowRight size={13} />
                </button>
              )}
              {step === 'preview' && (
                <>
                  <button onClick={() => setStep('map')} style={btnGhost}>Back</button>
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    style={importing ? btnDisabled : btnPrimary}
                  >
                    <Upload size={13} />
                    {importing ? `Importing…` : `Import ${totalRows} Customers`}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 28, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{label}</div>
    </div>
  )
}

const btnPrimary: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 20px', borderRadius: 8, border: 'none',
  background: 'var(--accent)', color: '#fff',
  fontSize: 13, fontWeight: 700, cursor: 'pointer',
}
const btnGhost: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'transparent',
  color: 'var(--text2)', fontSize: 13, cursor: 'pointer',
}
const btnDisabled: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 20px', borderRadius: 8, border: 'none',
  background: 'var(--surface2)', color: 'var(--text3)',
  fontSize: 13, fontWeight: 700, cursor: 'not-allowed',
}
