'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { Plus, X, Check, Loader2, ArrowRight } from 'lucide-react'
import Link from 'next/link'

// ── Types ────────────────────────────────────────────────────────────────────
interface Props {
  profile: Profile
}

interface DropdownPos {
  rowId: string
  top: number
  left: number
  width: number
}

interface Customer {
  id: string
  name: string
  company_name: string | null
}

interface ImportRow {
  id: string
  customerSearch: string
  customerId: string | null
  customerName: string
  isNewCustomer: boolean
  title: string
  vehicle: string
  type: string
  status: string
  installDate: string
  revenue: string
  notes: string
}

// ── Constants ────────────────────────────────────────────────────────────────
const TYPE_OPTIONS = ['Full Wrap', 'Partial Wrap', 'Decals', 'Tinting', 'PPF', 'Fleet', 'Other']
const STATUS_OPTIONS = ['Lead', 'Estimate Sent', 'Approved', 'In Production', 'Scheduled', 'Completed']

const TYPE_MAP: Record<string, { dbType: string; subType: string | null }> = {
  'Full Wrap':    { dbType: 'wrap', subType: 'full_wrap' },
  'Partial Wrap': { dbType: 'wrap', subType: 'partial_wrap' },
  'Decals':       { dbType: 'wrap', subType: 'decals' },
  'Tinting':      { dbType: 'wrap', subType: 'tinting' },
  'PPF':          { dbType: 'ppf',  subType: null },
  'Fleet':        { dbType: 'wrap', subType: 'fleet' },
  'Other':        { dbType: 'wrap', subType: 'other' },
}

const STATUS_MAP: Record<string, { dbStatus: string; pipeStage: string }> = {
  'Lead':           { dbStatus: 'estimate',           pipeStage: 'sales_in' },
  'Estimate Sent':  { dbStatus: 'estimate',           pipeStage: 'sales_in' },
  'Approved':       { dbStatus: 'active',             pipeStage: 'sales_in' },
  'In Production':  { dbStatus: 'in_production',      pipeStage: 'production' },
  'Scheduled':      { dbStatus: 'install_scheduled',  pipeStage: 'install' },
  'Completed':      { dbStatus: 'closed',             pipeStage: 'done' },
}

const COLUMNS = ['Customer', 'Job Title', 'Vehicle', 'Type', 'Status', 'Install Date', 'Revenue', 'Notes']

function createEmptyRow(): ImportRow {
  return {
    id: crypto.randomUUID(),
    customerSearch: '',
    customerId: null,
    customerName: '',
    isNewCustomer: false,
    title: '',
    vehicle: '',
    type: 'Full Wrap',
    status: 'Lead',
    installDate: '',
    revenue: '',
    notes: '',
  }
}

function isRowEmpty(row: ImportRow): boolean {
  return !row.customerSearch && !row.title && !row.vehicle && !row.revenue && !row.notes && !row.installDate
}

function hasWarning(row: ImportRow): boolean {
  if (isRowEmpty(row)) return false
  return !row.customerSearch || !row.title
}

// ── Styles ───────────────────────────────────────────────────────────────────
const headerCell: React.CSSProperties = {
  padding: '8px 10px',
  fontSize: 11,
  fontFamily: "'Barlow Condensed', sans-serif",
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text3)',
  background: 'var(--surface)',
  borderBottom: '1px solid var(--surface2)',
  position: 'sticky',
  top: 0,
  zIndex: 10,
  whiteSpace: 'nowrap',
}

const cellInput: React.CSSProperties = {
  width: '100%',
  background: 'transparent',
  border: 'none',
  outline: 'none',
  color: 'var(--text1)',
  fontSize: 13,
  padding: '8px 10px',
  fontFamily: 'inherit',
}

const cellSelect: React.CSSProperties = {
  width: '100%',
  background: 'var(--surface)',
  border: 'none',
  outline: 'none',
  color: 'var(--text1)',
  fontSize: 13,
  padding: '8px 6px',
  fontFamily: 'inherit',
  cursor: 'pointer',
}

