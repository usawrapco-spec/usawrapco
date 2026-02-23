'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  Plus, Trash2, Save, Layers, Search,
  ChevronRight, ToggleLeft, ToggleRight, Settings,
} from 'lucide-react'

const headingFont = 'Barlow Condensed, sans-serif'
const monoFont = 'JetBrains Mono, monospace'

interface Material {
  id: string
  org_id: string
  name: string
  category: string
  cost_per_sqft: number
  supplier: string | null
  sku: string | null
  description: string | null
  active: boolean
  sort_order: number
  specs: Record<string, unknown>
}

interface Props {
  profile: Profile
}

const MATERIAL_CATEGORIES = [
  { value: 'wrap', label: 'Wrap' },
  { value: 'ppf', label: 'PPF' },
  { value: 'decking', label: 'Decking' },
  { value: 'other', label: 'Other' },
]

const DEFAULT_MATERIALS: Omit<Material, 'id' | 'org_id' | 'specs'>[] = [
  // Wrap
  { name: 'Avery MPI 1105 EZ RS', category: 'wrap', cost_per_sqft: 2.10, supplier: null, sku: null, description: null, active: true, sort_order: 1 },
  { name: 'Avery MPI 1005 EZ RS', category: 'wrap', cost_per_sqft: 1.85, supplier: null, sku: null, description: null, active: true, sort_order: 2 },
  { name: '3M 2080 Series', category: 'wrap', cost_per_sqft: 2.50, supplier: null, sku: null, description: null, active: true, sort_order: 3 },
  { name: '3M IJ180', category: 'wrap', cost_per_sqft: 2.30, supplier: null, sku: null, description: null, active: true, sort_order: 4 },
  { name: 'Avery Supreme Wrapping Film', category: 'wrap', cost_per_sqft: 2.75, supplier: null, sku: null, description: null, active: true, sort_order: 5 },
  { name: 'Arlon SLX', category: 'wrap', cost_per_sqft: 2.20, supplier: null, sku: null, description: null, active: true, sort_order: 6 },
  { name: 'Hexis Skintac', category: 'wrap', cost_per_sqft: 2.00, supplier: null, sku: null, description: null, active: true, sort_order: 7 },
  // PPF
  { name: 'XPEL Ultimate Plus', category: 'ppf', cost_per_sqft: 8.00, supplier: null, sku: null, description: null, active: true, sort_order: 8 },
  { name: 'XPEL Stealth', category: 'ppf', cost_per_sqft: 9.00, supplier: null, sku: null, description: null, active: true, sort_order: 9 },
  { name: '3M Pro Series', category: 'ppf', cost_per_sqft: 7.50, supplier: null, sku: null, description: null, active: true, sort_order: 10 },
  { name: 'SunTek Ultra', category: 'ppf', cost_per_sqft: 7.00, supplier: null, sku: null, description: null, active: true, sort_order: 11 },
  // Decking
  { name: 'SeaDek 6mm Standard', category: 'decking', cost_per_sqft: 8.50, supplier: null, sku: null, description: null, active: true, sort_order: 12 },
  { name: 'SeaDek 10mm Premium', category: 'decking', cost_per_sqft: 11.00, supplier: null, sku: null, description: null, active: true, sort_order: 13 },
  { name: 'Hydro-Turf', category: 'decking', cost_per_sqft: 7.50, supplier: null, sku: null, description: null, active: true, sort_order: 14 },
  { name: 'MarineMat', category: 'decking', cost_per_sqft: 9.00, supplier: null, sku: null, description: null, active: true, sort_order: 15 },
  { name: 'Custom/Generic Non-Slip', category: 'decking', cost_per_sqft: 6.00, supplier: null, sku: null, description: null, active: true, sort_order: 16 },
]

type TabKey = 'wrap_ppf' | 'decking'

