'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  Receipt, Upload, Scan, Plus, Check, X, AlertTriangle, Loader2,
  DollarSign, Filter, ChevronDown, FileText, Eye, MoreHorizontal,
  Fuel, Wrench, Package, Car, ParkingCircle, Utensils, BedDouble,
  Shirt, GraduationCap, HelpCircle
} from 'lucide-react'

interface Expense {
  id: string
  user_id: string
  category: string
  amount: number
  currency: string
  expense_date: string
  description: string
  receipt_url: string | null
  payment_method: string
  merchant_name: string | null
  ai_extracted: boolean
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'info_requested'
  approved_at: string | null
  rejection_reason: string | null
  manager_notes: string | null
  flagged: boolean
  flag_reason?: string | null
  user?: { id: string; name: string; avatar_url: string | null }
  job?: { id: string; title: string } | null
  approver?: { id: string; name: string } | null
  created_at: string
}

interface Job { id: string; title: string }

const CATEGORIES = [
  { value: 'fuel', label: 'Fuel', icon: Fuel },
  { value: 'tools', label: 'Tools', icon: Wrench },
  { value: 'supplies', label: 'Supplies', icon: Package },
  { value: 'materials', label: 'Materials', icon: Package },
  { value: 'parking', label: 'Parking', icon: ParkingCircle },
  { value: 'tolls', label: 'Tolls', icon: Car },
  { value: 'meals', label: 'Meals', icon: Utensils },
  { value: 'lodging', label: 'Lodging', icon: BedDouble },
  { value: 'uniform', label: 'Uniform', icon: Shirt },
  { value: 'training', label: 'Training', icon: GraduationCap },
  { value: 'other', label: 'Other', icon: HelpCircle },
]
const STATUS_COLOR: Record<string, string> = {
  pending: 'var(--amber)', approved: 'var(--green)', rejected: 'var(--red)',
  paid: 'var(--accent)', info_requested: 'var(--cyan)',
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending', approved: 'Approved', rejected: 'Rejected',
  paid: 'Paid', info_requested: 'Info Needed',
}

