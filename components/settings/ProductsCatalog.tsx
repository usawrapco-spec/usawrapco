'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  Plus, Trash2, Save, Package, ToggleLeft, ToggleRight,
  ChevronDown, ChevronRight, GripVertical, Settings, Search,
} from 'lucide-react'
import { DEFAULT_PRODUCTS, CALCULATOR_TYPES, PRODUCT_CATEGORIES } from '@/lib/data/default-products'

const headingFont = 'Barlow Condensed, sans-serif'
const monoFont = 'JetBrains Mono, monospace'

interface Product {
  id: string
  org_id: string
  name: string
  category: string
  description: string | null
  default_price: number
  default_hours: number
  calculator_type: string
  taxable: boolean
  active: boolean
  sort_order: number
  specs: Record<string, unknown>
}

interface Props {
  profile: Profile
}

export default function ProductsCatalog({ profile }: Props) {
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCat, setFilterCat] = useState('')

  useEffect(() => {
    loadProducts()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadProducts() {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('sort_order', { ascending: true })
    if (data && data.length > 0) {
      setProducts(data)
    }
    setLoading(false)
  }

  async function seedDefaults() {
    setSaving(true)
    const inserts = DEFAULT_PRODUCTS.map(p => ({
      org_id: profile.org_id,
      name: p.name,
      category: p.category,
      description: p.description,
      default_price: p.defaultPrice,
      default_hours: p.defaultHours,
      calculator_type: p.calculatorType,
      taxable: p.taxable,
      sort_order: p.sortOrder,
      active: true,
      specs: {},
    }))
    const { data, error } = await supabase.from('products').insert(inserts).select()
    if (data) {
      setProducts(data)
      showToast(`${data.length} products created`)
    } else if (error) {
      showToast('Error: ' + error.message)
    }
    setSaving(false)
  }

  async function addProduct() {
    const newProduct = {
      org_id: profile.org_id,
      name: 'New Product',
      category: 'wrap',
      description: '',
      default_price: 0,
      default_hours: 0,
      calculator_type: 'simple',
      taxable: true,
      active: true,
      sort_order: products.length + 1,
      specs: {},
    }
    const { data, error } = await supabase.from('products').insert(newProduct).select().single()
    if (data) {
      setProducts(prev => [...prev, data])
      setEditingId(data.id)
      showToast('Product added')
    }
  }

  async function saveProduct(product: Product) {
    setSaving(true)
    const { error } = await supabase.from('products').update({
      name: product.name,
      category: product.category,
      description: product.description,
      default_price: product.default_price,
      default_hours: product.default_hours,
      calculator_type: product.calculator_type,
      taxable: product.taxable,
      active: product.active,
      sort_order: product.sort_order,
      updated_at: new Date().toISOString(),
    }).eq('id', product.id)
    if (!error) showToast('Saved')
    else showToast('Error: ' + error.message)
    setSaving(false)
  }

  async function deleteProduct(id: string) {
    if (!confirm('Delete this product?')) return
    await supabase.from('products').delete().eq('id', id)
    setProducts(prev => prev.filter(p => p.id !== id))
    showToast('Deleted')
  }

  function updateProduct(id: string, updates: Partial<Product>) {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const filtered = products.filter(p => {
    if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return false
    if (filterCat && p.category !== filterCat) return false
    return true
  })

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
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 20px', color: 'var(--text1)', fontSize: 13, fontWeight: 500, boxShadow: '0 8px 32px rgba(0,0,0,.4)' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, fontFamily: headingFont, color: 'var(--text1)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <Package size={20} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 8 }} />
            Products Catalog
          </h1>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
            Manage your product types, calculators, and default pricing
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {products.length === 0 && (
            <button onClick={seedDefaults} disabled={saving} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8,
              background: 'rgba(79,127,255,0.1)', border: '1px solid rgba(79,127,255,0.3)',
              color: 'var(--accent)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              fontFamily: headingFont,
            }}>
              <Settings size={13} /> Load Defaults
            </button>
          )}
          <button onClick={addProduct} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8,
            background: 'rgba(34,192,122,0.1)', border: '1px solid rgba(34,192,122,0.3)',
            color: 'var(--green)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            fontFamily: headingFont,
          }}>
            <Plus size={13} /> Add Product
          </button>
        </div>
      </div>

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search products..."
            style={{ ...inp, paddingLeft: 32 }}
          />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ ...sel, width: 160 }}>
          <option value="">All Categories</option>
          {PRODUCT_CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Products List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Loading products...</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 48, textAlign: 'center' }}>
          <Package size={32} style={{ color: 'var(--text3)', margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 8 }}>No products yet</div>
          <button onClick={seedDefaults} disabled={saving} style={{
            padding: '10px 20px', borderRadius: 8, background: 'var(--accent)', border: 'none',
            color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
            {saving ? 'Creating...' : 'Load Default Products'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(product => {
            const isEditing = editingId === product.id
            const calcLabel = CALCULATOR_TYPES.find(c => c.value === product.calculator_type)?.label || product.calculator_type
            const catLabel = PRODUCT_CATEGORIES.find(c => c.value === product.category)?.label || product.category

            return (
              <div key={product.id} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 10, overflow: 'hidden',
                opacity: product.active ? 1 : 0.5,
              }}>
                {/* Collapsed row */}
                <div
                  onClick={() => setEditingId(isEditing ? null : product.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', cursor: 'pointer',
                  }}
                >
                  <ChevronRight size={14} style={{
                    color: 'var(--text3)',
                    transform: isEditing ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                  }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', flex: 1 }}>
                    {product.name}
                  </span>
                  <span style={{
                    padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                    background: 'rgba(79,127,255,0.12)', color: 'var(--accent)',
                    fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    {catLabel}
                  </span>
                  <span style={{
                    padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                    background: 'rgba(139,92,246,0.12)', color: 'var(--purple)',
                    fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    {calcLabel}
                  </span>
                  {product.default_price > 0 && (
                    <span style={{ fontFamily: monoFont, fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>
                      ${product.default_price}
                    </span>
                  )}
                  {!product.active && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase' }}>
                      Inactive
                    </span>
                  )}
                </div>

                {/* Expanded edit form */}
                {isEditing && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '16px 16px' }}>
                    <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: 12 }}>
                      <div>
                        <label style={label}>Product Name</label>
                        <input value={product.name} onChange={e => updateProduct(product.id, { name: e.target.value })} style={inp} />
                      </div>
                      <div>
                        <label style={label}>Category</label>
                        <select value={product.category} onChange={e => updateProduct(product.id, { category: e.target.value })} style={sel}>
                          {PRODUCT_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={label}>Calculator Type</label>
                        <select value={product.calculator_type} onChange={e => updateProduct(product.id, { calculator_type: e.target.value })} style={sel}>
                          {CALCULATOR_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={label}>Default Price</label>
                        <input type="number" value={product.default_price} onChange={e => updateProduct(product.id, { default_price: Number(e.target.value) })} style={{ ...inp, fontFamily: monoFont }} min={0} step={0.01} />
                      </div>
                      <div>
                        <label style={label}>Default Hours</label>
                        <input type="number" value={product.default_hours} onChange={e => updateProduct(product.id, { default_hours: Number(e.target.value) })} style={{ ...inp, fontFamily: monoFont }} min={0} step={0.5} />
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={label}>Description</label>
                        <input value={product.description || ''} onChange={e => updateProduct(product.id, { description: e.target.value })} style={inp} placeholder="Product description..." />
                      </div>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
                        <div>
                          <label style={label}>Taxable</label>
                          <button onClick={() => updateProduct(product.id, { taxable: !product.taxable })} style={{
                            display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none',
                            cursor: 'pointer', color: product.taxable ? 'var(--green)' : 'var(--text3)', fontSize: 12,
                          }}>
                            {product.taxable ? <ToggleRight size={20} style={{ color: 'var(--green)' }} /> : <ToggleLeft size={20} />}
                            {product.taxable ? 'Yes' : 'No'}
                          </button>
                        </div>
                        <div>
                          <label style={label}>Active</label>
                          <button onClick={() => updateProduct(product.id, { active: !product.active })} style={{
                            display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none',
                            cursor: 'pointer', color: product.active ? 'var(--green)' : 'var(--text3)', fontSize: 12,
                          }}>
                            {product.active ? <ToggleRight size={20} style={{ color: 'var(--green)' }} /> : <ToggleLeft size={20} />}
                            {product.active ? 'Yes' : 'No'}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                      <button onClick={() => saveProduct(product)} disabled={saving} style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8,
                        background: 'var(--green)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      }}>
                        <Save size={13} /> {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button onClick={() => deleteProduct(product.id)} style={{
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
