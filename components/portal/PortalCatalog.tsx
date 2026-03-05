'use client'

import { useState } from 'react'
import {
  ShoppingCart, Plus, Minus, X, Check, Loader2,
  ChevronRight, ArrowLeft, Truck,
} from 'lucide-react'
import { C } from '@/lib/portal-theme'

interface Product {
  id: string
  name: string
  description: string | null
  category: string
  source: string | null
  price_cents: number | null
  price_type: string
  image_url: string | null
  options: { name: string; values: string[] }[]
}

interface CartItem {
  product: Product
  quantity: number
  options: Record<string, string>
}

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'vehicle_wraps', label: 'Vehicle Wraps' },
  { key: 'signs_banners', label: 'Signs & Banners' },
  { key: 'wall_graphics', label: 'Wall Graphics' },
  { key: 'window_tint', label: 'Window Tint' },
  { key: 'ppf', label: 'PPF' },
]

const SOURCE_LABELS: Record<string, string> = {
  b2sign: 'via B2 Sign',
  signs365: 'via Signs 365',
  in_house: '',
}

function formatPrice(cents: number | null, type: string): string {
  if (!cents) return 'Contact for pricing'
  const dollars = (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)
  if (type === 'starting_at') return `Starting at $${dollars}`
  if (type === 'per_sqft') return `$${dollars}/sq ft`
  return `$${dollars}`
}

interface Props {
  token: string
  products: Product[]
}

