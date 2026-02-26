'use client'

import { useState } from 'react'
import { Store, ExternalLink, Edit2, ToggleLeft, ToggleRight, Plus, TrendingUp, ShoppingBag, Star, Package, BarChart2, Eye, EyeOff } from 'lucide-react'

const C = {
  bg: '#0d0f14', surface: '#13151c', surface2: '#1a1d27', border: '#1e2738',
  accent: '#4f7fff', green: '#22c07a', red: '#f25a5a', amber: '#f59e0b', cyan: '#22d3ee',
  text1: '#e8eaed', text2: '#9299b5', text3: '#5a6080',
}

const CATEGORY_COLORS: Record<string, string> = {
  wrap: '#4f7fff', ppf: '#22d3ee', decking: '#22c07a', add_on: '#f59e0b', bundle: '#8b5cf6',
}

interface Product {
  id: string
  name: string
  tagline: string | null
  category: string
  service_type: string | null
  pricing_type: string
  base_price: number | null
  price_label: string | null
  badge: string | null
  badge_color: string
  enabled: boolean
  sort_order: number
  click_count: number
  conversion_count: number
  features: string[]
  vehicle_types: string[]
}

export default function ShopManageClient({ products: initial }: { products: Product[] }) {
  const [products, setProducts] = useState(initial)
  const [tab, setTab] = useState<'products' | 'analytics' | 'portfolio'>('products')

  const toggleEnabled = async (product: Product) => {
    const updated = products.map(p => p.id === product.id ? { ...p, enabled: !p.enabled } : p)
    setProducts(updated)
    await fetch(`/api/shop/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !product.enabled }),
    })
  }

  const totalClicks = products.reduce((s, p) => s + (p.click_count || 0), 0)
  const totalConversions = products.reduce((s, p) => s + (p.conversion_count || 0), 0)
  const overallCVR = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : '0.0'

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: C.text1, margin: 0, fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.02em' }}>
            Virtual Shop
          </h1>
          <p style={{ fontSize: 13, color: C.text2, margin: '4px 0 0' }}>
            Manage your public product catalog and quote configurator
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <a
            href="/shop"
            target="_blank"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text2, fontSize: 12, fontWeight: 700, textDecoration: 'none', cursor: 'pointer' }}
          >
            <ExternalLink size={14} /> Preview Shop
          </a>
          <button
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: C.accent, border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            <Plus size={14} /> Add Product
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Active Products', value: products.filter(p => p.enabled).length, icon: Package, color: C.accent },
          { label: 'Total Clicks', value: totalClicks.toLocaleString(), icon: Eye, color: C.cyan },
          { label: 'Conversions', value: totalConversions.toLocaleString(), icon: TrendingUp, color: C.green },
          { label: 'Conv. Rate', value: `${overallCVR}%`, icon: BarChart2, color: C.amber },
        ].map(s => (
          <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <s.icon size={14} color={s.color} />
              <span style={{ fontSize: 11, color: C.text2, fontWeight: 600 }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: C.text1, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: C.surface2, padding: 4, borderRadius: 10, width: 'fit-content' }}>
        {[
          { key: 'products', label: 'Products', icon: ShoppingBag },
          { key: 'analytics', label: 'Analytics', icon: BarChart2 },
          { key: 'portfolio', label: 'Portfolio Photos', icon: Star },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 7,
              border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
              background: tab === t.key ? C.surface : 'transparent',
              color: tab === t.key ? C.text1 : C.text3,
              boxShadow: tab === t.key ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
            }}
          >
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'products' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {products.map(product => {
            const cvr = product.click_count > 0 ? ((product.conversion_count / product.click_count) * 100).toFixed(0) : '0'
            const catColor = CATEGORY_COLORS[product.category] || C.accent
            return (
              <div
                key={product.id}
                style={{
                  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16,
                  display: 'flex', alignItems: 'center', gap: 14,
                  opacity: product.enabled ? 1 : 0.5,
                }}
              >
                {/* Category badge */}
                <div style={{ width: 40, height: 40, borderRadius: 8, background: `${catColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Package size={18} color={catColor} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.text1 }}>{product.name}</span>
                    {product.badge && (
                      <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: product.badge_color === 'gold' ? 'rgba(245,158,11,0.2)' : product.badge_color === 'green' ? 'rgba(34,192,122,0.2)' : 'rgba(79,127,255,0.2)', color: product.badge_color === 'gold' ? C.amber : product.badge_color === 'green' ? C.green : C.accent, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {product.badge}
                      </span>
                    )}
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 3, background: `${catColor}15`, color: catColor, textTransform: 'capitalize' }}>
                      {product.category}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: C.text2 }}>{product.tagline}</div>
                </div>

                {/* Price */}
                <div style={{ textAlign: 'right', minWidth: 120 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.text1, fontFamily: 'JetBrains Mono, monospace' }}>
                    {product.price_label || (product.base_price ? `$${product.base_price.toLocaleString()}` : '—')}
                  </div>
                  <div style={{ fontSize: 10, color: C.text3, marginTop: 2, textTransform: 'capitalize' }}>{product.pricing_type}</div>
                </div>

                {/* Analytics */}
                <div style={{ textAlign: 'center', minWidth: 80 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text1 }}>{product.click_count || 0}</div>
                  <div style={{ fontSize: 10, color: C.text3 }}>views</div>
                </div>
                <div style={{ textAlign: 'center', minWidth: 80 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: parseInt(cvr) >= 20 ? C.green : parseInt(cvr) >= 10 ? C.amber : C.text2 }}>{cvr}%</div>
                  <div style={{ fontSize: 10, color: C.text3 }}>conv.</div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => toggleEnabled(product)}
                    style={{ padding: '6px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: product.enabled ? C.green : C.text3, cursor: 'pointer' }}
                  >
                    {product.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  </button>
                  <button style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700 }}>
                    <Edit2 size={13} /> Edit
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'analytics' && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 13, color: C.text2, marginBottom: 20 }}>Frequently Bought Together Pairs (this month)</div>
          {[
            { pair: 'Full Wrap + Chrome Delete', count: 34 },
            { pair: 'PPF Front + Full Wrap', count: 28 },
            { pair: 'Fleet Wrap + DekWave', count: 12 },
            { pair: 'Full Wrap + Window Tint', count: 9 },
          ].map(row => (
            <div key={row.pair} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ flex: 1, fontSize: 13, color: C.text1 }}>{row.pair}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ height: 6, borderRadius: 3, background: C.accent, width: `${row.count * 3}px` }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: C.accent, fontFamily: 'JetBrains Mono, monospace', minWidth: 30 }}>{row.count}x</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'portfolio' && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, textAlign: 'center', color: C.text3 }}>
          <Star size={32} style={{ margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Portfolio Photos</div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>Featured job photos show on product cards in the shop. Mark photos as &quot;Portfolio&quot; from any job&apos;s Photos tab.</div>
        </div>
      )}
    </div>
  )
}
