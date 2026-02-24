'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  Upload, FileSpreadsheet, Columns, Eye, Settings2, CheckCircle2,
  AlertTriangle, Download, ArrowRight, ArrowLeft, X, Loader2,
  ChevronDown, MapPin, Trash2,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────────

interface Teammate {
  id: string
  name: string
  email: string
  role: string
}

interface ImportJobsClientProps {
  profile: Profile
  teammates: Teammate[]
}

interface ColumnMapping {
  csvColumn: string
  field: MappableField | ''
}

type MappableField =
  | 'customer_name'
  | 'job_type'
  | 'vehicle'
  | 'amount'
  | 'date'
  | 'status'
  | 'assigned_to'
  | 'notes'

interface RowIssue {
  row: number
  field: string
  message: string
}

interface ImportResult {
  total: number
  success: number
  errors: { row: number; message: string }[]
}

const MAPPABLE_FIELDS: { key: MappableField; label: string; required: boolean }[] = [
  { key: 'customer_name', label: 'Customer Name', required: true },
  { key: 'job_type',      label: 'Job Type',      required: false },
  { key: 'vehicle',       label: 'Vehicle',       required: false },
  { key: 'amount',        label: 'Amount',         required: false },
  { key: 'date',          label: 'Date',           required: false },
  { key: 'status',        label: 'Status',         required: false },
  { key: 'assigned_to',   label: 'Assigned To',    required: false },
  { key: 'notes',         label: 'Notes',          required: false },
]

// Common CSV header auto-detect synonyms
const AUTO_DETECT_MAP: Record<string, MappableField> = {
  'customer':       'customer_name',
  'customer name':  'customer_name',
  'client':         'customer_name',
  'client name':    'customer_name',
  'name':           'customer_name',
  'company':        'customer_name',
  'job type':       'job_type',
  'type':           'job_type',
  'service':        'job_type',
  'service type':   'job_type',
  'category':       'job_type',
  'vehicle':        'vehicle',
  'car':            'vehicle',
  'vehicle desc':   'vehicle',
  'vehicle description': 'vehicle',
  'make model':     'vehicle',
  'amount':         'amount',
  'total':          'amount',
  'price':          'amount',
  'revenue':        'amount',
  'value':          'amount',
  'invoice total':  'amount',
  'cost':           'amount',
  'date':           'date',
  'job date':       'date',
  'created':        'date',
  'created date':   'date',
  'completed':      'date',
  'completion date': 'date',
  'close date':     'date',
  'install date':   'date',
  'status':         'status',
  'job status':     'status',
  'state':          'status',
  'assigned to':    'assigned_to',
  'agent':          'assigned_to',
  'sales agent':    'assigned_to',
  'salesperson':    'assigned_to',
  'rep':            'assigned_to',
  'notes':          'notes',
  'description':    'notes',
  'comments':       'notes',
  'memo':           'notes',
  'details':        'notes',
}

const STEPS = [
  { num: 1, label: 'Upload',   icon: Upload },
  { num: 2, label: 'Map',      icon: Columns },
  { num: 3, label: 'Preview',  icon: Eye },
  { num: 4, label: 'Options',  icon: Settings2 },
  { num: 5, label: 'Results',  icon: CheckCircle2 },
]

// ── Styles ───────────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: 'var(--surface)',
  borderRadius: 12,
  border: '1px solid var(--surface2)',
  padding: 24,
}

const btnPrimary: React.CSSProperties = {
  background: 'var(--accent)',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '10px 24px',
  fontFamily: "'Barlow Condensed', sans-serif",
  fontWeight: 600,
  fontSize: 15,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
}

const btnSecondary: React.CSSProperties = {
  background: 'var(--surface2)',
  color: 'var(--text1)',
  border: '1px solid var(--surface2)',
  borderRadius: 8,
  padding: '10px 24px',
  fontFamily: "'Barlow Condensed', sans-serif",
  fontWeight: 600,
  fontSize: 15,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
}

const selectStyle: React.CSSProperties = {
  background: 'var(--surface2)',
  color: 'var(--text1)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 13,
  width: '100%',
  appearance: 'none' as const,
  cursor: 'pointer',
}

