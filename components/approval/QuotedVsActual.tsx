'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Pencil } from 'lucide-react'

interface QuotedVsActualProps {
  projectId: string
  orgId: string
  project: any
}

const fM = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)

export default function QuotedVsActual({ projectId, orgId, project }: QuotedVsActualProps) {
  const [actuals, setActuals] = useState<any>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    actual_sale_price: '',
    actual_material_cost: '',
    actual_installer_pay: '',
    actual_hours: '',
    actual_design_fee: '',
    notes: '',
  })
  const supabase = createClient()

  const fin = (project.fin_data as any) || {}
  const quoted = {
    sale: project.revenue || fin.sale || 0,
    material: fin.material || fin.material_cost || 0,
    labor: fin.labor || fin.install_pay || fin.labor_cost || 0,
    hours: fin.hrs || fin.hrs_budget || 0,
    designFee: fin.designFee || fin.design_fee || 150,
    cogs: fin.cogs || 0,
    profit: project.profit || fin.profit || 0,
    gpm: project.gpm || fin.gpm || 0,
  }

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('material_tracking')
        .select('*')
        .eq('project_id', projectId)
        .single()

      if (data) {
        setActuals(data)
        setForm({
          actual_sale_price: data.actual_sale_price?.toString() || '',
          actual_material_cost: data.actual_material_cost?.toString() || '',
          actual_installer_pay: data.actual_installer_pay?.toString() || '',
          actual_hours: data.actual_hours?.toString() || '',
          actual_design_fee: data.actual_design_fee?.toString() || '',
          notes: data.notes || '',
        })
      }
    }
    load()
  }, [projectId])

  const saveActuals = async () => {
    const data = {
      org_id: orgId,
      project_id: projectId,
      actual_sale_price: parseFloat(form.actual_sale_price) || null,
      actual_material_cost: parseFloat(form.actual_material_cost) || null,
      actual_installer_pay: parseFloat(form.actual_installer_pay) || null,
      actual_hours: parseFloat(form.actual_hours) || null,
      actual_design_fee: parseFloat(form.actual_design_fee) || null,
      notes: form.notes || null,
      updated_at: new Date().toISOString(),
    }

    await supabase.from('material_tracking').upsert(data, { onConflict: 'project_id' })
    setActuals(data)
    setEditing(false)
  }

  const actual = {
    sale: parseFloat(form.actual_sale_price) || quoted.sale,
    material: parseFloat(form.actual_material_cost) || 0,
    labor: parseFloat(form.actual_installer_pay) || 0,
    hours: parseFloat(form.actual_hours) || 0,
    designFee: parseFloat(form.actual_design_fee) || quoted.designFee,
    get cogs() { return this.material + this.labor + this.designFee },
    get profit() { return this.sale - this.cogs },
    get gpm() { return this.sale > 0 ? (this.profit / this.sale) * 100 : 0 },
  }

  const variance = (q: number, a: number) => {
    if (q === 0 && a === 0) return { val: 0, display: '—', color: 'var(--text3)' }
    const diff = a - q
    const color = diff > 0 ? 'var(--green)' : diff < 0 ? '#ef4444' : 'var(--text3)'
    const sign = diff > 0 ? '+' : ''
    return { val: diff, display: diff === 0 ? '—' : `${sign}${fM(diff)}`, color }
  }

  const rows = [
    { label: 'Sale Price', quoted: quoted.sale, actual: actual.sale, field: 'actual_sale_price' },
    { label: 'Material Cost', quoted: quoted.material, actual: actual.material, field: 'actual_material_cost', invertColor: true },
    { label: 'Installer Pay', quoted: quoted.labor, actual: actual.labor, field: 'actual_installer_pay', invertColor: true },
    { label: 'Installer Hours', quoted: quoted.hours, actual: actual.hours, field: 'actual_hours', isHours: true, invertColor: true },
    { label: 'Design Fees', quoted: quoted.designFee, actual: actual.designFee, field: 'actual_design_fee', invertColor: true },
    { label: 'COGS', quoted: quoted.cogs, actual: actual.cogs, computed: true, invertColor: true },
    { label: 'Profit', quoted: quoted.profit, actual: actual.profit, computed: true },
    { label: 'GPM %', quoted: quoted.gpm, actual: actual.gpm, computed: true, isPct: true },
  ]

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
          Quoted vs Actual Comparison
        </div>
        <button onClick={() => setEditing(!editing)} style={{
          padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
          background: editing ? 'var(--accent)' : 'var(--surface2)',
          border: `1px solid ${editing ? 'var(--accent)' : 'var(--border)'}`,
          color: editing ? '#fff' : 'var(--text2)',
        }}>
          <Pencil size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          {editing ? 'Editing' : 'Edit Actuals'}
        </button>
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 9, fontWeight: 900, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Metric</th>
            <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 9, fontWeight: 900, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Quoted</th>
            <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 9, fontWeight: 900, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Actual</th>
            <th style={{ padding: '10px 20px', textAlign: 'right', fontSize: 9, fontWeight: 900, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Variance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const v = row.isPct
              ? { val: actual.gpm - quoted.gpm, display: actual.gpm - quoted.gpm === 0 ? '—' : `${actual.gpm > quoted.gpm ? '+' : ''}${(actual.gpm - quoted.gpm).toFixed(0)}%`, color: actual.gpm >= quoted.gpm ? 'var(--green)' : '#ef4444' }
              : row.isHours
              ? { val: actual.hours - quoted.hours, display: actual.hours - quoted.hours === 0 ? '—' : `${actual.hours > quoted.hours ? '+' : ''}${(actual.hours - quoted.hours).toFixed(1)}h`, color: actual.hours <= quoted.hours ? 'var(--green)' : '#ef4444' }
              : variance(row.quoted, row.actual)

            // Invert color for costs (lower is better)
            if (row.invertColor && v.val !== 0) {
              v.color = v.val < 0 ? 'var(--green)' : '#ef4444'
            }

            return (
              <tr key={row.label} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 20px', fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>
                  {row.label}
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--text2)' }}>
                  {row.isPct ? `${quoted.gpm.toFixed(0)}%` : row.isHours ? `${quoted.hours}h` : fM(row.quoted)}
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                  {editing && row.field && !row.computed ? (
                    <input
                      type="number"
                      value={form[row.field as keyof typeof form]}
                      onChange={e => setForm(p => ({ ...p, [row.field!]: e.target.value }))}
                      style={{
                        width: 100, background: 'var(--surface2)', border: '1px solid var(--accent)',
                        borderRadius: 6, padding: '4px 8px', fontSize: 13, color: 'var(--text1)',
                        textAlign: 'right', outline: 'none', fontFamily: 'JetBrains Mono, monospace',
                      }}
                    />
                  ) : (
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
                      {row.isPct ? `${actual.gpm.toFixed(0)}%` : row.isHours ? `${actual.hours}h` : fM(row.actual)}
                    </span>
                  )}
                </td>
                <td style={{ padding: '10px 20px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: v.color }}>
                  {v.display}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Actual Profit Summary */}
      <div style={{ padding: '16px 20px', display: 'flex', gap: 20, flexWrap: 'wrap', borderTop: '1px solid var(--border)', background: 'rgba(34,197,94,0.03)' }}>
        {[
          { label: 'Actual Profit', value: fM(actual.profit), color: actual.profit >= 0 ? 'var(--green)' : '#ef4444' },
          { label: 'Actual GPM', value: `${actual.gpm.toFixed(0)}%`, color: actual.gpm >= 70 ? 'var(--green)' : actual.gpm >= 55 ? '#f59e0b' : '#ef4444' },
          { label: 'Actual Hrs', value: `${actual.hours}h`, color: 'var(--text1)' },
          { label: 'Install $/hr', value: actual.hours > 0 ? fM(actual.labor / actual.hours) : '—', color: 'var(--cyan)' },
        ].map(stat => (
          <div key={stat.label}>
            <div style={{ fontSize: 9, fontWeight: 900, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 2 }}>{stat.label}</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Save button */}
      {editing && (
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={() => setEditing(false)} style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)',
          }}>Cancel</button>
          <button onClick={saveActuals} style={{
            padding: '8px 20px', borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer',
            background: 'var(--green)', border: 'none', color: '#0d1a10',
          }}>Save Actuals</button>
        </div>
      )}
    </div>
  )
}
