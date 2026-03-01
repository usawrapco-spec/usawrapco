'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Save, Trash2, Plus, ChevronDown, ChevronUp,
  Copy, AlertTriangle, FileText,
} from 'lucide-react'
import Link from 'next/link'
import type { Profile } from '@/types'
import { isAdminRole } from '@/types'
import { hasPermission } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/client'

// ─── Constants ────────────────────────────────────────────────────────────────
const LABOR_RATE      = 30
const DESIGN_FEE_DEF  = 150
const headingFont     = 'Barlow Condensed, sans-serif'
const monoFont        = 'JetBrains Mono, monospace'

const COMMISSION_RATES: Record<string, { base: number; max: number; bonuses: boolean }> = {
  inbound:  { base: 0.045, max: 0.075, bonuses: true },
  outbound: { base: 0.07,  max: 0.10,  bonuses: true },
  presold:  { base: 0.05,  max: 0.05,  bonuses: false },
}

const CATEGORIES = [
  'custom', 'full_wrap', 'partial_wrap', 'chrome_delete',
  'ppf', 'tint', 'interior', 'commercial', 'fleet', 'marine',
]

const categoryLabel = (c: string) =>
  c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

// ─── Types ────────────────────────────────────────────────────────────────────
interface TemplateItem {
  id: string
  name: string
  description?: string
  product_type: string
  quantity: number
  unit_price: number
  total_price: number
  specs: {
    materialCost?: number
    estimatedHours?: number
    designFee?: number
    machineCost?: number
  }
  sort_order: number
}

interface EstimateTemplate {
  id: string
  org_id: string
  name: string
  description?: string
  category?: string
  line_items: TemplateItem[]
  form_data?: Record<string, unknown>
  use_count?: number
  created_at?: string
}

interface Props {
  profile: Profile
  template: EstimateTemplate | null
  isNew: boolean
}

// ─── COGS helper ─────────────────────────────────────────────────────────────
function calcItemCOGS(item: TemplateItem) {
  const s = item.specs
  const material = (s.materialCost  || 0)
  const labor    = (s.estimatedHours || 0) * LABOR_RATE
  const design   = s.designFee !== undefined ? s.designFee : DESIGN_FEE_DEF
  const misc     = (s.machineCost   || 0)
  return { material, labor, design, misc }
}

// ─── Card style ───────────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: 'var(--card-bg, var(--surface))',
  border: '1px solid var(--card-border, var(--border))',
  borderRadius: 16,
  overflow: 'hidden',
}

const fieldLabel: React.CSSProperties = {
  display: 'block', fontSize: 10, fontWeight: 700,
  color: 'var(--text3)', textTransform: 'uppercase',
  letterSpacing: '0.06em', marginBottom: 4, fontFamily: headingFont,
}

