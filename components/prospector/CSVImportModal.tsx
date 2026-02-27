'use client'
import { ORG_ID } from '@/lib/org'


import { useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import type { Prospect } from './ProspectorApp'
import { X, Upload, Download, FileText, Loader2 } from 'lucide-react'

interface Props {
  profile: Profile
  onClose: () => void
  onImported: (prospects: Prospect[]) => void
}

const TEMPLATE_HEADERS = 'Business Name,Business Type,Address,City,State,Zip,Phone,Website,Email,Contact Name,Contact Title,Notes'

export function CSVImportModal({ profile, onClose, onImported }: Props) {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [csvData, setCsvData] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')

  const FIELD_OPTIONS = [
    'business_name', 'business_type', 'address', 'city', 'state', 'zip',
    'phone', 'website', 'email', 'contact_name', 'contact_title', 'notes',
  ]

  const downloadTemplate = useCallback(() => {
    const blob = new Blob([TEMPLATE_HEADERS + '\n'], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'prospect_import_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const lines = text.split('\n').filter(l => l.trim())
      if (lines.length < 2) { setError('CSV must have at least a header row and one data row'); return }
      const hdrs = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
      setHeaders(hdrs)
      const rows = lines.slice(1).map(l => l.split(',').map(c => c.trim().replace(/"/g, '')))
      setCsvData(rows)

      // Auto-map columns
      const autoMap: Record<string, string> = {}
      hdrs.forEach((h, i) => {
        const lower = h.toLowerCase()
        if (lower.includes('business') && lower.includes('name')) autoMap[String(i)] = 'business_name'
        else if (lower.includes('type')) autoMap[String(i)] = 'business_type'
        else if (lower === 'address') autoMap[String(i)] = 'address'
        else if (lower === 'city') autoMap[String(i)] = 'city'
        else if (lower === 'state') autoMap[String(i)] = 'state'
        else if (lower === 'zip') autoMap[String(i)] = 'zip'
        else if (lower.includes('phone')) autoMap[String(i)] = 'phone'
        else if (lower.includes('website') || lower.includes('url')) autoMap[String(i)] = 'website'
        else if (lower.includes('email')) autoMap[String(i)] = 'email'
        else if (lower.includes('contact') && lower.includes('name')) autoMap[String(i)] = 'contact_name'
        else if (lower.includes('title')) autoMap[String(i)] = 'contact_title'
        else if (lower.includes('note')) autoMap[String(i)] = 'notes'
      })
      setMapping(autoMap)
    }
    reader.readAsText(file)
  }, [])

  const doImport = useCallback(async () => {
    if (csvData.length === 0) return
    setImporting(true)
    setError('')

    const orgId = profile.org_id || ORG_ID
    const rows = csvData.map(row => {
      const record: Record<string, string> = {}
      Object.entries(mapping).forEach(([colIdx, field]) => {
        record[field] = row[Number(colIdx)] || ''
      })
      return record
    }).filter(r => r.business_name)

    if (rows.length === 0) { setError('No valid rows found. Make sure Business Name is mapped.'); setImporting(false); return }

    const inserts = rows.map(r => ({
      org_id: orgId,
      business_name: r.business_name,
      business_type: r.business_type || null,
      address: r.address || null,
      city: r.city || null,
      state: r.state || null,
      zip: r.zip || null,
      phone: r.phone || null,
      website: r.website || null,
      email: r.email || null,
      name: r.contact_name || null,
      notes: r.notes || null,
      status: 'uncontacted',
      priority: 'medium',
      ai_score: 0,
      discovered_via: 'csv_import',
    }))

    const { data, error: err } = await supabase.from('prospects').insert(inserts).select()
    setImporting(false)
    if (err) { setError(err.message); return }
    if (data) onImported(data)
  }, [csvData, mapping, supabase, profile.org_id, onImported])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        width: 540, maxHeight: '85vh', borderRadius: 16,
        background: 'var(--surface)', border: '1px solid var(--border)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Barlow Condensed, sans-serif' }}>
            <Upload size={18} style={{ color: 'var(--accent)' }} /> Import CSV
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          <button onClick={downloadTemplate} style={{
            width: '100%', padding: 10, borderRadius: 8, background: 'rgba(79,127,255,0.1)',
            border: '1px dashed rgba(79,127,255,0.3)', color: 'var(--accent)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            marginBottom: 14,
          }}><Download size={14} /> Download Template CSV</button>

          {/* Upload area */}
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              padding: 30, borderRadius: 8, border: '2px dashed var(--border)', textAlign: 'center',
              cursor: 'pointer', marginBottom: 14, background: 'rgba(255,255,255,0.02)',
            }}
          >
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
            {fileName ? (
              <div>
                <FileText size={24} style={{ color: 'var(--accent)', marginBottom: 8 }} />
                <div style={{ fontSize: 13, color: 'var(--text1)', fontWeight: 600 }}>{fileName}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{csvData.length} rows found</div>
              </div>
            ) : (
              <div>
                <Upload size={24} style={{ color: 'var(--text3)', marginBottom: 8 }} />
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>Click to upload CSV file</div>
              </div>
            )}
          </div>

          {/* Column mapping */}
          {headers.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>Column Mapping</div>
              {headers.map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text3)', width: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h}</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>→</span>
                  <select value={mapping[String(i)] || ''} onChange={e => setMapping(prev => ({ ...prev, [String(i)]: e.target.value }))} style={{
                    flex: 1, padding: '4px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border)', color: 'var(--text1)', fontSize: 11,
                  }}>
                    <option value="">Skip</option>
                    {FIELD_OPTIONS.map(f => <option key={f} value={f}>{f.replace('_', ' ')}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}

          {/* Preview */}
          {csvData.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Preview (first 3 rows)</div>
              <div style={{ overflowX: 'auto', borderRadius: 6, border: '1px solid var(--border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                  <thead>
                    <tr>{headers.map((h, i) => <th key={i} style={{ padding: '4px 6px', color: 'var(--text3)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {csvData.slice(0, 3).map((row, ri) => (
                      <tr key={ri}>{row.map((c, ci) => <td key={ci} style={{ padding: '3px 6px', color: 'var(--text2)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>{c}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {error && <div style={{ padding: '8px 12px', borderRadius: 6, background: 'rgba(242,90,90,0.1)', color: '#f25a5a', fontSize: 11, marginBottom: 10 }}>{error}</div>}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
          <button onClick={doImport} disabled={csvData.length === 0 || importing} style={{
            width: '100%', padding: 12, borderRadius: 8,
            background: csvData.length > 0 ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
            color: csvData.length > 0 ? '#fff' : 'var(--text3)', fontSize: 14, fontWeight: 600,
            border: 'none', cursor: csvData.length > 0 && !importing ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            {importing ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Importing...</> : `Import ${csvData.length} Prospects`}
          </button>
        </div>
      </div>
    </div>
  )
}