export default function PortalCatalog({ token, products }: Props) {
  const [activeCategory, setActiveCategory] = useState('all')
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutMode, setCheckoutMode] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [orderComplete, setOrderComplete] = useState(false)
  const [shippingAddress, setShippingAddress] = useState({ name: '', address: '', city: '', state: '', zip: '' })
  const [notes, setNotes] = useState('')

  const filtered = activeCategory === 'all'
    ? products
    : products.filter(p => p.category === activeCategory)

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotal = cart.reduce((sum, item) => sum + ((item.product.price_cents || 0) * item.quantity), 0)

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { product, quantity: 1, options: {} }]
    })
  }

  function updateQuantity(productId: string, delta: number) {
    setCart(prev => prev
      .map(i => i.product.id === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i)
      .filter(i => i.quantity > 0)
    )
  }

  function removeFromCart(productId: string) {
    setCart(prev => prev.filter(i => i.product.id !== productId))
  }

  async function handlePlaceOrder() {
    if (cart.length === 0) return
    setSubmitting(true)

    try {
      const res = await fetch('/api/portal/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portal_token: token,
          items: cart.map(item => ({
            product_id: item.product.id,
            name: item.product.name,
            quantity: item.quantity,
            options: item.options,
          })),
          shipping_address: shippingAddress.name ? shippingAddress : null,
          notes: notes || null,
        }),
      })

      if (res.ok) {
        setOrderComplete(true)
        setCart([])
        setCartOpen(false)
        setCheckoutMode(false)
      }
    } catch (err) {
      console.error('Order error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Order complete screen ──
  if (orderComplete) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: `${C.green}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
        }}>
          <Check size={32} color={C.green} strokeWidth={2.5} />
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Order Placed!</div>
        <div style={{ fontSize: 14, color: C.text2, marginBottom: 24 }}>
          Our team has been notified and will reach out to confirm your order details.
        </div>
        <button
          onClick={() => setOrderComplete(false)}
          style={{
            padding: '12px 24px', borderRadius: 10, background: C.accent,
            color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
          }}
        >
          Continue Shopping
        </button>
      </div>
    )
  }

  // ── Checkout screen ──
  if (checkoutMode) {
    return (
      <div style={{ padding: '20px 16px' }}>
        <button
          onClick={() => setCheckoutMode(false)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, background: 'none',
            border: 'none', color: C.accent, cursor: 'pointer', fontSize: 13, marginBottom: 16,
            padding: 0, fontFamily: 'inherit',
          }}
        >
          <ArrowLeft size={16} /> Back to Cart
        </button>

        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Checkout</h1>

        {/* Order summary */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Order Summary
          </h2>
          {cart.map(item => (
            <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{item.product.name}</div>
                <div style={{ fontSize: 12, color: C.text3 }}>Qty: {item.quantity}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>
                ${((item.product.price_cents || 0) * item.quantity / 100).toFixed(2)}
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', fontWeight: 700, fontSize: 16 }}>
            <span>Total</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>${(cartTotal / 100).toFixed(2)}</span>
          </div>
        </div>

        {/* Shipping (optional) */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Truck size={14} /> Shipping Address (optional)
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(['name', 'address', 'city', 'state', 'zip'] as const).map(field => (
              <input
                key={field}
                type="text"
                placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                value={shippingAddress[field]}
                onChange={e => setShippingAddress(prev => ({ ...prev, [field]: e.target.value }))}
                style={{
                  padding: '10px 12px', borderRadius: 8, background: C.surface2,
                  border: `1px solid ${C.border}`, color: C.text1, fontSize: 14, fontFamily: 'inherit',
                }}
              />
            ))}
          </div>
        </div>

        {/* Notes */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Notes
          </h2>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any special requests or details..."
            rows={3}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8, background: C.surface2,
              border: `1px solid ${C.border}`, color: C.text1, fontSize: 14, fontFamily: 'inherit', resize: 'vertical',
            }}
          />
        </div>

        <button
          onClick={handlePlaceOrder}
          disabled={submitting}
          style={{
            width: '100%', padding: '16px', borderRadius: 12,
            background: submitting ? C.surface2 : C.accent, color: '#fff',
            border: 'none', cursor: submitting ? 'default' : 'pointer',
            fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {submitting ? (
            <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Placing Order...</>
          ) : (
            <>Place Order — ${(cartTotal / 100).toFixed(2)}</>
          )}
        </button>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px 16px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Products & Services</h1>
      <p style={{ fontSize: 13, color: C.text2, marginBottom: 16 }}>
        Browse our catalog and request a quote or place an order.
      </p>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 20, paddingBottom: 4 }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            style={{
              padding: '8px 14px', borderRadius: 20, whiteSpace: 'nowrap',
              background: activeCategory === cat.key ? C.accent : C.surface,
              color: activeCategory === cat.key ? '#fff' : C.text2,
              border: activeCategory === cat.key ? 'none' : `1px solid ${C.border}`,
              cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 80 }}>
        {filtered.map(product => {
          const inCart = cart.find(i => i.product.id === product.id)
          const sourceLabel = product.source ? SOURCE_LABELS[product.source] || '' : ''
          return (
            <div
              key={product.id}
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Image placeholder */}
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover' }} />
              ) : (
                <div style={{
                  width: '100%', aspectRatio: '4/3', background: `${C.accent}10`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <ShoppingCart size={24} color={C.accent} strokeWidth={1} />
                </div>
              )}
              <div style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{product.name}</div>
                {product.description && (
                  <div style={{ fontSize: 11, color: C.text3, marginBottom: 8, lineHeight: 1.4, flex: 1 }}>
                    {product.description.length > 80 ? product.description.slice(0, 80) + '...' : product.description}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.accent, fontFamily: 'JetBrains Mono, monospace' }}>
                    {formatPrice(product.price_cents, product.price_type)}
                  </span>
                </div>
                {sourceLabel && (
                  <div style={{ fontSize: 10, color: C.text3, marginBottom: 8 }}>{sourceLabel}</div>
                )}
                {inCart ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                    <button
                      onClick={() => updateQuantity(product.id, -1)}
                      style={{
                        width: 28, height: 28, borderRadius: 6, background: C.surface2,
                        border: `1px solid ${C.border}`, cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', color: C.text1,
                      }}
                    >
                      <Minus size={14} />
                    </button>
                    <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', minWidth: 20, textAlign: 'center' }}>
                      {inCart.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(product.id, 1)}
                      style={{
                        width: 28, height: 28, borderRadius: 6, background: C.accent,
                        border: 'none', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', color: '#fff',
                      }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => addToCart(product)}
                    style={{
                      padding: '8px 12px', borderRadius: 8, background: `${C.accent}15`,
                      border: `1px solid ${C.accent}35`, cursor: 'pointer',
                      color: C.accent, fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <Plus size={14} /> Add to Cart
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Floating cart button */}
      {cartCount > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          style={{
            position: 'fixed',
            bottom: 80,
            left: 16,
            right: 16,
            padding: '14px 20px',
            borderRadius: 12,
            background: C.accent,
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontSize: 15,
            fontWeight: 700,
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 45,
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShoppingCart size={18} />
            View Cart ({cartCount} item{cartCount !== 1 ? 's' : ''})
          </span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>${(cartTotal / 100).toFixed(2)}</span>
        </button>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <>
          <div onClick={() => setCartOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60 }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: C.surface, borderRadius: '16px 16px 0 0',
            zIndex: 70, padding: '16px 16px env(safe-area-inset-bottom, 16px)',
            maxHeight: '70dvh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>Your Cart</span>
              <button onClick={() => setCartOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.text3, padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            {cart.map(item => (
              <div key={item.product.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 0', borderBottom: `1px solid ${C.border}`,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{item.product.name}</div>
                  <div style={{ fontSize: 12, color: C.text3 }}>
                    ${((item.product.price_cents || 0) / 100).toFixed(2)} each
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => updateQuantity(item.product.id, -1)}
                    style={{
                      width: 28, height: 28, borderRadius: 6, background: C.surface2,
                      border: `1px solid ${C.border}`, cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', color: C.text1,
                    }}
                  >
                    <Minus size={14} />
                  </button>
                  <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', minWidth: 20, textAlign: 'center' }}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product.id, 1)}
                    style={{
                      width: 28, height: 28, borderRadius: 6, background: C.accent,
                      border: 'none', cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', color: '#fff',
                    }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <button
                  onClick={() => removeFromCart(item.product.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.text3, padding: 4 }}
                >
                  <X size={16} />
                </button>
              </div>
            ))}

            <div style={{
              display: 'flex', justifyContent: 'space-between', padding: '16px 0',
              fontSize: 16, fontWeight: 700,
            }}>
              <span>Total</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>${(cartTotal / 100).toFixed(2)}</span>
            </div>

            <button
              onClick={() => { setCartOpen(false); setCheckoutMode(true) }}
              style={{
                width: '100%', padding: '14px', borderRadius: 12,
                background: C.accent, color: '#fff', border: 'none',
                cursor: 'pointer', fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              Checkout <ChevronRight size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