const mono: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
}

// ── Component ────────────────────────────────────────────────────────────────────

export default function ImportJobsClient({ profile, teammates }: ImportJobsClientProps) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Wizard state
  const [step, setStep] = useState(1)
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [mappings, setMappings] = useState<ColumnMapping[]>([])

  // Import options
  const [defaultStatus, setDefaultStatus] = useState<'closed' | 'cancelled'>('closed')
  const [detectDuplicates, setDetectDuplicates] = useState(true)
  const [defaultType, setDefaultType] = useState<'wrap' | 'decking' | 'design' | 'ppf'>('wrap')

  // Results
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ImportResult | null>(null)

  // ── Step 1: File Upload ──────────────────────────────────────────────────────

  const parseFile = useCallback((file: File) => {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const json: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

        if (json.length === 0) return

        const hdrs = Object.keys(json[0])
        setHeaders(hdrs)
        setRows(json)

        // Auto-detect mappings
        const autoMappings: ColumnMapping[] = hdrs.map((h) => {
          const normalized = h.toLowerCase().trim()
          const detected = AUTO_DETECT_MAP[normalized] || ''
          return { csvColumn: h, field: detected as MappableField | '' }
        })
        setMappings(autoMappings)
        setStep(2)
      } catch {
        alert('Failed to parse file. Please ensure it is a valid CSV or XLSX file.')
      }
    }
    reader.readAsArrayBuffer(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }, [parseFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
  }, [parseFile])

  // ── Step 2: Column Mapping ───────────────────────────────────────────────────

  const updateMapping = (csvColumn: string, field: MappableField | '') => {
    setMappings(prev => prev.map(m =>
      m.csvColumn === csvColumn ? { ...m, field } : m
    ))
  }

  const usedFields = useMemo(() =>
    new Set(mappings.filter(m => m.field).map(m => m.field)),
    [mappings]
  )

  const hasCustomerNameMapping = useMemo(() =>
    mappings.some(m => m.field === 'customer_name'),
    [mappings]
  )

  // ── Step 3: Preview & Validation ─────────────────────────────────────────────

  const getMappedValue = useCallback((row: Record<string, string>, field: MappableField): string => {
    const mapping = mappings.find(m => m.field === field)
    if (!mapping) return ''
    return (row[mapping.csvColumn] || '').toString().trim()
  }, [mappings])

  const issues = useMemo((): RowIssue[] => {
    const found: RowIssue[] = []
    rows.forEach((row, idx) => {
      const name = getMappedValue(row, 'customer_name')
      if (!name) {
        found.push({ row: idx + 1, field: 'Customer Name', message: 'Missing customer name' })
      }
      const amount = getMappedValue(row, 'amount')
      if (amount && isNaN(parseFloat(amount.replace(/[$,]/g, '')))) {
        found.push({ row: idx + 1, field: 'Amount', message: `Invalid amount: "${amount}"` })
      }
      const date = getMappedValue(row, 'date')
      if (date && isNaN(Date.parse(date))) {
        found.push({ row: idx + 1, field: 'Date', message: `Invalid date: "${date}"` })
      }
    })
    return found
  }, [rows, getMappedValue])

  const validRows = useMemo(() =>
    rows.filter((_, idx) => !issues.some(i => i.row === idx + 1)),
    [rows, issues]
  )

  const errorRows = useMemo(() =>
    rows.filter((_, idx) => issues.some(i => i.row === idx + 1)),
    [rows, issues]
  )

  // ── Step 4/5: Import ─────────────────────────────────────────────────────────

  const resolveAgentId = useCallback((value: string): string | null => {
    if (!value) return null
    const lower = value.toLowerCase().trim()
    const match = teammates.find(t =>
      t.name.toLowerCase() === lower ||
      t.email.toLowerCase() === lower
    )
    return match?.id || null
  }, [teammates])

  const runImport = async () => {
    setImporting(true)
    setProgress(0)
    setStep(5)

    const importRows = validRows
    const totalRows = importRows.length
    const errors: { row: number; message: string }[] = []
    let successCount = 0
    const batchSize = 25

    // If duplicate detection is on, fetch existing project titles
    let existingTitles = new Set<string>()
    if (detectDuplicates) {
      const { data: existing } = await supabase
        .from('projects')
        .select('title')
        .eq('org_id', profile.org_id)
      if (existing) {
        existingTitles = new Set(existing.map((p: { title: string }) => p.title.toLowerCase().trim()))
      }
    }

    for (let i = 0; i < totalRows; i += batchSize) {
      const batch = importRows.slice(i, i + batchSize)
      const records = batch.map((row, batchIdx) => {
        const customerName = getMappedValue(row, 'customer_name')
        const jobType = getMappedValue(row, 'job_type')
        const vehicle = getMappedValue(row, 'vehicle')
        const amountStr = getMappedValue(row, 'amount')
        const dateStr = getMappedValue(row, 'date')
        const assignedTo = getMappedValue(row, 'assigned_to')
        const notes = getMappedValue(row, 'notes')

        const amount = amountStr ? parseFloat(amountStr.replace(/[$,]/g, '')) : null
        const parsedDate = dateStr && !isNaN(Date.parse(dateStr)) ? new Date(dateStr).toISOString() : null
        const agentId = resolveAgentId(assignedTo)

        const title = vehicle
          ? `${customerName} - ${vehicle}`
          : customerName

        return {
          org_id: profile.org_id,
          title,
          type: defaultType,
          status: defaultStatus,
          pipe_stage: 'done' as const,
          vehicle_desc: vehicle || null,
          revenue: amount,
          profit: null,
          gpm: null,
          agent_id: agentId || profile.id,
          priority: 'normal' as const,
          division: 'wraps' as const,
          form_data: {
            imported: true,
            import_source: fileName,
            import_date: new Date().toISOString(),
            original_job_type: jobType || null,
            notes: notes || null,
            original_status: getMappedValue(row, 'status') || null,
          },
          created_at: parsedDate || new Date().toISOString(),
          _batchIdx: batchIdx,
          _globalIdx: i + batchIdx,
        }
      })

      // Filter duplicates if needed
      const filtered = detectDuplicates
        ? records.filter(r => !existingTitles.has(r.title.toLowerCase().trim()))
        : records

      // Track skipped duplicates
      const skipped = records.filter(r => !filtered.includes(r))
      skipped.forEach(s => {
        errors.push({ row: s._globalIdx + 1, message: `Duplicate detected: "${s.title}"` })
      })

      if (filtered.length > 0) {
        // Remove internal tracking fields before insert
        const insertData = filtered.map(({ _batchIdx, _globalIdx, ...rest }) => rest)

        const { error } = await supabase
          .from('projects')
          .insert(insertData)

        if (error) {
          filtered.forEach(r => {
            errors.push({ row: r._globalIdx + 1, message: error.message })
          })
        } else {
          successCount += filtered.length
          // Add to existing titles set
          filtered.forEach(r => existingTitles.add(r.title.toLowerCase().trim()))
        }
      }

      setProgress(Math.min(100, Math.round(((i + batch.length) / totalRows) * 100)))
    }

    setResult({ total: totalRows, success: successCount, errors })
    setImporting(false)
  }

  // ── Error Report Download ────────────────────────────────────────────────────

  const downloadErrorReport = () => {
    if (!result) return
    const csvContent = [
      'Row,Error',
      ...result.errors.map(e => `${e.row},"${e.message.replace(/"/g, '""')}"`)
    ].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `import-errors-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Reset ────────────────────────────────────────────────────────────────────

  const resetWizard = () => {
    setStep(1)
    setFileName('')
    setHeaders([])
    setRows([])
    setMappings([])
    setResult(null)
    setProgress(0)
    setImporting(false)
    setDefaultStatus('closed')
    setDetectDuplicates(true)
    setDefaultType('wrap')
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 28,
          fontWeight: 700,
          color: 'var(--text1)',
          margin: 0,
          letterSpacing: '-0.02em',
        }}>
          Import Historical Jobs
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 6 }}>
          Import jobs from CSV or XLSX files into your pipeline as historical records.
        </p>
      </div>

      {/* Step Indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginBottom: 28,
        overflowX: 'auto',
        paddingBottom: 4,
      }}>
        {STEPS.map((s, idx) => {
          const Icon = s.icon
          const isActive = step === s.num
          const isDone = step > s.num
          return (
            <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 8,
                background: isActive ? 'var(--accent)' : isDone ? 'rgba(79,127,255,0.15)' : 'var(--surface)',
                border: `1px solid ${isActive ? 'var(--accent)' : isDone ? 'var(--accent)' : 'var(--surface2)'}`,
                transition: 'all 0.2s',
              }}>
                {isDone ? (
                  <CheckCircle2 size={16} style={{ color: 'var(--accent)' }} />
                ) : (
                  <Icon size={16} style={{ color: isActive ? '#fff' : 'var(--text3)' }} />
                )}
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 600,
                  fontSize: 13,
                  color: isActive ? '#fff' : isDone ? 'var(--accent)' : 'var(--text3)',
                  whiteSpace: 'nowrap',
                }}>
                  {s.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <ArrowRight size={14} style={{ color: 'var(--text3)', flexShrink: 0 }} />
              )}
            </div>
          )
        })}
      </div>

      {/* ── Step 1: Upload ────────────────────────────────────────────────── */}
      {step === 1 && (
        <div style={card}>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed var(--surface2)',
              borderRadius: 12,
              padding: '60px 32px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--surface2)')}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            <FileSpreadsheet size={48} style={{ color: 'var(--accent)', marginBottom: 16 }} />
            <p style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 20,
              fontWeight: 600,
              color: 'var(--text1)',
              margin: '0 0 8px',
            }}>
              Drag & drop your file here
            </p>
            <p style={{ color: 'var(--text2)', fontSize: 14, margin: 0 }}>
              or click to browse. Supports CSV and XLSX files.
            </p>
          </div>

          {/* Format hints */}
          <div style={{ marginTop: 24 }}>
            <h3 style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--text2)',
              margin: '0 0 12px',
            }}>
              Expected Columns
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 8,
            }}>
              {MAPPABLE_FIELDS.map(f => (
                <div key={f.key} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  background: 'var(--surface2)',
                  borderRadius: 6,
                  fontSize: 13,
                  color: 'var(--text2)',
                }}>
                  <MapPin size={12} style={{ color: f.required ? 'var(--accent)' : 'var(--text3)' }} />
                  <span>{f.label}</span>
                  {f.required && (
                    <span style={{ color: 'var(--red)', fontSize: 11, marginLeft: 'auto' }}>Required</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Map Columns ───────────────────────────────────────────── */}
      {step === 2 && (
        <div style={card}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--text1)',
              margin: '0 0 4px',
            }}>
              Map Your Columns
            </h2>
            <p style={{ color: 'var(--text2)', fontSize: 13, margin: 0 }}>
              We auto-detected some mappings. Adjust as needed. File: <strong style={{ color: 'var(--text1)' }}>{fileName}</strong> ({rows.length} rows)
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {mappings.map(m => (
              <div key={m.csvColumn} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '12px 16px',
                background: 'var(--bg)',
                borderRadius: 8,
                border: '1px solid var(--surface2)',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text1)',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {m.csvColumn}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                    Sample: {rows[0]?.[m.csvColumn] || '(empty)'}
                  </div>
                </div>

                <ArrowRight size={16} style={{ color: 'var(--text3)', flexShrink: 0 }} />

                <div style={{ flex: 1, position: 'relative' }}>
                  <select
                    value={m.field}
                    onChange={(e) => updateMapping(m.csvColumn, e.target.value as MappableField | '')}
                    style={selectStyle}
                  >
                    <option value="">-- Skip this column --</option>
                    {MAPPABLE_FIELDS.map(f => (
                      <option
                        key={f.key}
                        value={f.key}
                        disabled={usedFields.has(f.key) && m.field !== f.key}
                      >
                        {f.label}{f.required ? ' *' : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text3)',
                      pointerEvents: 'none',
                    }}
                  />
                </div>

                {m.field && (
                  <button
                    onClick={() => updateMapping(m.csvColumn, '')}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 4,
                      display: 'flex',
                    }}
                  >
                    <X size={14} style={{ color: 'var(--text3)' }} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Preview table of first 10 rows */}
          {rows.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h3 style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--text2)',
                margin: '0 0 12px',
              }}>
                Data Preview (first 10 rows)
              </h3>
              <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--surface2)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{
                        padding: '10px 12px',
                        textAlign: 'left',
                        background: 'var(--surface2)',
                        color: 'var(--text2)',
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 600,
                        fontSize: 12,
                        whiteSpace: 'nowrap',
                        borderBottom: '1px solid var(--surface2)',
                      }}>
                        #
                      </th>
                      {headers.map(h => (
                        <th key={h} style={{
                          padding: '10px 12px',
                          textAlign: 'left',
                          background: 'var(--surface2)',
                          color: mappings.find(m => m.csvColumn === h)?.field ? 'var(--accent)' : 'var(--text2)',
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontWeight: 600,
                          fontSize: 12,
                          whiteSpace: 'nowrap',
                          borderBottom: '1px solid var(--surface2)',
                        }}>
                          {h}
                          {mappings.find(m => m.csvColumn === h)?.field && (
                            <span style={{ color: 'var(--green)', marginLeft: 6, fontSize: 10 }}>
                              ({MAPPABLE_FIELDS.find(f => f.key === mappings.find(m2 => m2.csvColumn === h)?.field)?.label})
                            </span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 10).map((row, idx) => (
                      <tr key={idx}>
                        <td style={{
                          padding: '8px 12px',
                          color: 'var(--text3)',
                          borderBottom: '1px solid var(--surface2)',
                          ...mono,
                        }}>
                          {idx + 1}
                        </td>
                        {headers.map(h => (
                          <td key={h} style={{
                            padding: '8px 12px',
                            color: 'var(--text1)',
                            borderBottom: '1px solid var(--surface2)',
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: 12,
                          }}>
                            {row[h] || ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
            <button style={btnSecondary} onClick={resetWizard}>
              <ArrowLeft size={16} /> Start Over
            </button>
            <button
              style={{
                ...btnPrimary,
                opacity: hasCustomerNameMapping ? 1 : 0.5,
                pointerEvents: hasCustomerNameMapping ? 'auto' : 'none',
              }}
              onClick={() => setStep(3)}
            >
              Continue <ArrowRight size={16} />
            </button>
          </div>
          {!hasCustomerNameMapping && (
            <p style={{ color: 'var(--red)', fontSize: 12, textAlign: 'right', marginTop: 8 }}>
              Please map at least the Customer Name column to continue.
            </p>
          )}
        </div>
      )}

      {/* ── Step 3: Preview ───────────────────────────────────────────────── */}
      {step === 3 && (
        <div style={card}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--text1)',
              margin: '0 0 4px',
            }}>
              Review Import Data
            </h2>
          </div>

          {/* Summary stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12,
            marginBottom: 24,
          }}>
            {[
              { label: 'Total Rows', value: rows.length, color: 'var(--text1)' },
              { label: 'Valid Rows', value: validRows.length, color: 'var(--green)' },
              { label: 'Rows with Issues', value: errorRows.length, color: errorRows.length > 0 ? 'var(--red)' : 'var(--text3)' },
              { label: 'Mapped Columns', value: mappings.filter(m => m.field).length, color: 'var(--accent)' },
            ].map(stat => (
              <div key={stat.label} style={{
                background: 'var(--bg)',
                borderRadius: 8,
                padding: '16px 20px',
                border: '1px solid var(--surface2)',
              }}>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>{stat.label}</div>
                <div style={{ ...mono, fontSize: 24, fontWeight: 700, color: stat.color }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Issues */}
          {issues.length > 0 && (
            <div style={{
              background: 'rgba(242,90,90,0.08)',
              border: '1px solid rgba(242,90,90,0.2)',
              borderRadius: 8,
              padding: 16,
              marginBottom: 20,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
              }}>
                <AlertTriangle size={16} style={{ color: 'var(--red)' }} />
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 600,
                  color: 'var(--red)',
                  fontSize: 14,
                }}>
                  {issues.length} Issue{issues.length !== 1 ? 's' : ''} Found
                </span>
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {issues.slice(0, 50).map((issue, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    gap: 12,
                    padding: '6px 0',
                    fontSize: 12,
                    color: 'var(--text2)',
                    borderBottom: idx < issues.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  }}>
                    <span style={{ ...mono, color: 'var(--red)', minWidth: 60 }}>Row {issue.row}</span>
                    <span style={{ color: 'var(--text3)', minWidth: 100 }}>{issue.field}</span>
                    <span>{issue.message}</span>
                  </div>
                ))}
                {issues.length > 50 && (
                  <div style={{ fontSize: 12, color: 'var(--text3)', paddingTop: 8 }}>
                    ...and {issues.length - 50} more issues
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Full data preview */}
          <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--surface2)', maxHeight: 400, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    background: 'var(--surface2)',
                    color: 'var(--text2)',
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 600,
                    fontSize: 12,
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                  }}>
                    Row
                  </th>
                  {MAPPABLE_FIELDS.filter(f => mappings.some(m => m.field === f.key)).map(f => (
                    <th key={f.key} style={{
                      padding: '10px 12px',
                      textAlign: 'left',
                      background: 'var(--surface2)',
                      color: 'var(--accent)',
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 600,
                      fontSize: 12,
                      whiteSpace: 'nowrap',
                      position: 'sticky',
                      top: 0,
                      zIndex: 1,
                    }}>
                      {f.label}
                    </th>
                  ))}
                  <th style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    background: 'var(--surface2)',
                    color: 'var(--text2)',
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 600,
                    fontSize: 12,
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                  }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const rowIssues = issues.filter(i => i.row === idx + 1)
                  const hasError = rowIssues.length > 0
                  return (
                    <tr key={idx} style={{
                      background: hasError ? 'rgba(242,90,90,0.04)' : 'transparent',
                    }}>
                      <td style={{
                        padding: '8px 12px',
                        color: 'var(--text3)',
                        borderBottom: '1px solid var(--surface2)',
                        ...mono,
                      }}>
                        {idx + 1}
                      </td>
                      {MAPPABLE_FIELDS.filter(f => mappings.some(m => m.field === f.key)).map(f => (
                        <td key={f.key} style={{
                          padding: '8px 12px',
                          color: rowIssues.some(i => i.field === f.label) ? 'var(--red)' : 'var(--text1)',
                          borderBottom: '1px solid var(--surface2)',
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: 12,
                        }}>
                          {getMappedValue(row, f.key) || '-'}
                        </td>
                      ))}
                      <td style={{
                        padding: '8px 12px',
                        borderBottom: '1px solid var(--surface2)',
                      }}>
                        {hasError ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            color: 'var(--red)',
                            background: 'rgba(242,90,90,0.1)',
                            padding: '2px 8px',
                            borderRadius: 4,
                          }}>
                            <AlertTriangle size={10} /> {rowIssues.length} issue{rowIssues.length !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            color: 'var(--green)',
                            background: 'rgba(34,192,122,0.1)',
                            padding: '2px 8px',
                            borderRadius: 4,
                          }}>
                            <CheckCircle2 size={10} /> Valid
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
            <button style={btnSecondary} onClick={() => setStep(2)}>
              <ArrowLeft size={16} /> Back to Mapping
            </button>
            <button
              style={{
                ...btnPrimary,
                opacity: validRows.length > 0 ? 1 : 0.5,
                pointerEvents: validRows.length > 0 ? 'auto' : 'none',
              }}
              onClick={() => setStep(4)}
            >
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Import Options ────────────────────────────────────────── */}
      {step === 4 && (
        <div style={card}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--text1)',
              margin: '0 0 4px',
            }}>
              Import Options
            </h2>
            <p style={{ color: 'var(--text2)', fontSize: 13, margin: 0 }}>
              Configure how the {validRows.length} valid rows will be imported.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Historical import notice */}
            <div style={{
              background: 'rgba(79,127,255,0.08)',
              border: '1px solid rgba(79,127,255,0.2)',
              borderRadius: 8,
              padding: 16,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}>
              <FileSpreadsheet size={20} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 600,
                  fontSize: 14,
                  color: 'var(--accent)',
                  marginBottom: 4,
                }}>
                  Historical Import
                </div>
                <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0, lineHeight: 1.5 }}>
                  All imported jobs will be tagged as historical imports with <code style={{
                    background: 'var(--surface2)',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontSize: 11,
                    ...mono,
                  }}>pipe_stage: done</code>. They will appear in analytics and reporting but
                  will not enter the active pipeline.
                </p>
              </div>
            </div>

            {/* Default Status */}
            <div>
              <label style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 600,
                fontSize: 14,
                color: 'var(--text1)',
                display: 'block',
                marginBottom: 8,
              }}>
                Default Job Status
              </label>
              <div style={{ display: 'flex', gap: 12 }}>
                {[
                  { value: 'closed' as const, label: 'Closed / Complete', desc: 'Mark as successfully completed' },
                  { value: 'cancelled' as const, label: 'Cancelled / Archived', desc: 'Mark as cancelled or archived' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setDefaultStatus(opt.value)}
                    style={{
                      flex: 1,
                      background: defaultStatus === opt.value ? 'rgba(79,127,255,0.1)' : 'var(--bg)',
                      border: `1px solid ${defaultStatus === opt.value ? 'var(--accent)' : 'var(--surface2)'}`,
                      borderRadius: 8,
                      padding: '14px 16px',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 600,
                      fontSize: 14,
                      color: defaultStatus === opt.value ? 'var(--accent)' : 'var(--text1)',
                      marginBottom: 4,
                    }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Default Job Type */}
            <div>
              <label style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 600,
                fontSize: 14,
                color: 'var(--text1)',
                display: 'block',
                marginBottom: 8,
              }}>
                Default Job Type
              </label>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {[
                  { value: 'wrap' as const, label: 'Wrap' },
                  { value: 'ppf' as const, label: 'PPF' },
                  { value: 'design' as const, label: 'Design' },
                  { value: 'decking' as const, label: 'Decking' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setDefaultType(opt.value)}
                    style={{
                      background: defaultType === opt.value ? 'rgba(79,127,255,0.1)' : 'var(--bg)',
                      border: `1px solid ${defaultType === opt.value ? 'var(--accent)' : 'var(--surface2)'}`,
                      borderRadius: 8,
                      padding: '10px 20px',
                      cursor: 'pointer',
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 600,
                      fontSize: 14,
                      color: defaultType === opt.value ? 'var(--accent)' : 'var(--text2)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Duplicate Detection */}
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer',
                padding: '14px 16px',
                background: 'var(--bg)',
                borderRadius: 8,
                border: '1px solid var(--surface2)',
              }}>
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  border: `2px solid ${detectDuplicates ? 'var(--accent)' : 'var(--text3)'}`,
                  background: detectDuplicates ? 'var(--accent)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                }}>
                  {detectDuplicates && <CheckCircle2 size={14} style={{ color: '#fff' }} />}
                </div>
                <input
                  type="checkbox"
                  checked={detectDuplicates}
                  onChange={(e) => setDetectDuplicates(e.target.checked)}
                  style={{ display: 'none' }}
                />
                <div>
                  <div style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 600,
                    fontSize: 14,
                    color: 'var(--text1)',
                    marginBottom: 2,
                  }}>
                    Duplicate Detection
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                    Skip rows where the job title already exists in the database.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
            <button style={btnSecondary} onClick={() => setStep(3)}>
              <ArrowLeft size={16} /> Back to Preview
            </button>
            <button style={btnPrimary} onClick={runImport}>
              <Upload size={16} /> Import {validRows.length} Jobs
            </button>
          </div>
        </div>
      )}

      {/* ── Step 5: Results ───────────────────────────────────────────────── */}
      {step === 5 && (
        <div style={card}>
          {importing ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Loader2
                size={40}
                style={{
                  color: 'var(--accent)',
                  animation: 'spin 1s linear infinite',
                  marginBottom: 20,
                }}
              />
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
              <h2 style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--text1)',
                margin: '0 0 16px',
              }}>
                Importing Jobs...
              </h2>
              {/* Progress bar */}
              <div style={{
                width: '100%',
                maxWidth: 400,
                margin: '0 auto',
                background: 'var(--surface2)',
                borderRadius: 8,
                height: 8,
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'var(--accent)',
                  borderRadius: 8,
                  transition: 'width 0.3s ease',
                }} />
              </div>
              <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 12, ...mono }}>
                {progress}% complete
              </p>
            </div>
          ) : result ? (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 32 }}>
                {result.errors.length === 0 ? (
                  <CheckCircle2 size={48} style={{ color: 'var(--green)', marginBottom: 16 }} />
                ) : (
                  <AlertTriangle size={48} style={{ color: 'var(--amber, #f59e0b)', marginBottom: 16 }} />
                )}
                <h2 style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 24,
                  fontWeight: 700,
                  color: 'var(--text1)',
                  margin: '0 0 8px',
                }}>
                  Import Complete
                </h2>
              </div>

              {/* Results stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: 12,
                marginBottom: 24,
              }}>
                {[
                  { label: 'Total Processed', value: result.total, color: 'var(--text1)' },
                  { label: 'Successfully Imported', value: result.success, color: 'var(--green)' },
                  { label: 'Errors / Skipped', value: result.errors.length, color: result.errors.length > 0 ? 'var(--red)' : 'var(--text3)' },
                ].map(stat => (
                  <div key={stat.label} style={{
                    background: 'var(--bg)',
                    borderRadius: 8,
                    padding: '20px 24px',
                    border: '1px solid var(--surface2)',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>{stat.label}</div>
                    <div style={{ ...mono, fontSize: 32, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                  </div>
                ))}
              </div>

              {/* Success rate bar */}
              <div style={{
                background: 'var(--bg)',
                borderRadius: 8,
                padding: '16px 20px',
                border: '1px solid var(--surface2)',
                marginBottom: 24,
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}>
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>Success Rate</span>
                  <span style={{
                    ...mono,
                    fontSize: 14,
                    fontWeight: 700,
                    color: result.total > 0
                      ? (result.success / result.total >= 0.9 ? 'var(--green)' : 'var(--amber, #f59e0b)')
                      : 'var(--text3)',
                  }}>
                    {result.total > 0 ? ((result.success / result.total) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  background: 'var(--surface2)',
                  borderRadius: 8,
                  height: 8,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: result.total > 0 ? `${(result.success / result.total) * 100}%` : '0%',
                    height: '100%',
                    background: result.success / result.total >= 0.9 ? 'var(--green)' : 'var(--amber, #f59e0b)',
                    borderRadius: 8,
                  }} />
                </div>
              </div>

              {/* Error details */}
              {result.errors.length > 0 && (
                <div style={{
                  background: 'rgba(242,90,90,0.06)',
                  border: '1px solid rgba(242,90,90,0.15)',
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 24,
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                  }}>
                    <span style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 600,
                      color: 'var(--red)',
                      fontSize: 14,
                    }}>
                      Errors ({result.errors.length})
                    </span>
                    <button
                      onClick={downloadErrorReport}
                      style={{
                        ...btnSecondary,
                        padding: '6px 14px',
                        fontSize: 12,
                        color: 'var(--red)',
                        borderColor: 'rgba(242,90,90,0.3)',
                      }}
                    >
                      <Download size={12} /> Download Error Report
                    </button>
                  </div>
                  <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                    {result.errors.slice(0, 30).map((err, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        gap: 12,
                        padding: '6px 0',
                        fontSize: 12,
                        color: 'var(--text2)',
                        borderBottom: idx < result.errors.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      }}>
                        <span style={{ ...mono, color: 'var(--red)', minWidth: 60 }}>Row {err.row}</span>
                        <span>{err.message}</span>
                      </div>
                    ))}
                    {result.errors.length > 30 && (
                      <div style={{ fontSize: 12, color: 'var(--text3)', paddingTop: 8 }}>
                        ...and {result.errors.length - 30} more errors. Download the full report above.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
                <button style={btnSecondary} onClick={resetWizard}>
                  <Upload size={16} /> Import More
                </button>
                <button
                  style={btnPrimary}
                  onClick={() => window.location.href = '/jobs'}
                >
                  View Jobs <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