const revenueInput: React.CSSProperties = {
  ...cellInput,
  fontFamily: "'JetBrains Mono', monospace",
  textAlign: 'right',
}

// ── Component ────────────────────────────────────────────────────────────────
export default function BatchImportClient({ profile }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<ImportRow[]>(() => Array.from({ length: 5 }, createEmptyRow))
  const [customerResults, setCustomerResults] = useState<Record<string, Customer[]>>({})
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [dropdownPos, setDropdownPos] = useState<DropdownPos | null>(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const searchTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const importingRef = useRef(false)

  // Close dropdown on outside click or scroll
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-customer-cell]') && !target.closest('[data-customer-dropdown]')) {
        setActiveDropdown(null)
        setDropdownPos(null)
      }
    }
    const handleScroll = () => {
      setActiveDropdown(null)
      setDropdownPos(null)
    }
    document.addEventListener('mousedown', handleClick)
    gridRef.current?.addEventListener('scroll', handleScroll)
    const gridEl = gridRef.current
    return () => {
      document.removeEventListener('mousedown', handleClick)
      gridEl?.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // ── Customer search ────────────────────────────────────────────────────────
  const openDropdown = useCallback((rowId: string, inputEl: HTMLElement | null) => {
    if (!inputEl || !inputEl.isConnected) return
    const rect = inputEl.getBoundingClientRect()
    if (rect.width === 0) return
    setDropdownPos({ rowId, top: rect.bottom, left: rect.left, width: rect.width })
    setActiveDropdown(rowId)
  }, [])

  const searchCustomers = useCallback((rowId: string, query: string, inputEl: HTMLElement | null) => {
    if (searchTimeouts.current[rowId]) {
      clearTimeout(searchTimeouts.current[rowId])
    }
    if (query.length < 2) {
      setCustomerResults(prev => ({ ...prev, [rowId]: [] }))
      setActiveDropdown(null)
      setDropdownPos(null)
      return
    }
    searchTimeouts.current[rowId] = setTimeout(async () => {
      const { data } = await supabase
        .from('customers')
        .select('id, name, company_name')
        .eq('org_id', profile.org_id)
        .ilike('name', `%${query}%`)
        .limit(6)
      setCustomerResults(prev => ({ ...prev, [rowId]: data || [] }))
      openDropdown(rowId, inputEl)
    }, 200)
  }, [supabase, profile.org_id, openDropdown])

  // ── Row management ─────────────────────────────────────────────────────────
  const updateRow = useCallback((rowId: string, field: keyof ImportRow, value: string) => {
    setRows(prev => prev.map(r =>
      r.id === rowId ? { ...r, [field]: value } : r
    ))
  }, [])

  const selectCustomer = useCallback((rowId: string, customer: Customer) => {
    setRows(prev => prev.map(r =>
      r.id === rowId ? {
        ...r,
        customerSearch: customer.name,
        customerId: customer.id,
        customerName: customer.name,
        isNewCustomer: false,
      } : r
    ))
    setActiveDropdown(null)
    setDropdownPos(null)
  }, [])

  const markNewCustomer = useCallback((rowId: string, name: string) => {
    setRows(prev => prev.map(r =>
      r.id === rowId ? {
        ...r,
        customerSearch: name,
        customerId: null,
        customerName: name,
        isNewCustomer: true,
      } : r
    ))
    setActiveDropdown(null)
    setDropdownPos(null)
  }, [])

  const addRow = useCallback(() => {
    setRows(prev => [...prev, createEmptyRow()])
  }, [])

  const removeRow = useCallback((rowId: string) => {
    setRows(prev => {
      const next = prev.filter(r => r.id !== rowId)
      return next.length === 0 ? [createEmptyRow()] : next
    })
  }, [])

  const clearAll = useCallback(() => {
    setRows(Array.from({ length: 5 }, createEmptyRow))
    setResult(null)
  }, [])

  // ── Keyboard navigation ────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent, rowIndex: number) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (rowIndex === rows.length - 1) {
        addRow()
      }
      setTimeout(() => {
        const nextInput = gridRef.current?.querySelector(
          `[data-row="${rowIndex + 1}"][data-col="0"]`
        ) as HTMLElement
        nextInput?.focus()
      }, 50)
    }
  }, [rows.length, addRow])

  // ── Import ─────────────────────────────────────────────────────────────────
  const handleImport = async () => {
    if (importingRef.current) return
    const validRows = rows.filter(r => !isRowEmpty(r))
    if (validRows.length === 0) return

    importingRef.current = true
    setImporting(true)
    setProgress(0)
    setResult(null)

    let successCount = 0
    const errors: string[] = []

    try {
      // Phase 1: Create new customers
      const newCustomerMap: Record<string, string> = {}
      const uniqueNewNames = [...new Set(
        validRows.filter(r => r.isNewCustomer && r.customerName).map(r => r.customerName)
      )]

      for (const name of uniqueNewNames) {
        const { data, error } = await supabase
          .from('customers')
          .insert({ org_id: profile.org_id, name: name })
          .select('id')
          .single()
        if (error) {
          errors.push(`Failed to create customer "${name}": ${error.message}`)
        } else if (data) {
          newCustomerMap[name] = data.id
        }
      }

      // Phase 2: Create jobs
      const total = validRows.length
      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i]
        setProgress(Math.round(((i + 1) / total) * 100))

        let customerId = row.customerId
        if (row.isNewCustomer && row.customerName) {
          customerId = newCustomerMap[row.customerName] || null
        }

        const typeInfo = TYPE_MAP[row.type] || TYPE_MAP['Other']
        const statusInfo = STATUS_MAP[row.status] || STATUS_MAP['Lead']

        const revenueNum = row.revenue
          ? parseFloat(row.revenue.replace(/[^0-9.]/g, ''))
          : null

        const jobData: Record<string, unknown> = {
          org_id: profile.org_id,
          created_by: profile.id,
          title: row.title || `${row.type} - ${row.vehicle || 'New Job'}`,
          customer_id: customerId,
          type: typeInfo.dbType,
          status: statusInfo.dbStatus,
          pipe_stage: statusInfo.pipeStage,
          vehicle_desc: row.vehicle || null,
          install_date: row.installDate || null,
          revenue: revenueNum && !isNaN(revenueNum) ? revenueNum : null,
          notes: row.notes || null,
          division: 'wraps',
          priority: 'normal',
          form_data: typeInfo.subType ? { wrap_type: typeInfo.subType } : {},
          agent_id: profile.id,
        }

        const { error } = await supabase.from('projects').insert(jobData)
        if (error) {
          errors.push(`Row ${i + 1} "${row.title || row.vehicle || 'Untitled'}": ${error.message}`)
        } else {
          successCount++
        }
      }
    } catch (err) {
      errors.push(`Unexpected error: ${err instanceof Error ? err.message : 'Import interrupted'}`)
    } finally {
      importingRef.current = false
      setImporting(false)
      setResult({ success: successCount, errors })
    }
  }

  // ── Computed values ────────────────────────────────────────────────────────
  const readyCount = rows.filter(r => !isRowEmpty(r)).length
  const warningCount = rows.filter(r => hasWarning(r)).length

  // ── Success state ──────────────────────────────────────────────────────────
  if (result && result.success > 0 && result.errors.length === 0) {
    return (
      <div style={{ maxWidth: 600, margin: '80px auto', textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(34,192,122,0.15)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
        }}>
          <Check size={32} style={{ color: 'var(--green)' }} />
        </div>
        <h2 style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
          fontSize: 28, color: 'var(--text1)', margin: '0 0 8px',
        }}>
          {result.success} job{result.success !== 1 ? 's' : ''} imported successfully
        </h2>
        <p style={{ color: 'var(--text2)', fontSize: 14, margin: '0 0 32px' }}>
          All jobs are now in your system and ready to manage.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/pipeline" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--accent)', color: '#fff', borderRadius: 8,
            padding: '10px 24px', fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 600, fontSize: 15, textDecoration: 'none',
          }}>
            View in Pipeline <ArrowRight size={16} />
          </Link>
          <Link href="/jobs" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--surface2)', color: 'var(--text1)', borderRadius: 8,
            padding: '10px 24px', fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 600, fontSize: 15, textDecoration: 'none',
          }}>
            View All Jobs
          </Link>
          <button onClick={() => { setResult(null); clearAll() }} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--surface)', color: 'var(--text2)', borderRadius: 8,
            padding: '10px 24px', fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 600, fontSize: 15, border: '1px solid var(--surface2)', cursor: 'pointer',
          }}>
            Import More
          </button>
        </div>
      </div>
    )
  }

  // ── Partial success state ──────────────────────────────────────────────────
  if (result && result.errors.length > 0) {
    return (
      <div style={{ maxWidth: 700, margin: '40px auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h2 style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
            fontSize: 28, color: 'var(--text1)', margin: '0 0 8px',
          }}>
            Import Complete
          </h2>
          <p style={{ color: 'var(--text2)', fontSize: 14, margin: 0 }}>
            {result.success} imported successfully, {result.errors.length} failed
          </p>
        </div>
        <div style={{
          background: 'var(--surface)', borderRadius: 12,
          border: '1px solid var(--surface2)', padding: 20, marginBottom: 24,
        }}>
          <h3 style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
            fontSize: 15, color: 'var(--red)', margin: '0 0 12px',
          }}>
            Errors
          </h3>
          {result.errors.map((err, i) => (
            <div key={i} style={{
              fontSize: 13, color: 'var(--text2)', padding: '6px 0',
              borderBottom: i < result.errors.length - 1 ? '1px solid var(--surface2)' : 'none',
            }}>
              {err}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/pipeline" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--accent)', color: '#fff', borderRadius: 8,
            padding: '10px 24px', fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 600, fontSize: 15, textDecoration: 'none',
          }}>
            View in Pipeline <ArrowRight size={16} />
          </Link>
          <button onClick={() => { setResult(null); clearAll() }} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--surface)', color: 'var(--text2)', borderRadius: 8,
            padding: '10px 24px', fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 600, fontSize: 15, border: '1px solid var(--surface2)', cursor: 'pointer',
          }}>
            Import More
          </button>
        </div>
      </div>
    )
  }

  // ── Main grid ──────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
          fontSize: 28, color: 'var(--text1)', margin: '0 0 6px',
        }}>
          Quick Job Import
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: 14, margin: 0 }}>
          Tab through each row to move fast. Press Enter to add a new row.
        </p>
      </div>

      {/* Grid */}
      <div ref={gridRef} style={{
        background: 'var(--surface)', borderRadius: 12,
        border: '1px solid var(--surface2)', overflow: 'auto',
        marginBottom: 16,
      }}>
        <table style={{
          width: '100%', borderCollapse: 'collapse',
          minWidth: 1100, tableLayout: 'fixed',
        }}>
          <colgroup>
            <col style={{ width: 180 }} />
            <col style={{ width: 200 }} />
            <col style={{ width: 180 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 160 }} />
            <col style={{ width: 40 }} />
          </colgroup>
          <thead>
            <tr>
              {COLUMNS.map((col, i) => (
                <th key={i} style={headerCell}>{col}</th>
              ))}
              <th style={{ ...headerCell, width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => {
              const warn = hasWarning(row)
              const empty = isRowEmpty(row)
              const rowBg = warn
                ? 'rgba(245,158,11,0.06)'
                : rowIndex % 2 === 0
                  ? 'transparent'
                  : 'rgba(255,255,255,0.015)'

              return (
                <tr key={row.id} style={{
                  background: rowBg,
                  borderBottom: '1px solid var(--surface2)',
                }}>
                  {/* Customer */}
                  <td style={{ padding: 0 }} data-customer-cell>
                    <input
                      data-row={rowIndex}
                      data-col="0"
                      type="text"
                      placeholder="Search customer..."
                      value={row.customerSearch}
                      onChange={(e) => {
                        const val = e.target.value
                        const el = e.currentTarget
                        setRows(prev => prev.map(r =>
                          r.id === row.id
                            ? { ...r, customerSearch: val, customerId: null, isNewCustomer: false }
                            : r
                        ))
                        searchCustomers(row.id, val, el)
                      }}
                      onFocus={(e) => {
                        if (row.customerSearch.length >= 2) {
                          searchCustomers(row.id, row.customerSearch, e.currentTarget)
                        }
                      }}
                      onKeyDown={(e) => handleKeyDown(e, rowIndex)}
                      style={{
                        ...cellInput,
                        borderLeft: row.isNewCustomer
                          ? '3px solid var(--cyan)'
                          : row.customerId
                            ? '3px solid var(--green)'
                            : warn && row.customerSearch === ''
                              ? '3px solid var(--amber)'
                              : '3px solid transparent',
                      }}
                    />
                  </td>

                  {/* Job Title */}
                  <td style={{ padding: 0 }}>
                    <input
                      data-row={rowIndex}
                      data-col="1"
                      type="text"
                      placeholder="e.g. Full wrap - 2023 Silverado"
                      value={row.title}
                      onChange={(e) => updateRow(row.id, 'title', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, rowIndex)}
                      style={{
                        ...cellInput,
                        color: warn && !row.title ? 'var(--amber)' : 'var(--text1)',
                      }}
                    />
                  </td>

                  {/* Vehicle */}
                  <td style={{ padding: 0 }}>
                    <input
                      data-row={rowIndex}
                      data-col="2"
                      type="text"
                      placeholder="2023 Chevy Silverado Black"
                      value={row.vehicle}
                      onChange={(e) => updateRow(row.id, 'vehicle', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, rowIndex)}
                      style={cellInput}
                    />
                  </td>

                  {/* Type */}
                  <td style={{ padding: 0 }}>
                    <select
                      data-row={rowIndex}
                      data-col="3"
                      value={row.type}
                      onChange={(e) => updateRow(row.id, 'type', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, rowIndex)}
                      style={cellSelect}
                    >
                      {TYPE_OPTIONS.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </td>

                  {/* Status */}
                  <td style={{ padding: 0 }}>
                    <select
                      data-row={rowIndex}
                      data-col="4"
                      value={row.status}
                      onChange={(e) => updateRow(row.id, 'status', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, rowIndex)}
                      style={cellSelect}
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>

                  {/* Install Date */}
                  <td style={{ padding: 0 }}>
                    <input
                      data-row={rowIndex}
                      data-col="5"
                      type="date"
                      value={row.installDate}
                      onChange={(e) => updateRow(row.id, 'installDate', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, rowIndex)}
                      style={{ ...cellInput, colorScheme: 'dark' }}
                    />
                  </td>

                  {/* Revenue */}
                  <td style={{ padding: 0 }}>
                    <input
                      data-row={rowIndex}
                      data-col="6"
                      type="text"
                      inputMode="decimal"
                      placeholder="$0"
                      value={row.revenue}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, '')
                        updateRow(row.id, 'revenue', val)
                      }}
                      onBlur={() => {
                        if (row.revenue) {
                          const num = parseFloat(row.revenue)
                          if (!isNaN(num)) {
                            updateRow(row.id, 'revenue', num.toFixed(2))
                          }
                        }
                      }}
                      onKeyDown={(e) => handleKeyDown(e, rowIndex)}
                      style={revenueInput}
                    />
                  </td>

                  {/* Notes */}
                  <td style={{ padding: 0 }}>
                    <input
                      data-row={rowIndex}
                      data-col="7"
                      type="text"
                      placeholder="Notes..."
                      value={row.notes}
                      onChange={(e) => updateRow(row.id, 'notes', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, rowIndex)}
                      style={cellInput}
                    />
                  </td>

                  {/* Delete */}
                  <td style={{ padding: 0, textAlign: 'center' }}>
                    <button
                      onClick={() => removeRow(row.id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: empty ? 'var(--surface2)' : 'var(--text3)',
                        padding: 6, borderRadius: 4, display: 'inline-flex',
                        transition: 'color 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.color = 'var(--red)'
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.color = empty ? 'var(--surface2)' : 'var(--text3)'
                      }}
                      title="Remove row"
                    >
                      <X size={15} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Customer autocomplete dropdown — rendered outside table to avoid overflow clipping */}
      {activeDropdown && dropdownPos && (() => {
        const row = rows.find(r => r.id === dropdownPos.rowId)
        if (!row) return null
        return (
          <div
            data-customer-dropdown
            style={{
              position: 'fixed',
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
              background: '#1a1d27',
              borderRadius: '0 0 8px 8px',
              border: '1px solid rgba(255,255,255,0.08)',
              borderTop: 'none',
              zIndex: 100,
              maxHeight: 200,
              overflowY: 'auto',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
          >
            {(customerResults[row.id] || []).map(c => (
              <div
                key={c.id}
                onClick={() => selectCustomer(row.id, c)}
                style={{
                  padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                  color: 'var(--text1)', borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(79,127,255,0.1)'
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent'
                }}
              >
                {c.name}
                {c.company_name && (
                  <span style={{ color: 'var(--text3)', marginLeft: 8, fontSize: 12 }}>
                    {c.company_name}
                  </span>
                )}
              </div>
            ))}
            {row.customerSearch.length >= 2 && (
              <div
                onClick={() => markNewCustomer(row.id, row.customerSearch)}
                style={{
                  padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                  color: 'var(--cyan)', borderTop: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(34,211,238,0.08)'
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent'
                }}
              >
                <Plus size={14} />
                Create &quot;{row.customerSearch}&quot; as new customer
              </div>
            )}
          </div>
        )
      })()}

      {/* Add Row */}
      <button onClick={addRow} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'var(--surface)', color: 'var(--text2)',
        border: '1px dashed var(--surface2)', borderRadius: 8,
        padding: '8px 16px', fontSize: 13, cursor: 'pointer',
        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
        width: '100%', justifyContent: 'center',
        transition: 'border-color 0.15s, color 0.15s',
      }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'
          ;(e.currentTarget as HTMLElement).style.color = 'var(--accent)'
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--surface2)'
          ;(e.currentTarget as HTMLElement).style.color = 'var(--text2)'
        }}
      >
        <Plus size={15} /> Add Row
      </button>

      {/* Sticky Bottom Bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--surface)', borderTop: '1px solid var(--surface2)',
        padding: '12px 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', zIndex: 40,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 14,
            color: readyCount > 0 ? 'var(--green)' : 'var(--text3)',
          }}>
            {readyCount} job{readyCount !== 1 ? 's' : ''} ready to import
          </span>
          {warningCount > 0 && (
            <span style={{
              fontSize: 12, color: 'var(--amber)',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {warningCount} missing customer or title
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {importing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Loader2 size={16} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13, color: 'var(--text2)',
              }}>
                {progress}%
              </span>
              <div style={{
                width: 80, height: 4, borderRadius: 2,
                background: 'var(--surface2)', overflow: 'hidden',
              }}>
                <div style={{
                  width: `${progress}%`, height: '100%',
                  background: 'var(--accent)', borderRadius: 2,
                  transition: 'width 0.3s',
                }} />
              </div>
            </div>
          )}

          <button onClick={clearAll} disabled={importing} style={{
            background: 'var(--surface2)', color: 'var(--text2)',
            border: 'none', borderRadius: 8, padding: '8px 16px',
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
            fontSize: 14, cursor: importing ? 'not-allowed' : 'pointer',
            opacity: importing ? 0.5 : 1,
          }}>
            Clear All
          </button>

          <button onClick={handleImport} disabled={importing || readyCount === 0} style={{
            background: readyCount > 0 && !importing ? 'var(--accent)' : 'var(--surface2)',
            color: readyCount > 0 && !importing ? '#fff' : 'var(--text3)',
            border: 'none', borderRadius: 8, padding: '8px 24px',
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
            fontSize: 15, cursor: readyCount > 0 && !importing ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {importing ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Importing...
              </>
            ) : (
              <>
                <Check size={16} />
                Import All Jobs
              </>
            )}
          </button>
        </div>
      </div>

      {/* Spinner keyframes */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
