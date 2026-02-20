'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, DollarSign, X, Receipt } from 'lucide-react'

interface Expense {
  id: string
  category: string
  description: string
  amount: number
  billable: boolean
  receipt_url?: string
  created_at: string
}

const CATEGORIES = [
  { key: 'material',      label: 'Material' },
  { key: 'labor',         label: 'Labor' },
  { key: 'subcontractor', label: 'Subcontractor' },
  { key: 'equipment',     label: 'Equipment' },
  { key: 'travel',        label: 'Travel' },
  { key: 'misc',          label: 'Misc' },
]

const fM = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)

interface JobExpensesProps {
  projectId: string
  orgId: string
  currentUserId: string
}

export default function JobExpenses({ projectId, orgId, currentUserId }: JobExpensesProps) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ category: 'misc', description: '', amount: '', billable: true })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('job_expenses')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
      if (data) setExpenses(data as Expense[])
    }
    load()
  }, [projectId])

  const addExpense = async () => {
    if (!form.description.trim() || !form.amount) return
    setSaving(true)
    const { data, error } = await supabase.from('job_expenses').insert({
      org_id: orgId,
      project_id: projectId,
      created_by: currentUserId,
      category: form.category,
      description: form.description.trim(),
      amount: parseFloat(form.amount) || 0,
      billable: form.billable,
    }).select().single()

    if (!error && data) setExpenses(prev => [data as Expense, ...prev])
    setForm({ category: 'misc', description: '', amount: '', billable: true })
    setShowForm(false)
    setSaving(false)
  }

  const removeExpense = async (id: string) => {
    await supabase.from('job_expenses').delete().eq('id', id)
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const billableTotal = expenses.filter(e => e.billable).reduce((s, e) => s + e.amount, 0)

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 12,
    color: 'var(--text1)',
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 900, color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Receipt size={20} /> Customer Expenses
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
            Unexpected costs — billable items are added to the total sale
          </div>
        </div>
        <button
          onClick={() => setShowForm(f => !f)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, fontWeight: 700, fontSize: 12, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          <Plus size={14} /> Add Expense
        </button>
      </div>

      {/* Totals bar */}
      {expenses.length > 0 && (
        <div style={{ display: 'flex', gap: 24, padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Total Expenses</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 700, color: 'var(--text1)' }}>{fM(total)}</div>
          </div>
          <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 24 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Billable to Customer</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 700, color: 'var(--green)' }}>{fM(billableTotal)}</div>
          </div>
          <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 24 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Internal Only</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 700, color: 'var(--text2)' }}>{fM(total - billableTotal)}</div>
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text1)', marginBottom: 14 }}>New Expense</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Category</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={fieldStyle}>
                {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Amount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                placeholder="0.00"
                style={fieldStyle}
              />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Description</label>
            <input
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addExpense()}
              placeholder="e.g. Extra chrome vinyl, parking for install, tint removal..."
              style={fieldStyle}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text2)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.billable}
                onChange={e => setForm(p => ({ ...p, billable: e.target.checked }))}
              />
              Billable to customer (adds to total sale)
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowForm(false)}
                style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={addExpense}
                disabled={saving || !form.description.trim() || !form.amount}
                style={{
                  padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  background: 'var(--green)', color: '#0d1a10', border: 'none', cursor: 'pointer',
                  opacity: (saving || !form.description.trim() || !form.amount) ? 0.5 : 1,
                }}
              >
                {saving ? 'Adding...' : 'Add Expense'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense list */}
      {expenses.length === 0 && !showForm ? (
        <div style={{ textAlign: 'center', padding: 40, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text3)' }}>
          <DollarSign size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
          <div style={{ fontSize: 13, fontWeight: 700 }}>No expenses logged</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>Add unexpected costs: extra material, subcontractors, travel, etc.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {expenses.map(exp => (
            <div key={exp.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 14px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 4 }}>{exp.description}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{
                    fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4,
                    background: 'var(--surface2)', color: 'var(--text3)',
                    textTransform: 'uppercase', letterSpacing: '.04em',
                  }}>
                    {exp.category}
                  </span>
                  {exp.billable ? (
                    <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--green)' }}>Billable</span>
                  ) : (
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)' }}>Internal</span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 16, fontWeight: 700,
                  color: exp.billable ? 'var(--green)' : 'var(--text2)',
                }}>
                  {fM(exp.amount)}
                </div>
                <button
                  onClick={() => removeExpense(exp.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', opacity: 0.5, padding: 2 }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
