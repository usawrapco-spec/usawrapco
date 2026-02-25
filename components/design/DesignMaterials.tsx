'use client'

import { useState, useMemo } from 'react'
import { Search, Layers, Info, X, CheckCircle, XCircle } from 'lucide-react'
import type { Profile } from '@/types'

interface Material {
  id: string
  org_id: string | null
  brand: string
  product_line: string | null
  name: string
  sku: string | null
  category: string
  hex_color: string | null
  hex_color_2: string | null
  roughness: number
  metalness: number
  clearcoat: number
  is_ppf: boolean
  thumbnail_url: string | null
  in_stock: boolean
  cost_per_sqft: number | null
  enabled: boolean
  sort_order: number
}

const CATEGORIES = [
  { key: 'all',         label: 'All' },
  { key: 'gloss',       label: 'Gloss' },
  { key: 'matte',       label: 'Matte' },
  { key: 'satin',       label: 'Satin' },
  { key: 'chrome',      label: 'Chrome' },
  { key: 'color_shift', label: 'Color Shift' },
  { key: 'carbon',      label: 'Carbon' },
  { key: 'ppf',         label: 'PPF' },
]

const BRANDS = ['All', 'Inozetek', 'Pure PPF', 'Avery', '3M', 'Oracal']

interface Props {
  profile: Profile
  initialMaterials: Material[]
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

function isDark(hex: string) {
  const [r, g, b] = hexToRgb(hex)
  return (0.299 * r + 0.587 * g + 0.114 * b) < 128
}

export function DesignMaterials({ profile, initialMaterials }: Props) {
  const [search, setSearch]           = useState('')
  const [category, setCategory]       = useState('all')
  const [brand, setBrand]             = useState('All')
  const [inStockOnly, setInStockOnly] = useState(false)
  const [selected, setSelected]       = useState<Material | null>(null)

  const filtered = useMemo(() => {
    return initialMaterials.filter(m => {
      const q = search.toLowerCase()
      const matchSearch = !q
        || m.name.toLowerCase().includes(q)
        || m.brand.toLowerCase().includes(q)
        || (m.sku ?? '').toLowerCase().includes(q)
        || (m.product_line ?? '').toLowerCase().includes(q)
      const matchCat = category === 'all' || m.category === category
      const matchBrand = brand === 'All' || m.brand.toLowerCase().includes(brand.toLowerCase())
      const matchStock = !inStockOnly || m.in_stock
      return matchSearch && matchCat && matchBrand && matchStock
    })
  }, [initialMaterials, search, category, brand, inStockOnly])

  // Group by brand
  const byBrand = useMemo(() => {
    const map: Record<string, Material[]> = {}
    for (const m of filtered) {
      if (!map[m.brand]) map[m.brand] = []
      map[m.brand].push(m)
    }
    return map
  }, [filtered])

  const brands = Object.keys(byBrand).sort()

  return (
    <div style={{ display: 'flex', gap: 16, minHeight: 0 }}>
      {/* ── Main panel ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Filters bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {/* Category chips */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CATEGORIES.map(c => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                style={{
                  padding: '5px 14px',
                  borderRadius: 20,
                  border: `1px solid ${category === c.key ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`,
                  background: category === c.key ? 'rgba(79,127,255,0.12)' : 'transparent',
                  color: category === c.key ? 'var(--accent)' : 'var(--text2)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Row 2: brand + search + stock toggle */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={brand}
              onChange={e => setBrand(e.target.value)}
              style={{
                background: 'var(--surface)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: 'var(--text1)',
                fontSize: 12,
                padding: '7px 10px',
                cursor: 'pointer',
              }}
            >
              {BRANDS.map(b => <option key={b}>{b}</option>)}
            </select>

            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, SKU…"
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 32px',
                  background: 'var(--surface)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  color: 'var(--text1)',
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--text2)', flexShrink: 0 }}>
              <div
                onClick={() => setInStockOnly(v => !v)}
                style={{
                  width: 32,
                  height: 18,
                  borderRadius: 9,
                  background: inStockOnly ? 'var(--green)' : 'rgba(255,255,255,0.1)',
                  position: 'relative',
                  transition: 'background 0.2s',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  position: 'absolute',
                  left: inStockOnly ? 16 : 2,
                  top: 2,
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.2s',
                }} />
              </div>
              In stock only
            </label>
          </div>
        </div>

        {/* Stats */}
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>
          {filtered.length} material{filtered.length !== 1 ? 's' : ''} · {initialMaterials.filter(m => m.in_stock).length} in stock
        </div>

        {/* Material grid by brand */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
            <Layers size={36} style={{ margin: '0 auto 12px', display: 'block' }} />
            <div style={{ fontWeight: 600 }}>No materials found</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Try adjusting your filters</div>
          </div>
        ) : (
          brands.map(brandName => (
            <div key={brandName} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                {brandName} <span style={{ opacity: 0.5 }}>({byBrand[brandName].length})</span>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                gap: 8,
              }}>
                {byBrand[brandName].map(m => {
                  const bg = m.hex_color ?? '#555'
                  const bg2 = m.hex_color_2
                  const textColor = isDark(bg) ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)'
                  const isActive = selected?.id === m.id

                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelected(isActive ? null : m)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: 8,
                        overflow: 'hidden',
                        border: `2px solid ${isActive ? 'var(--accent)' : 'rgba(255,255,255,0.06)'}`,
                        background: 'var(--surface)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'border-color 0.15s, transform 0.1s',
                        transform: isActive ? 'scale(1.02)' : 'scale(1)',
                        position: 'relative',
                      }}
                    >
                      {/* Color swatch */}
                      <div style={{
                        height: 64,
                        background: bg2
                          ? `linear-gradient(135deg, ${bg} 50%, ${bg2} 50%)`
                          : bg,
                        position: 'relative',
                      }}>
                        {m.is_ppf && (
                          <div style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            background: 'rgba(0,0,0,0.5)',
                            borderRadius: 4,
                            padding: '2px 5px',
                            fontSize: 9,
                            fontWeight: 700,
                            color: '#fff',
                          }}>
                            PPF
                          </div>
                        )}
                        {!m.in_stock && (
                          <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0,0,0,0.45)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>OUT OF STOCK</span>
                          </div>
                        )}
                      </div>

                      {/* Label */}
                      <div style={{ padding: '6px 8px' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text1)', lineHeight: 1.3, marginBottom: 2 }}>
                          {m.name}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                          {m.category.replace('_', ' ')}
                          {m.cost_per_sqft ? ` · $${m.cost_per_sqft}/ft²` : ''}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Detail panel ───────────────────────────────────────────────── */}
      {selected && (
        <div style={{
          width: 280,
          flexShrink: 0,
          background: 'var(--surface)',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignSelf: 'flex-start',
          position: 'sticky',
          top: 0,
        }}>
          {/* Color preview */}
          <div style={{
            height: 100,
            background: selected.hex_color_2
              ? `linear-gradient(135deg, ${selected.hex_color ?? '#555'} 50%, ${selected.hex_color_2} 50%)`
              : selected.hex_color ?? '#555',
            position: 'relative',
          }}>
            <button
              onClick={() => setSelected(null)}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.5)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <X size={13} />
            </button>
          </div>

          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Name + brand */}
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text1)', marginBottom: 4 }}>{selected.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{selected.brand}{selected.product_line ? ` · ${selected.product_line}` : ''}</div>
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <span style={{
                padding: '3px 10px', borderRadius: 12,
                background: 'var(--surface2)',
                fontSize: 11, fontWeight: 600, color: 'var(--text2)',
                textTransform: 'capitalize',
              }}>
                {selected.category.replace('_', ' ')}
              </span>
              {selected.is_ppf && (
                <span style={{ padding: '3px 10px', borderRadius: 12, background: 'rgba(34,211,238,0.1)', fontSize: 11, fontWeight: 600, color: 'var(--cyan)' }}>
                  PPF
                </span>
              )}
              <span style={{
                padding: '3px 10px', borderRadius: 12,
                background: selected.in_stock ? 'rgba(34,192,122,0.1)' : 'rgba(242,90,90,0.1)',
                fontSize: 11, fontWeight: 600,
                color: selected.in_stock ? 'var(--green)' : 'var(--red)',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {selected.in_stock ? <CheckCircle size={10} /> : <XCircle size={10} />}
                {selected.in_stock ? 'In stock' : 'Out of stock'}
              </span>
            </div>

            {/* Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {selected.sku && <DetailRow label="SKU" value={selected.sku} />}
              {selected.hex_color && <DetailRow label="Color" value={selected.hex_color.toUpperCase()} />}
              {selected.hex_color_2 && <DetailRow label="Color 2" value={selected.hex_color_2.toUpperCase()} />}
              {selected.cost_per_sqft && <DetailRow label="Cost/ft²" value={`$${selected.cost_per_sqft}`} />}
              <DetailRow label="Roughness" value={String(selected.roughness)} />
              <DetailRow label="Metalness" value={String(selected.metalness)} />
              {selected.clearcoat > 0 && <DetailRow label="Clearcoat" value={String(selected.clearcoat)} />}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 12, color: 'var(--text3)' }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--text1)', fontWeight: 500 }}>{value}</span>
    </div>
  )
}
