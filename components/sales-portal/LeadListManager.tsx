'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Papa from 'papaparse'
import {
  Plus, Upload, Users, Phone, MoreHorizontal, Trash2,
  ChevronRight, FileText, X, ArrowRight, CheckCircle,
} from 'lucide-react'

const C = {
  bg: '#0d0f14', surface: '#13151c', surface2: '#1a1d27', border: '#2a2f3d',
  accent: '#4f7fff', green: '#22c07a', red: '#f25a5a', cyan: '#22d3ee',
  amber: '#f59e0b', purple: '#8b5cf6', text1: '#e8eaed', text2: '#9299b5', text3: '#5a6080',
}

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  background: C.surface2, border: `1px solid ${C.border}`,
  borderRadius: 8, color: C.text1, fontSize: 14, outline: 'none',
  boxSizing: 'border-box',
}

const FIELD_OPTIONS = [
  { value: '', label: '-- Skip --' },
  { value: 'name', label: 'Name' },
  { value: 'company', label: 'Company' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'address', label: 'Address' },
  { value: 'notes', label: 'Notes' },
]

interface ListItem {
  id: string
  name: string
  source_filename: string | null
  total_count: number
  called_count: number
  status: string
  created_at: string
}

export default function LeadListManager({ lists: initial }: { lists: ListItem[] }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [lists, setLists] = useState(initial)
  const [showUpload, setShowUpload] = useState(false)
  const [step, setStep] = useState<'name' | 'file' | 'map' | 'importing' | 'done'>('name')
  const [listName, setListName] = useState('')
  const [csvData, setCsvData] = useState<Record<string, string>[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [columnMap, setColumnMap] = useState<Record<string, string>>({})
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ inserted: number; total: number } | null>(null)
  const [newListId, setNewListId] = useState<string | null>(null)

  function resetUpload() {
    setShowUpload(false)
    setStep('name')
    setListName('')
    setCsvData([])
    setCsvHeaders([])
    setColumnMap({})
    setFileName('')
    setImportResult(null)
    setNewListId(null)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const data = result.data as Record<string, string>[]
        const headers = result.meta.fields || []
        setCsvData(data)
        setCsvHeaders(headers)

        // Auto-map columns by name matching
        const autoMap: Record<string, string> = {}
        headers.forEach(h => {
          const lower = h.toLowerCase().replace(/[^a-z]/g, '')
          if (lower.includes('name') || lower.includes('contact')) autoMap[h] = 'name'
          else if (lower.includes('company') || lower.includes('business') || lower.includes('org')) autoMap[h] = 'company'
          else if (lower.includes('phone') || lower.includes('mobile') || lower.includes('cell') || lower.includes('tel')) autoMap[h] = 'phone'
          else if (lower.includes('email') || lower.includes('mail')) autoMap[h] = 'email'
          else if (lower.includes('address') || lower.includes('city') || lower.includes('state') || lower.includes('zip')) autoMap[h] = 'address'
          else if (lower.includes('note') || lower.includes('comment')) autoMap[h] = 'notes'
        })
        setColumnMap(autoMap)
        setStep('map')
      },
      error: () => {
        alert('Failed to parse CSV file')
      },
    })
  }

  async function handleImport() {
    setImporting(true)
    setStep('importing')

    try {
      // Create the list first
      const createRes = await fetch('/api/sales-portal/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: listName, source_filename: fileName }),
      })
      const newList = await createRes.json()
      if (!createRes.ok) throw new Error(newList.error)

      setNewListId(newList.id)

      // Import leads
      const importRes = await fetch(`/api/sales-portal/lists/${newList.id}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leads: csvData,
          column_map: columnMap,
          source_filename: fileName,
        }),
      })
      const result = await importRes.json()
      if (!importRes.ok) throw new Error(result.error)

      setImportResult(result)
      setLists(prev => [{
        ...newList,
        total_count: result.total,
        called_count: 0,
      }, ...prev])
      setStep('done')
    } catch (err: any) {
      alert(`Import failed: ${err.message}`)
      setStep('map')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div style={{ padding: '20px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{
            fontSize: 22, fontWeight: 700, color: C.text1, margin: 0,
            fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)',
          }}>
            Lead Lists
          </h1>
          <p style={{ fontSize: 13, color: C.text3, margin: '4px 0 0' }}>
            Upload CSV files to build your cold call lists
          </p>
        </div>
        <button
          onClick={() => { resetUpload(); setShowUpload(true) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 18px', background: C.accent, color: '#fff',
            border: 'none', borderRadius: 9, fontWeight: 800, fontSize: 13, cursor: 'pointer',
          }}
        >
          <Upload size={15} /> Upload List
        </button>
      </div>

      {/* Lists */}
      {lists.length === 0 && !showUpload && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: C.text3 }}>
          <FileText size={40} strokeWidth={1} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div style={{ fontSize: 16, color: C.text2, marginBottom: 8, fontWeight: 600 }}>No lists yet</div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>Upload a CSV with contacts to start power dialing</div>
          <button
            onClick={() => { resetUpload(); setShowUpload(true) }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 24px', borderRadius: 10,
              background: C.accent, color: '#fff',
              fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
            }}
          >
            <Upload size={16} /> Upload Your First List
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {lists.map(l => {
          const pct = l.total_count > 0 ? Math.round((l.called_count / l.total_count) * 100) : 0
          const remaining = l.total_count - l.called_count
          return (
            <Link key={l.id} href={`/sales-portal/leads/${l.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 12, padding: '16px 18px',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <Users size={20} color={l.status === 'completed' ? C.green : C.cyan} strokeWidth={1.6} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.text1 }}>{l.name}</div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 11, color: C.text3 }}>
                    <span>{l.total_count} contacts</span>
                    <span>{l.called_count} called</span>
                    <span style={{ color: remaining > 0 ? C.amber : C.green }}>
                      {remaining > 0 ? `${remaining} left` : 'Complete'}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div style={{
                    marginTop: 8, height: 4, borderRadius: 2,
                    background: C.border, overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      background: pct >= 100 ? C.green : C.accent,
                      width: `${pct}%`,
                      transition: 'width 0.3s',
                    }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {remaining > 0 && (
                    <Link
                      href={`/sales-portal/leads/${l.id}/dialer`}
                      onClick={e => e.stopPropagation()}
                      style={{
                        padding: '6px 12px', borderRadius: 8,
                        background: `${C.green}15`, border: `1px solid ${C.green}30`,
                        color: C.green, fontSize: 11, fontWeight: 700,
                        textDecoration: 'none',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      <Phone size={12} /> Dial
                    </Link>
                  )}
                  <ChevronRight size={16} color={C.text3} />
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <>
          <div onClick={resetUpload} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100,
          }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 16, width: '90vw', maxWidth: 520, maxHeight: '85vh',
            overflow: 'auto', zIndex: 110, padding: 24,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{
                fontSize: 18, fontWeight: 700, color: C.text1, margin: 0,
                fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)',
              }}>
                Upload Lead List
              </h2>
              <button onClick={resetUpload} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.text3, padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            {/* Step 1: Name */}
            {step === 'name' && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text3, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  List Name
                </div>
                <input
                  style={inp}
                  placeholder="e.g., Auto Dealerships Portland"
                  value={listName}
                  onChange={e => setListName(e.target.value)}
                  autoFocus
                />
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text3, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                    CSV File
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,.tsv,.txt"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={!listName.trim()}
                    style={{
                      width: '100%', padding: '20px 16px', borderRadius: 10,
                      border: `2px dashed ${listName.trim() ? C.accent : C.border}`,
                      background: 'transparent', cursor: listName.trim() ? 'pointer' : 'default',
                      color: listName.trim() ? C.accent : C.text3,
                      fontSize: 14, fontWeight: 600,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    }}
                  >
                    <Upload size={24} strokeWidth={1.5} />
                    {listName.trim() ? 'Click to select CSV file' : 'Enter a name first'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Column Mapping */}
            {step === 'map' && (
              <div>
                <div style={{ fontSize: 13, color: C.text2, marginBottom: 16 }}>
                  <span style={{ fontWeight: 700, color: C.green }}>{csvData.length}</span> rows found in{' '}
                  <span style={{ fontWeight: 600 }}>{fileName}</span>. Map columns:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {csvHeaders.map(header => (
                    <div key={header} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', background: C.surface2,
                      border: `1px solid ${C.border}`, borderRadius: 8,
                    }}>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.text1 }}>
                        {header}
                      </span>
                      <ArrowRight size={14} color={C.text3} />
                      <select
                        value={columnMap[header] || ''}
                        onChange={e => setColumnMap(prev => ({ ...prev, [header]: e.target.value }))}
                        style={{
                          padding: '6px 10px', background: C.bg, border: `1px solid ${C.border}`,
                          borderRadius: 6, color: C.text1, fontSize: 12,
                        }}
                      >
                        {FIELD_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </select>
                    </div>
                  ))}
                </div>

                {/* Preview */}
                {csvData.length > 0 && (
                  <div style={{ fontSize: 11, color: C.text3, marginBottom: 16 }}>
                    Preview (first row): {Object.entries(csvData[0]).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(', ')}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => { setStep('name'); setCsvData([]); setCsvHeaders([]) }}
                    style={{
                      flex: 1, padding: '12px', borderRadius: 9, fontSize: 13, fontWeight: 700,
                      background: C.surface2, border: `1px solid ${C.border}`, color: C.text2, cursor: 'pointer',
                    }}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleImport}
                    style={{
                      flex: 2, padding: '12px', borderRadius: 9, fontSize: 13, fontWeight: 700,
                      background: C.accent, border: 'none', color: '#fff', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    Import {csvData.length} Leads
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Importing */}
            {step === 'importing' && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{
                  width: 40, height: 40, border: `3px solid ${C.border}`,
                  borderTopColor: C.accent, borderRadius: '50%',
                  margin: '0 auto 16px', animation: 'spin 1s linear infinite',
                }} />
                <div style={{ fontSize: 15, color: C.text1, fontWeight: 600 }}>Importing leads...</div>
                <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
              </div>
            )}

            {/* Step 4: Done */}
            {step === 'done' && importResult && (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <CheckCircle size={48} color={C.green} strokeWidth={1.5} style={{ marginBottom: 16 }} />
                <div style={{ fontSize: 18, fontWeight: 700, color: C.text1, marginBottom: 8 }}>
                  {importResult.inserted} leads imported
                </div>
                <div style={{ fontSize: 13, color: C.text2, marginBottom: 24 }}>
                  Your list &ldquo;{listName}&rdquo; is ready to dial
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={resetUpload}
                    style={{
                      flex: 1, padding: '12px', borderRadius: 9, fontSize: 13, fontWeight: 700,
                      background: C.surface2, border: `1px solid ${C.border}`, color: C.text2, cursor: 'pointer',
                    }}
                  >
                    Close
                  </button>
                  {newListId && (
                    <Link
                      href={`/sales-portal/leads/${newListId}/dialer`}
                      onClick={resetUpload}
                      style={{
                        flex: 2, padding: '12px', borderRadius: 9, fontSize: 13, fontWeight: 700,
                        background: C.green, color: '#fff', textDecoration: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}
                    >
                      <Phone size={14} /> Start Dialing
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