export default function ExpensesClient({
  profile,
  employees,
  jobs,
}: {
  profile: Profile
  employees: any[]
  jobs: Job[]
}) {
  const supabase = createClient()
  const isAdmin = profile.role === 'owner' || profile.role === 'admin'

  const [tab, setTab] = useState<'submit' | 'history' | 'pending'>('submit')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  // Submit form
  const [form, setForm] = useState({
    category: 'other',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    description: '',
    payment_method: 'personal_card',
    merchant_name: '',
    job_id: '',
  })
  const [receiptUrl, setReceiptUrl] = useState('')
  const [uploadingReceipt, setUploadingReceipt] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [aiExtracting, setAiExtracting] = useState(false)
  const [scanResult, setScanResult] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Approval
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [managerNote, setManagerNote] = useState<Record<string, string>>({})
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus) params.set('status', filterStatus)
    if (filterCategory) params.set('category', filterCategory)
    if (filterUser && isAdmin) params.set('user_id', filterUser)
    if (filterFrom) params.set('from', filterFrom)
    if (filterTo) params.set('to', filterTo)
    const res = await fetch(`/api/expenses?${params}`)
    const data = await res.json()
    setExpenses(data.expenses || [])
    setLoading(false)
  }, [filterStatus, filterCategory, filterUser, filterFrom, filterTo, isAdmin])

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  const handleReceiptUpload = async (file: File) => {
    if (!file) return
    setUploadingReceipt(true)
    const ext = file.name.split('.').pop()
    const path = `receipts/${profile.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('project-files').upload(path, file, { upsert: true })
    if (error) { setSaveError('Upload failed: ' + error.message); setUploadingReceipt(false); return }
    const { data: { publicUrl } } = supabase.storage.from('project-files').getPublicUrl(path)
    setReceiptUrl(publicUrl)
    setUploadingReceipt(false)

    // Auto-scan with AI
    if (publicUrl) {
      setAiExtracting(true)
      try {
        const res = await fetch('/api/expenses/scan-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ receipt_url: publicUrl }),
        })
        if (res.ok) {
          const data = await res.json()
          setScanResult(data.extracted)
          // Auto-fill form
          if (data.extracted) {
            const e = data.extracted
            setForm(prev => ({
              ...prev,
              merchant_name: e.merchant_name || prev.merchant_name,
              amount: e.amount?.toString() || prev.amount,
              expense_date: e.date || prev.expense_date,
              category: e.category || prev.category,
              description: e.description || prev.description,
              payment_method: e.payment_method || prev.payment_method,
            }))
          }
        }
      } catch {}
      setAiExtracting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveError('')
    const amount = parseFloat(form.amount)
    if (!amount || amount <= 0) { setSaveError('Enter a valid amount'); return }
    if (!form.description) { setSaveError('Description is required'); return }
    if (amount > 25 && !receiptUrl) { setSaveError('Receipt photo required for expenses over $25'); return }

    setSaving(true)
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        amount,
        receipt_url: receiptUrl || null,
        merchant_name: form.merchant_name || null,
        ai_extracted: !!scanResult,
        job_id: form.job_id || null,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setSaveError(data.error || 'Failed to submit'); return }

    setSaveSuccess(true)
    setForm({ category: 'other', amount: '', expense_date: new Date().toISOString().split('T')[0],
      description: '', payment_method: 'personal_card', merchant_name: '', job_id: '' })
    setReceiptUrl('')
    setScanResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setTimeout(() => setSaveSuccess(false), 4000)
    fetchExpenses()
  }

  const handleAction = async (id: string, action: string, extra?: any) => {
    setActionLoading(id + '_' + action)
    await fetch(`/api/expenses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    })
    setActionLoading(null)
    fetchExpenses()
  }

  const pendingCount = expenses.filter(e => e.status === 'pending').length

  const pill = (status: string) => (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
      background: STATUS_COLOR[status] + '22', color: STATUS_COLOR[status], textTransform: 'uppercase'
    }}>{STATUS_LABEL[status] || status}</span>
  )

  const catIcon = (cat: string) => {
    const c = CATEGORIES.find(x => x.value === cat)
    const Icon = c?.icon || HelpCircle
    return <Icon size={14} />
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--surface)', border: '1px solid #2a2d3a',
    borderRadius: 8, padding: '9px 12px', color: 'var(--text1)', fontSize: 14, outline: 'none'
  }
  const labelStyle: React.CSSProperties = { fontSize: 12, color: 'var(--text2)', marginBottom: 4, display: 'block' }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-barlow)', color: 'var(--text1)', margin: 0 }}>
            Expense Reimbursement
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 4 }}>
            Submit receipts · AI auto-extracts · Manager approves
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>Pending Total</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>
            ${expenses.filter(e => e.status === 'pending').reduce((s, e) => s + e.amount, 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--surface)', borderRadius: 10, padding: 4 }}>
        {([
          ['submit', 'Submit Expense'],
          ['history', 'My Expenses'],
          ...(isAdmin ? [['pending', `Approve Queue${pendingCount > 0 ? ` (${pendingCount})` : ''}`]] : []),
        ] as [string, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key as any)} style={{
            flex: 1, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: tab === key ? 'var(--accent)' : 'transparent',
            color: tab === key ? '#fff' : 'var(--text2)', fontWeight: 600, fontSize: 14, transition: 'all 0.15s'
          }}>{label}</button>
        ))}
      </div>

      {/* ── SUBMIT TAB ───────────────────────────────────────────────────── */}
      {tab === 'submit' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Receipt Upload + AI Scan */}
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 24, border: '1px solid #2a2d3a' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Scan size={18} color="var(--accent)" /> AI Receipt Scanner
            </h3>
            <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 16 }}>
              Upload your receipt — Claude AI will automatically extract merchant, date, amount, and category.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={e => { if (e.target.files?.[0]) handleReceiptUpload(e.target.files[0]) }}
              style={{ display: 'none' }}
            />

            {receiptUrl ? (
              <div style={{ marginBottom: 16 }}>
                <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #2a2d3a', marginBottom: 12 }}>
                  <img src={receiptUrl} alt="Receipt" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', background: '#111' }} />
                </div>
                {aiExtracting && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)', fontSize: 13 }}>
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    Claude is reading your receipt...
                  </div>
                )}
                {scanResult && !aiExtracting && (
                  <div style={{ background: 'var(--green)11', border: '1px solid var(--green)44', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600, marginBottom: 6 }}>
                      AI Extracted — Review & Confirm
                    </div>
                    {scanResult.merchant_name && <div style={{ fontSize: 13, color: 'var(--text1)' }}>
                      <span style={{ color: 'var(--text2)' }}>Merchant:</span> {scanResult.merchant_name}</div>}
                    {scanResult.amount && <div style={{ fontSize: 13, color: 'var(--text1)' }}>
                      <span style={{ color: 'var(--text2)' }}>Amount:</span> ${scanResult.amount}</div>}
                    {scanResult.date && <div style={{ fontSize: 13, color: 'var(--text1)' }}>
                      <span style={{ color: 'var(--text2)' }}>Date:</span> {scanResult.date}</div>}
                    {scanResult.category && <div style={{ fontSize: 13, color: 'var(--text1)' }}>
                      <span style={{ color: 'var(--text2)' }}>Category:</span> {scanResult.category}</div>}
                  </div>
                )}
                <button onClick={() => { setReceiptUrl(''); setScanResult(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  style={{ marginTop: 8, fontSize: 12, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Remove receipt
                </button>
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingReceipt} style={{
                width: '100%', padding: 24, borderRadius: 10, border: '2px dashed #2a2d3a',
                background: 'var(--surface2)', cursor: 'pointer', color: 'var(--text2)', display: 'flex',
                flexDirection: 'column', alignItems: 'center', gap: 8
              }}>
                {uploadingReceipt ? <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={28} />}
                <span style={{ fontWeight: 600 }}>{uploadingReceipt ? 'Uploading...' : 'Upload Receipt'}</span>
                <span style={{ fontSize: 12 }}>Required for amounts over $25</span>
              </button>
            )}

            {/* Category grid */}
            <div style={{ marginTop: 20 }}>
              <label style={labelStyle}>Category *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon
                  const selected = form.category === cat.value
                  return (
                    <button key={cat.value} type="button" onClick={() => setForm(p => ({ ...p, category: cat.value }))} style={{
                      padding: '8px 4px', borderRadius: 8, border: `1px solid ${selected ? 'var(--accent)' : '#2a2d3a'}`,
                      background: selected ? 'var(--accent)22' : 'var(--surface2)', cursor: 'pointer',
                      color: selected ? 'var(--accent)' : 'var(--text2)', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600
                    }}>
                      <Icon size={16} />
                      {cat.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Expense Form */}
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 24, border: '1px solid #2a2d3a' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Receipt size={18} color="var(--amber)" /> Expense Details
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Merchant / Vendor</label>
                <input value={form.merchant_name} onChange={e => setForm(p => ({ ...p, merchant_name: e.target.value }))}
                  placeholder="Auto-filled from receipt" style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>Amount *</label>
                  <div style={{ position: 'relative' }}>
                    <DollarSign size={14} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text2)' }} />
                    <input type="number" step="0.01" min="0.01" value={form.amount}
                      onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                      placeholder="0.00" style={{ ...inputStyle, paddingLeft: 28 }} required />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Date *</label>
                  <input type="date" value={form.expense_date} onChange={e => setForm(p => ({ ...p, expense_date: e.target.value }))}
                    style={inputStyle} required />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Description *</label>
                <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="What did you purchase?" style={inputStyle} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>Payment Method</label>
                  <select value={form.payment_method} onChange={e => setForm(p => ({ ...p, payment_method: e.target.value }))} style={inputStyle}>
                    <option value="personal_card">Personal Card</option>
                    <option value="cash">Cash</option>
                    <option value="company_card">Company Card</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Linked Job</label>
                  <select value={form.job_id} onChange={e => setForm(p => ({ ...p, job_id: e.target.value }))} style={inputStyle}>
                    <option value="">General Overhead</option>
                    {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                  </select>
                </div>
              </div>

              {!receiptUrl && parseFloat(form.amount) > 25 && (
                <div style={{ background: 'var(--amber)22', border: '1px solid var(--amber)', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 13, color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={14} /> Receipt required for expenses over $25
                </div>
              )}

              {saveError && (
                <div style={{ background: 'var(--red)22', border: '1px solid var(--red)', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 13, color: 'var(--red)' }}>
                  {saveError}
                </div>
              )}
              {saveSuccess && (
                <div style={{ background: 'var(--green)22', border: '1px solid var(--green)', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 13, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Check size={14} /> Expense submitted for approval!
                </div>
              )}

              <button type="submit" disabled={saving} style={{
                width: '100%', padding: '11px', borderRadius: 8, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                background: saving ? 'var(--surface2)' : 'var(--accent)', color: '#fff', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}>
                {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={16} />}
                {saving ? 'Submitting...' : 'Submit Expense'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ──────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: 140 }}>
              <option value="">All Status</option>
              {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: 140 }}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            {isAdmin && (
              <select value={filterUser} onChange={e => setFilterUser(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: 180 }}>
                <option value="">All Employees</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            )}
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} style={{ ...inputStyle, width: 'auto' }} />
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} style={{ ...inputStyle, width: 'auto' }} />
          </div>

          {/* Summary */}
          {!loading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Total Submitted', value: '$' + expenses.reduce((s, e) => s + e.amount, 0).toFixed(2) },
                { label: 'Pending', value: '$' + expenses.filter(e => e.status === 'pending').reduce((s, e) => s + e.amount, 0).toFixed(2), color: 'var(--amber)' },
                { label: 'Approved', value: '$' + expenses.filter(e => e.status === 'approved' || e.status === 'paid').reduce((s, e) => s + e.amount, 0).toFixed(2), color: 'var(--green)' },
                { label: 'Rejected', value: '$' + expenses.filter(e => e.status === 'rejected').reduce((s, e) => s + e.amount, 0).toFixed(2), color: 'var(--red)' },
              ].map(stat => (
                <div key={stat.label} style={{ background: 'var(--surface)', borderRadius: 10, padding: '14px 16px', border: '1px solid #2a2d3a' }}>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>{stat.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: stat.color || 'var(--text1)' }}>{stat.value}</div>
                </div>
              ))}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : expenses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>No expenses found</div>
          ) : (
            <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid #2a2d3a', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #2a2d3a' }}>
                    {['Date', 'Description', 'Category', 'Amount', 'Status', 'Receipt', ''].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(exp => (
                    <tr key={exp.id} style={{ borderBottom: '1px solid #1a1d27' }}>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text1)' }}>{exp.expense_date}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text1)', maxWidth: 200 }}>
                        <div style={{ fontWeight: 500 }}>{exp.merchant_name || exp.description}</div>
                        <div style={{ fontSize: 12, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.description}</div>
                        {isAdmin && exp.user && <div style={{ fontSize: 11, color: 'var(--accent)' }}>{exp.user.name}</div>}
                        {exp.rejection_reason && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 2 }}>Reason: {exp.rejection_reason}</div>}
                        {exp.manager_notes && <div style={{ fontSize: 11, color: 'var(--cyan)', marginTop: 2 }}>Note: {exp.manager_notes}</div>}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text2)' }}>
                          {catIcon(exp.category)}
                          {CATEGORIES.find(c => c.value === exp.category)?.label || exp.category}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: 'var(--green)' }}>
                        ${exp.amount.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 14px' }}>{pill(exp.status)}</td>
                      <td style={{ padding: '12px 14px' }}>
                        {exp.receipt_url ? (
                          <a href={exp.receipt_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Eye size={13} /> View
                          </a>
                        ) : <span style={{ color: 'var(--text3)', fontSize: 12 }}>None</span>}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {exp.ai_extracted && <span style={{ fontSize: 11, color: 'var(--cyan)', background: 'var(--cyan)22', padding: '2px 6px', borderRadius: 6 }}>AI</span>}
                        {exp.flagged && <AlertTriangle size={14} color="var(--amber)" aria-label={exp.flag_reason || 'Flagged'} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── PENDING APPROVAL (admin) ──────────────────────────────────────── */}
      {tab === 'pending' && isAdmin && (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>
          ) : expenses.filter(e => e.status === 'pending').length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>
              <Check size={36} color="var(--green)" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 16, fontWeight: 600 }}>All caught up!</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {expenses.filter(e => e.status === 'pending').map(exp => (
                <div key={exp.id} style={{ background: 'var(--surface)', borderRadius: 12, border: `1px solid ${exp.flagged ? 'var(--amber)' : '#2a2d3a'}`, overflow: 'hidden' }}>
                  <div style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text1)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                          {catIcon(exp.category)}
                          {exp.merchant_name || exp.description}
                          {exp.flagged && <span style={{ fontSize: 11, background: 'var(--amber)22', color: 'var(--amber)', padding: '2px 6px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 3 }}><AlertTriangle size={11} /> Flagged</span>}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                          {exp.user?.name} · {exp.expense_date} · {exp.description}
                        </div>
                        {exp.ai_extracted && <div style={{ fontSize: 11, color: 'var(--cyan)', marginTop: 2 }}>AI-extracted data</div>}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>
                          ${exp.amount.toFixed(2)}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text2)' }}>{exp.payment_method.replace(/_/g, ' ')}</div>
                        {exp.receipt_url && (
                          <a href={exp.receipt_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginTop: 4 }}>
                            <Eye size={12} /> View Receipt
                          </a>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={managerNote[exp.id] || ''} onChange={e => setManagerNote(p => ({ ...p, [exp.id]: e.target.value }))}
                        placeholder="Manager note (optional)" style={{ ...inputStyle, flex: 1 }} />
                      <input value={rejectReason[exp.id] || ''} onChange={e => setRejectReason(p => ({ ...p, [exp.id]: e.target.value }))}
                        placeholder="Rejection reason" style={{ ...inputStyle, flex: 1 }} />
                      <button onClick={() => handleAction(exp.id, 'request_info', { manager_notes: managerNote[exp.id] })} style={{
                        padding: '9px 14px', borderRadius: 8, border: '1px solid var(--cyan)', cursor: 'pointer',
                        background: 'transparent', color: 'var(--cyan)', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap'
                      }}>Request Info</button>
                      <button onClick={() => handleAction(exp.id, 'reject', { rejection_reason: rejectReason[exp.id], manager_notes: managerNote[exp.id] })}
                        disabled={actionLoading === exp.id + '_reject'} style={{
                          padding: '9px 16px', borderRadius: 8, border: '1px solid var(--red)', cursor: 'pointer',
                          background: 'transparent', color: 'var(--red)', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6
                        }}>
                        {actionLoading === exp.id + '_reject' ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <X size={14} />} Reject
                      </button>
                      <button onClick={() => handleAction(exp.id, 'approve', { manager_notes: managerNote[exp.id] })}
                        disabled={actionLoading === exp.id + '_approve'} style={{
                          padding: '9px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                          background: 'var(--green)', color: '#fff', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6
                        }}>
                        {actionLoading === exp.id + '_approve' ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />} Approve
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