const fieldInput: React.CSSProperties = {
  width: '100%', padding: '7px 10px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg)',
  color: 'var(--text1)', fontSize: 13, outline: 'none',
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EstimateTemplateDetailClient({ profile, template, isNew }: Props) {
  const router  = useRouter()
  const canWrite = isAdminRole(profile.role) || hasPermission(profile.role, 'sales.write')

  // ─── State ─────────────────────────────────────────────────────────────────
  const [name, setName]           = useState(template?.name || 'New Template')
  const [category, setCategory]   = useState(template?.category || 'custom')
  const [description, setDescription] = useState(template?.description || '')
  const [taxRate, setTaxRate]     = useState<number>((template?.form_data?.taxRate as number) ?? 0.0825)
  const [leadType, setLeadType]   = useState<string>((template?.form_data?.leadType as string) || 'inbound')
  const [torqBonus, setTorqBonus] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [creating, setCreating]   = useState(false)
  const [toast, setToast]         = useState<string | null>(null)

  const [items, setItems] = useState<TemplateItem[]>(
    (template?.line_items || []).map((li: any, i: number) => ({
      id: li.id || `tli-${i}-${Date.now()}`,
      name: li.name || '',
      description: li.description,
      product_type: li.product_type || 'wrap',
      quantity: li.quantity ?? 1,
      unit_price: li.unit_price ?? 0,
      total_price: li.total_price ?? 0,
      specs: li.specs || {},
      sort_order: li.sort_order ?? i,
    }))
  )

  // ─── Calculations ───────────────────────────────────────────────────────────
  const subtotal  = useMemo(() => items.reduce((s, li) => s + li.total_price, 0), [items])
  const taxAmount = useMemo(() => subtotal * taxRate, [subtotal, taxRate])
  const total     = useMemo(() => subtotal + taxAmount, [subtotal, taxAmount])

  const cogsBreakdown = useMemo(() => items.reduce((acc, li) => {
    const c = calcItemCOGS(li)
    acc.material += c.material
    acc.labor    += c.labor
    acc.design   += c.design
    acc.misc     += c.misc
    return acc
  }, { material: 0, labor: 0, design: 0, misc: 0 }), [items])

  const totalCOGS   = useMemo(() => cogsBreakdown.material + cogsBreakdown.labor + cogsBreakdown.design + cogsBreakdown.misc, [cogsBreakdown])
  const totalGP     = useMemo(() => subtotal - totalCOGS, [subtotal, totalCOGS])
  const overallGPM  = useMemo(() => subtotal > 0 ? (totalGP / subtotal) * 100 : 0, [totalGP, subtotal])

  const commRate = useMemo(() => {
    const rates = COMMISSION_RATES[leadType] || COMMISSION_RATES.inbound
    if (!rates.bonuses || overallGPM < 65) return rates.base
    let rate = rates.base
    if (overallGPM >= 73) rate += 0.02
    if (torqBonus) rate += 0.01
    return Math.min(rate, rates.max)
  }, [leadType, overallGPM, torqBonus])

  const estCommission = useMemo(() => Math.max(0, totalGP * commRate), [totalGP, commRate])

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)

  function showToastMsg(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // ─── Item management ────────────────────────────────────────────────────────
  function addItem() {
    const newItem: TemplateItem = {
      id: `tli-${Date.now()}`,
      name: '', product_type: 'wrap',
      quantity: 1, unit_price: 0, total_price: 0,
      specs: { materialCost: 0, estimatedHours: 0, designFee: DESIGN_FEE_DEF, machineCost: 0 },
      sort_order: items.length,
    }
    setItems(prev => [...prev, newItem])
  }

  function updateItem(id: string, updates: Partial<TemplateItem>) {
    setItems(prev => prev.map(li => {
      if (li.id !== id) return li
      const updated = { ...li, ...updates }
      updated.total_price = updated.quantity * updated.unit_price
      return updated
    }))
  }

  function updateSpec(id: string, key: string, value: number) {
    setItems(prev => prev.map(li =>
      li.id !== id ? li : { ...li, specs: { ...li.specs, [key]: value } }
    ))
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(li => li.id !== id))
  }

  // ─── Save ───────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!canWrite || saving) return
    setSaving(true)
    const supabase = createClient()
    const payload = {
      name: name.trim() || 'Untitled Template',
      category,
      description: description.trim() || null,
      line_items: items.map(({ id: _id, ...rest }) => rest),
      form_data: { leadType, taxRate },
      updated_at: new Date().toISOString(),
    }
    try {
      if (isNew) {
        const { data, error } = await supabase
          .from('estimate_templates')
          .insert({ ...payload, org_id: profile.org_id, created_by: profile.id, use_count: 0 })
          .select('id').single()
        if (error) throw error
        showToastMsg('Template created')
        router.push(`/estimates/templates/${data.id}`)
      } else {
        const { error } = await supabase
          .from('estimate_templates').update(payload).eq('id', template!.id)
        if (error) throw error
        showToastMsg('Template saved')
      }
    } catch (err) {
      console.error('Save template error:', err)
      showToastMsg('Error saving template')
    }
    setSaving(false)
  }

  // ─── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!confirm('Delete this template? This cannot be undone.')) return
    const supabase = createClient()
    await supabase.from('estimate_templates').delete().eq('id', template!.id)
    router.push('/estimates/templates')
  }

  // ─── Use template → create estimate ─────────────────────────────────────────
  async function handleUseTemplate() {
    if (isNew || creating) return
    setCreating(true)
    const supabase = createClient()
    try {
      const { data: est, error } = await supabase
        .from('estimates')
        .insert({
          org_id: profile.org_id,
          title: name,
          status: 'draft',
          sales_rep_id: profile.id,
          tax_rate: taxRate,
          discount: 0,
          form_data: { leadType, taxRate, fromTemplate: template!.id },
        }).select('id').single()
      if (error) throw error

      if (items.length > 0) {
        await supabase.from('line_items').insert(
          items.map(li => ({
            org_id: profile.org_id,
            parent_type: 'estimate',
            parent_id: est.id,
            product_type: li.product_type,
            name: li.name,
            description: li.description || null,
            quantity: li.quantity,
            unit_price: li.unit_price,
            unit_discount: 0,
            total_price: li.total_price,
            specs: li.specs,
            sort_order: li.sort_order,
          }))
        )
      }

      await supabase
        .from('estimate_templates')
        .update({ use_count: (template!.use_count || 0) + 1 })
        .eq('id', template!.id)

      router.push(`/estimates/${est.id}`)
    } catch (err) {
      console.error('Use template error:', err)
      showToastMsg('Error creating estimate')
      setCreating(false)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <Link href="/estimates/templates" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, borderRadius: 8,
          background: 'var(--surface)', border: '1px solid var(--border)',
          color: 'var(--text2)', textDecoration: 'none', flexShrink: 0,
        }}>
          <ArrowLeft size={16} />
        </Link>

        <input
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={!canWrite}
          style={{
            flex: 1, minWidth: 200, padding: '6px 12px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--bg)',
            color: 'var(--text1)', fontSize: 18, fontWeight: 800,
            fontFamily: headingFont, letterSpacing: '0.02em', outline: 'none',
          }}
          placeholder="Template name"
        />

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {!isNew && canWrite && (
            <button
              onClick={handleDelete}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--red)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              }}
            >
              <Trash2 size={13} /> Delete
            </button>
          )}
          {!isNew && (
            <button
              onClick={handleUseTemplate}
              disabled={creating || items.length === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8,
                border: 'none', background: 'var(--accent)',
                color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.04em',
                opacity: (creating || items.length === 0) ? 0.6 : 1,
              }}
            >
              <Copy size={13} /> {creating ? 'Creating...' : 'Use Template'}
            </button>
          )}
          {canWrite && (
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8,
                border: 'none', background: 'var(--green)',
                color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.04em',
                opacity: saving ? 0.6 : 1,
              }}
            >
              <Save size={13} /> {saving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_340px]" style={{ gap: 20, alignItems: 'flex-start' }}>

        {/* Left: template info + line items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Info card */}
          <div style={{ ...cardStyle, padding: '16px 20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={fieldLabel}>Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  disabled={!canWrite}
                  style={{ ...fieldInput }}
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{categoryLabel(c)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={fieldLabel}>Default Tax Rate (%)</label>
                <input
                  type="number"
                  value={(taxRate * 100).toFixed(2)}
                  onChange={e => setTaxRate(Number(e.target.value) / 100)}
                  disabled={!canWrite}
                  min={0} max={20} step={0.01}
                  style={{ ...fieldInput, fontFamily: monoFont }}
                />
              </div>
            </div>
            <div>
              <label style={fieldLabel}>Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                disabled={!canWrite}
                placeholder="Brief description of this template..."
                rows={2}
                style={{ ...fieldInput, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
          </div>

          {/* Line item header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: headingFont }}>
              Line Items ({items.length})
            </div>
            {canWrite && (
              <button
                onClick={addItem}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 8,
                  border: '1px solid var(--accent)', background: 'rgba(79,127,255,0.08)',
                  color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                }}
              >
                <Plus size={12} /> Add Line Item
              </button>
            )}
          </div>

          {/* Items */}
          {items.length === 0 ? (
            <div style={{ ...cardStyle, padding: 40, textAlign: 'center' }}>
              <FileText size={28} style={{ color: 'var(--text3)', margin: '0 auto 10px', display: 'block' }} />
              <div style={{ fontSize: 14, color: 'var(--text3)' }}>No line items yet</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Click &quot;Add Line Item&quot; to start building this template.</div>
            </div>
          ) : (
            items.map((item, idx) => (
              <TemplateItemCard
                key={item.id}
                item={item}
                index={idx}
                canWrite={canWrite}
                onUpdate={updates => updateItem(item.id, updates)}
                onUpdateSpec={(key, val) => updateSpec(item.id, key, val)}
                onRemove={() => removeItem(item.id)}
                fmtCurrency={fmtCurrency}
              />
            ))
          )}
        </div>

        {/* Right: Unified Financial Panel */}
        <div style={{ ...cardStyle, position: 'sticky', top: 16 }}>

          {/* ── REVENUE ─────────────────────────────── */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: headingFont, marginBottom: 8 }}>Revenue</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>Sale Price</span>
              <span style={{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums', fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>{fmtCurrency(subtotal)}</span>
            </div>
          </div>

          {/* ── COSTS ───────────────────────────────── */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: headingFont, marginBottom: 8 }}>Costs</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {cogsBreakdown.material > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>Material</span>
                  <span style={{ fontFamily: monoFont, fontSize: 12, color: 'var(--text2)' }}>{fmtCurrency(cogsBreakdown.material)}</span>
                </div>
              )}
              {cogsBreakdown.labor > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>Install Labor</span>
                  <span style={{ fontFamily: monoFont, fontSize: 12, color: 'var(--text2)' }}>{fmtCurrency(cogsBreakdown.labor)}</span>
                </div>
              )}
              {cogsBreakdown.design > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>Design Fees</span>
                  <span style={{ fontFamily: monoFont, fontSize: 12, color: 'var(--text2)' }}>{fmtCurrency(cogsBreakdown.design)}</span>
                </div>
              )}
              {cogsBreakdown.misc > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>Production Bonus</span>
                  <span style={{ fontFamily: monoFont, fontSize: 12, color: 'var(--text2)' }}>{fmtCurrency(cogsBreakdown.misc)}</span>
                </div>
              )}
              <div style={{ height: 1, background: 'var(--border)', margin: '3px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>Total COGS</span>
                <span style={{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums', fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{fmtCurrency(totalCOGS)}</span>
              </div>
            </div>
          </div>

          {/* ── PROFIT ──────────────────────────────── */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: headingFont, marginBottom: 8 }}>Profit</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>Gross Profit</span>
                <span style={{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums', fontSize: 14, fontWeight: 700, color: totalGP >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtCurrency(totalGP)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>GPM</span>
                <span style={{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums', fontSize: 22, fontWeight: 900, color: overallGPM >= 73 ? 'var(--green)' : overallGPM >= 65 ? 'var(--amber)' : 'var(--red)' }}>{overallGPM.toFixed(1)}%</span>
              </div>
              {overallGPM < 65 && subtotal > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 6, background: 'rgba(242,90,90,0.1)', border: '1px solid rgba(242,90,90,0.25)' }}>
                  <AlertTriangle size={12} style={{ color: 'var(--red)', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600 }}>Low Margin — below 65%</span>
                </div>
              )}
            </div>
          </div>

          {/* ── COMMISSION PREVIEW ──────────────────── */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: headingFont, marginBottom: 8 }}>Commission Preview</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, fontFamily: headingFont }}>Lead Type</div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
              {(['inbound', 'outbound', 'presold'] as const).map(lt => (
                <button key={lt} onClick={() => setLeadType(lt)} style={{ flex: 1, padding: '5px 2px', borderRadius: 6, fontSize: 9, fontWeight: 700, cursor: 'pointer', fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.04em', border: leadType === lt ? '2px solid var(--accent)' : '1px solid var(--border)', background: leadType === lt ? 'rgba(79,127,255,0.12)' : 'var(--bg)', color: leadType === lt ? 'var(--accent)' : 'var(--text3)' }}>
                  {lt === 'presold' ? 'Pre-Sold' : lt === 'inbound' ? 'In' : 'Out'}
                </button>
              ))}
            </div>
            {(COMMISSION_RATES[leadType] || COMMISSION_RATES.inbound).bonuses && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: torqBonus ? 'var(--text1)' : 'var(--text2)', marginBottom: 8 }}>
                <input type="checkbox" checked={torqBonus} onChange={() => setTorqBonus(!torqBonus)} />
                Torq Training Bonus (+1%)
              </label>
            )}
            <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 10px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>Commission Rate</span>
                <span style={{ fontFamily: monoFont, fontSize: 12, color: 'var(--text1)' }}>{(commRate * 100).toFixed(1)}%</span>
              </div>
              {overallGPM < 65 && subtotal > 0 && (
                <div style={{ fontSize: 10, color: 'var(--amber)', fontStyle: 'italic' }}>Low margin — base rate only</div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>Est. Commission</span>
                <span style={{ fontFamily: monoFont, fontSize: 14, fontWeight: 800, color: 'var(--green)' }}>{fmtCurrency(estCommission)}</span>
              </div>
            </div>
          </div>

          {/* ── TOTALS ──────────────────────────────── */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>Subtotal</span>
                <span style={{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums', fontSize: 14, color: 'var(--text1)', fontWeight: 600 }}>{fmtCurrency(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>Tax ({(taxRate * 100).toFixed(2)}%)</span>
                <span style={{ fontFamily: monoFont, fontVariantNumeric: 'tabular-nums', fontSize: 14, color: 'var(--text1)', fontWeight: 600 }}>{fmtCurrency(taxAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text1)' }}>Total</span>
                <span style={{ fontFamily: monoFont, fontSize: 16, fontWeight: 800, color: 'var(--text1)' }}>{fmtCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* ── ACTION BUTTONS ───────────────────────── */}
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {!isNew && (
              <button
                onClick={handleUseTemplate}
                disabled={creating || items.length === 0}
                style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: 'var(--green)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontFamily: headingFont, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.04em', opacity: (creating || items.length === 0) ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Copy size={14} /> {creating ? 'Creating...' : 'Use Template'}
              </button>
            )}
            {canWrite && (
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', cursor: 'pointer', fontWeight: 700, fontFamily: headingFont, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.04em', opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text1)', padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}

// ─── Template Item Card ───────────────────────────────────────────────────────
function TemplateItemCard({
  item, index, canWrite, onUpdate, onUpdateSpec, onRemove, fmtCurrency,
}: {
  item: TemplateItem
  index: number
  canWrite: boolean
  onUpdate: (u: Partial<TemplateItem>) => void
  onUpdateSpec: (key: string, val: number) => void
  onRemove: () => void
  fmtCurrency: (n: number) => string
}) {
  const [expanded, setExpanded] = useState(index === 0)

  const laborCost = (item.specs.estimatedHours || 0) * LABOR_RATE
  const designCost = item.specs.designFee !== undefined ? item.specs.designFee : DESIGN_FEE_DEF

  return (
    <div style={{ background: 'var(--card-bg, var(--surface))', border: '1px solid var(--card-border, var(--border))', borderRadius: 12, overflow: 'hidden' }}>

      {/* Summary row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', fontFamily: headingFont, width: 20, flexShrink: 0 }}>
          {index + 1}
        </div>
        <input
          value={item.name}
          onChange={e => onUpdate({ name: e.target.value })}
          disabled={!canWrite}
          placeholder="Item name..."
          style={{ flex: 1, minWidth: 120, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text1)', fontSize: 13, fontWeight: 600, outline: 'none' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>Qty</span>
          <input
            type="number"
            value={item.quantity}
            onChange={e => onUpdate({ quantity: Math.max(1, Number(e.target.value)) })}
            disabled={!canWrite}
            min={1} step={1}
            style={{ width: 52, padding: '5px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text1)', fontSize: 12, fontFamily: headingFont, textAlign: 'center', outline: 'none' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>$</span>
          <input
            type="number"
            value={item.unit_price || ''}
            onChange={e => onUpdate({ unit_price: Number(e.target.value) })}
            disabled={!canWrite}
            min={0} step={0.01}
            placeholder="0.00"
            style={{ width: 90, padding: '5px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text1)', fontSize: 12, fontFamily: headingFont, outline: 'none' }}
          />
        </div>
        <span style={{ fontFamily: headingFont, fontSize: 14, fontWeight: 800, color: 'var(--text1)', minWidth: 72, textAlign: 'right' }}>
          {fmtCurrency(item.total_price)}
        </span>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2, flexShrink: 0 }}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {canWrite && (
          <button
            onClick={onRemove}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2, flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Expanded: cost inputs */}
      {expanded && (
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.15)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, fontFamily: headingFont }}>
            Cost Details (for GPM calculation)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            <div>
              <label style={{ ...fieldLabel, marginBottom: 3 }}>Material Cost ($)</label>
              <input
                type="number"
                value={item.specs.materialCost ?? ''}
                onChange={e => onUpdateSpec('materialCost', Number(e.target.value))}
                disabled={!canWrite}
                min={0} step={0.01} placeholder="0.00"
                style={{ ...fieldInput, fontFamily: headingFont }}
              />
            </div>
            <div>
              <label style={{ ...fieldLabel, marginBottom: 3 }}>Est. Hours → Labor ({`$${fmtCurrency(laborCost).replace('$', '')}`})</label>
              <input
                type="number"
                value={item.specs.estimatedHours ?? ''}
                onChange={e => onUpdateSpec('estimatedHours', Number(e.target.value))}
                disabled={!canWrite}
                min={0} step={0.5} placeholder="0"
                style={{ ...fieldInput, fontFamily: headingFont }}
              />
            </div>
            <div>
              <label style={{ ...fieldLabel, marginBottom: 3 }}>Design Fee ($)</label>
              <input
                type="number"
                value={designCost}
                onChange={e => onUpdateSpec('designFee', Number(e.target.value))}
                disabled={!canWrite}
                min={0} step={5}
                style={{ ...fieldInput, fontFamily: headingFont }}
              />
            </div>
            <div>
              <label style={{ ...fieldLabel, marginBottom: 3 }}>Production Bonus ($)</label>
              <input
                type="number"
                value={item.specs.machineCost ?? ''}
                onChange={e => onUpdateSpec('machineCost', Number(e.target.value))}
                disabled={!canWrite}
                min={0} step={5} placeholder="0"
                style={{ ...fieldInput, fontFamily: headingFont }}
              />
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text3)', fontFamily: headingFont }}>
            Item COGS: {fmtCurrency((item.specs.materialCost || 0) + laborCost + designCost + (item.specs.machineCost || 0))}
            &nbsp;·&nbsp;
            Item GP: {fmtCurrency(item.total_price - (item.specs.materialCost || 0) - laborCost - designCost - (item.specs.machineCost || 0))}
          </div>
        </div>
      )}
    </div>
  )
}