export default function MaterialsCatalog({ profile }: Props) {
  const supabase = createClient()
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<TabKey>('wrap_ppf')

  useEffect(() => {
    loadMaterials()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadMaterials() {
    const { data } = await supabase
      .from('materials')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('sort_order', { ascending: true })
    if (data && data.length > 0) {
      setMaterials(data)
    }
    setLoading(false)
  }

  async function seedDefaults() {
    setSaving(true)
    const inserts = DEFAULT_MATERIALS.map(m => ({
      org_id: profile.org_id,
      name: m.name,
      category: m.category,
      cost_per_sqft: m.cost_per_sqft,
      supplier: m.supplier,
      sku: m.sku,
      description: m.description,
      active: true,
      sort_order: m.sort_order,
      specs: {},
    }))
    const { data, error } = await supabase.from('materials').insert(inserts).select()
    if (data) {
      setMaterials(data)
      showToast(`${data.length} materials created`)
    } else if (error) {
      showToast('Error: ' + error.message)
    }
    setSaving(false)
  }

  async function addMaterial() {
    const defaultCategory = activeTab === 'decking' ? 'decking' : 'wrap'
    const newMaterial = {
      org_id: profile.org_id,
      name: 'New Material',
      category: defaultCategory,
      cost_per_sqft: 0,
      supplier: null,
      sku: null,
      description: null,
      active: true,
      sort_order: materials.length + 1,
      specs: {},
    }
    const { data, error } = await supabase.from('materials').insert(newMaterial).select().single()
    if (data) {
      setMaterials(prev => [...prev, data])
      setEditingId(data.id)
      showToast('Material added')
    } else if (error) {
      showToast('Error: ' + error.message)
    }
  }

  async function saveMaterial(material: Material) {
    setSaving(true)
    const { error } = await supabase.from('materials').update({
      name: material.name,
      category: material.category,
      cost_per_sqft: material.cost_per_sqft,
      supplier: material.supplier,
      sku: material.sku,
      description: material.description,
      active: material.active,
      sort_order: material.sort_order,
      updated_at: new Date().toISOString(),
    }).eq('id', material.id)
    if (!error) showToast('Saved')
    else showToast('Error: ' + error.message)
    setSaving(false)
  }

  async function deleteMaterial(id: string) {
    if (!confirm('Delete this material?')) return
    await supabase.from('materials').delete().eq('id', id)
    setMaterials(prev => prev.filter(m => m.id !== id))
    if (editingId === id) setEditingId(null)
    showToast('Deleted')
  }

  function updateMaterial(id: string, updates: Partial<Material>) {
    setMaterials(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m))
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  // Filter by tab + search
  const tabCategories = activeTab === 'wrap_ppf' ? ['wrap', 'ppf'] : ['decking']
  const filtered = materials.filter(m => {
    if (!tabCategories.includes(m.category)) return false
    if (searchTerm && !m.name.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'wrap_ppf', label: 'WRAP & PPF MATERIALS' },
    { key: 'decking', label: 'DECKING MATERIALS' },
  ]

  const inp: React.CSSProperties = {
    width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '7px 10px', fontSize: 13, color: 'var(--text1)', outline: 'none',
  }

  const sel: React.CSSProperties = {
    ...inp,
    appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239299b5' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    paddingRight: 28,
  }

  const label: React.CSSProperties = {
    display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text3)',
    textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 4,
    fontFamily: headingFont,
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '12px 20px', color: 'var(--text1)',
          fontSize: 13, fontWeight: 500, boxShadow: '0 8px 32px rgba(0,0,0,.4)',
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{
            fontSize: 24, fontWeight: 900, fontFamily: headingFont,
            color: 'var(--text1)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            <Layers size={20} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 8 }} />
            Materials Catalog
          </h1>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
            Manage wrap, PPF, and decking materials with cost-per-sqft pricing
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {materials.length === 0 && (
            <button onClick={seedDefaults} disabled={saving} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8,
              background: 'rgba(79,127,255,0.1)', border: '1px solid rgba(79,127,255,0.3)',
              color: 'var(--accent)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              fontFamily: headingFont,
            }}>
              <Settings size={13} /> Seed Defaults
            </button>
          )}
          <button onClick={addMaterial} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8,
            background: 'rgba(34,192,122,0.1)', border: '1px solid rgba(34,192,122,0.3)',
            color: 'var(--green)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            fontFamily: headingFont,
          }}>
            <Plus size={13} /> Add Material
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setEditingId(null) }}
            style={{
              padding: '10px 20px',
              fontSize: 12,
              fontWeight: 800,
              fontFamily: headingFont,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === tab.key ? 'var(--accent)' : 'var(--text3)',
              cursor: 'pointer',
              transition: 'color 0.2s, border-color 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search materials..."
            style={{ ...inp, paddingLeft: 32 }}
          />
        </div>
      </div>

      {/* Materials List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Loading materials...</div>
      ) : filtered.length === 0 ? (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 48, textAlign: 'center',
        }}>
          <Layers size={32} style={{ color: 'var(--text3)', margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 8 }}>
            {materials.length === 0 ? 'No materials yet' : 'No materials match your search'}
          </div>
          {materials.length === 0 && (
            <button onClick={seedDefaults} disabled={saving} style={{
              padding: '10px 20px', borderRadius: 8, background: 'var(--accent)', border: 'none',
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}>
              {saving ? 'Creating...' : 'Load Default Materials'}
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(material => {
            const isEditing = editingId === material.id
            const catLabel = MATERIAL_CATEGORIES.find(c => c.value === material.category)?.label || material.category

            return (
              <div key={material.id} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 10, overflow: 'hidden',
                opacity: material.active ? 1 : 0.5,
              }}>
                {/* Collapsed row */}
                <div
                  onClick={() => setEditingId(isEditing ? null : material.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', cursor: 'pointer',
                  }}
                >
                  <ChevronRight size={14} style={{
                    color: 'var(--text3)',
                    transform: isEditing ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', flex: 1, minWidth: 0 }}>
                    {material.name}
                  </span>
                  <span style={{
                    padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                    background: material.category === 'ppf'
                      ? 'rgba(139,92,246,0.12)'
                      : material.category === 'decking'
                        ? 'rgba(34,211,238,0.12)'
                        : 'rgba(79,127,255,0.12)',
                    color: material.category === 'ppf'
                      ? 'var(--purple)'
                      : material.category === 'decking'
                        ? 'var(--cyan)'
                        : 'var(--accent)',
                    fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.05em',
                    flexShrink: 0,
                  }}>
                    {catLabel}
                  </span>
                  {material.supplier && (
                    <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>
                      {material.supplier}
                    </span>
                  )}
                  {material.sku && (
                    <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: monoFont, flexShrink: 0 }}>
                      {material.sku}
                    </span>
                  )}
                  <span style={{
                    fontFamily: monoFont, fontSize: 13, fontWeight: 700, color: 'var(--green)',
                    flexShrink: 0,
                  }}>
                    ${material.cost_per_sqft.toFixed(2)}/sqft
                  </span>
                  {!material.active && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', flexShrink: 0 }}>
                      Inactive
                    </span>
                  )}
                </div>

                {/* Expanded edit form */}
                {isEditing && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '16px 16px' }}>
                    <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: 12 }}>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={label}>Material Name</label>
                        <input
                          value={material.name}
                          onChange={e => updateMaterial(material.id, { name: e.target.value })}
                          style={inp}
                        />
                      </div>
                      <div>
                        <label style={label}>Category</label>
                        <select
                          value={material.category}
                          onChange={e => updateMaterial(material.id, { category: e.target.value })}
                          style={sel}
                        >
                          {MATERIAL_CATEGORIES.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={label}>Cost / sqft</label>
                        <input
                          type="number"
                          value={material.cost_per_sqft}
                          onChange={e => updateMaterial(material.id, { cost_per_sqft: Number(e.target.value) })}
                          style={{ ...inp, fontFamily: monoFont }}
                          min={0}
                          step={0.01}
                        />
                      </div>
                      <div>
                        <label style={label}>Supplier</label>
                        <input
                          value={material.supplier || ''}
                          onChange={e => updateMaterial(material.id, { supplier: e.target.value || null })}
                          style={inp}
                          placeholder="e.g. Fellers, Grimco"
                        />
                      </div>
                      <div>
                        <label style={label}>SKU</label>
                        <input
                          value={material.sku || ''}
                          onChange={e => updateMaterial(material.id, { sku: e.target.value || null })}
                          style={{ ...inp, fontFamily: monoFont }}
                          placeholder="Part number"
                        />
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={label}>Description</label>
                        <input
                          value={material.description || ''}
                          onChange={e => updateMaterial(material.id, { description: e.target.value || null })}
                          style={inp}
                          placeholder="Optional notes about this material..."
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
                        <div>
                          <label style={label}>Active</label>
                          <button
                            onClick={() => updateMaterial(material.id, { active: !material.active })}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none',
                              cursor: 'pointer', color: material.active ? 'var(--green)' : 'var(--text3)', fontSize: 12,
                            }}
                          >
                            {material.active
                              ? <ToggleRight size={20} style={{ color: 'var(--green)' }} />
                              : <ToggleLeft size={20} />
                            }
                            {material.active ? 'Yes' : 'No'}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                      <button onClick={() => saveMaterial(material)} disabled={saving} style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8,
                        background: 'var(--green)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      }}>
                        <Save size={13} /> {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button onClick={() => deleteMaterial(material.id)} style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8,
                        background: 'rgba(242,90,90,0.1)', border: '1px solid rgba(242,90,90,0.3)',
                        color: 'var(--red)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      }}>
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
