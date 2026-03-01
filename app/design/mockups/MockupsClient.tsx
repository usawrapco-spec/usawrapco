'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus,
  Search,
  Grid3X3,
  List,
  ChevronRight,
  ChevronLeft,
  X,
  Check,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { DesignHealthBanner } from '@/components/design/DesignHealthBanner'

interface DesignMockup {
  id: string
  customer_id: string | null
  business_name: string | null
  vehicle_type: string | null
  style_preference: string | null
  brand_colors: string[] | null
  logo_url: string | null
  mockup_urls: string[] | null
  image_prompt: string | null
  payment_status: string
  linked_project_id: string | null
  created_at: string
  customer: { name: string; email: string } | null
}

interface Customer {
  id: string
  name: string
  email: string | null
  business_name: string | null
}

type MockupStatus = 'pending' | 'generated' | 'paywall' | 'unlocked' | 'in_studio'

function getStatus(m: DesignMockup): MockupStatus {
  if (m.linked_project_id) return 'in_studio'
  if (m.payment_status === 'paid') return 'unlocked'
  if (Array.isArray(m.mockup_urls) && m.mockup_urls.length > 0) return 'generated'
  return 'pending'
}

const STATUS_CONFIG: Record<MockupStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: 'var(--text3)', bg: 'rgba(90,96,128,0.25)' },
  generated: { label: 'Generated', color: 'var(--accent)', bg: 'rgba(79,127,255,0.18)' },
  paywall: { label: 'Paywall', color: 'var(--amber)', bg: 'rgba(245,158,11,0.18)' },
  unlocked: { label: 'Unlocked', color: 'var(--green)', bg: 'rgba(34,192,122,0.18)' },
  in_studio: { label: 'In Studio', color: 'var(--purple)', bg: 'rgba(139,92,246,0.18)' },
}

const VEHICLE_TYPES = [
  { id: 'car', label: 'Car', emoji: '🚗' },
  { id: 'truck', label: 'Truck', emoji: '🚛' },
  { id: 'van', label: 'Van', emoji: '🚐' },
  { id: 'sprinter', label: 'Sprinter', emoji: '🚌' },
  { id: 'box_truck', label: 'Box Truck', emoji: '📦' },
  { id: 'trailer', label: 'Trailer', emoji: '🚜' },
  { id: 'boat', label: 'Boat', emoji: '⛵' },
]

const STYLE_OPTS = [
  'Modern & Clean',
  'Bold & Aggressive',
  'Luxury & Premium',
  'Fun & Playful',
  'Corporate & Professional',
]

const FILTER_TABS = ['All', 'Pending', 'Generated', 'Unlocked']

// ── Main Component ──────────────────────────────────────────────────────────

export default function MockupsClient() {
  const router = useRouter()
  const supabase = createClient()

  // List state
  const [mockups, setMockups] = useState<DesignMockup[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'gallery' | 'list'>('gallery')
  const [activeFilter, setActiveFilter] = useState('All')
  const [search, setSearch] = useState('')

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [generating, setGenerating] = useState(false)

  // Wizard state
  const [customerQuery, setCustomerQuery] = useState('')
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [vehicleType, setVehicleType] = useState('')
  const [brandColors, setBrandColors] = useState<string[]>(['#1a73e8'])
  const [logoUrl, setLogoUrl] = useState('')
  const [stylePreference, setStylePreference] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [tagline, setTagline] = useState('')

  useEffect(() => {
    loadMockups()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadMockups() {
    setLoading(true)
    const { data } = await supabase
      .from('design_mockups')
      .select('*, customer:customer_id(name, email)')
      .order('created_at', { ascending: false })
      .limit(200)
    setMockups((data || []) as unknown as DesignMockup[])
    setLoading(false)
  }

  // Customer search with debounce
  useEffect(() => {
    if (customerQuery.length < 2) {
      setCustomerResults([])
      return
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('customers')
        .select('id, name, email, business_name')
        .or(`name.ilike.%${customerQuery}%,business_name.ilike.%${customerQuery}%`)
        .limit(8)
      setCustomerResults((data || []) as Customer[])
    }, 300)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerQuery])

  function openDrawer() {
    setStep(1)
    setSelectedCustomer(null)
    setCustomerQuery('')
    setCustomerResults([])
    setVehicleType('')
    setBrandColors(['#1a73e8'])
    setLogoUrl('')
    setStylePreference('')
    setBusinessName('')
    setTagline('')
    setGenerating(false)
    setDrawerOpen(true)
  }

  async function generate() {
    setGenerating(true)
    try {
      const res = await fetch('/api/ai/generate-mockup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: selectedCustomer?.id || null,
          vehicle_type: vehicleType,
          brand_colors: brandColors,
          logo_url: logoUrl || null,
          style_preference: stylePreference,
          business_name: businessName || selectedCustomer?.name || '',
          tagline: tagline || null,
        }),
      })
      const data = await res.json()
      setDrawerOpen(false)
      await loadMockups()
      if (data.mockup_id) {
        router.push(`/design/mockups/${data.mockup_id}`)
      }
    } catch (e) {
      console.error('[generate]', e)
      setGenerating(false)
    }
  }

  // Filter + search
  const filtered = mockups.filter(m => {
    const status = getStatus(m)
    if (activeFilter !== 'All' && status !== activeFilter.toLowerCase()) return false
    if (search) {
      const s = search.toLowerCase()
      const name = (m.customer?.name ?? '').toLowerCase()
      const biz = (m.business_name ?? '').toLowerCase()
      if (!name.includes(s) && !biz.includes(s)) return false
    }
    return true
  })

  const canAdvance =
    (step === 1 && (!!selectedCustomer || businessName.trim().length > 0)) ||
    (step === 2 && vehicleType.length > 0) ||
    (step === 3 && stylePreference.length > 0)

  return (
    <>
      <DesignHealthBanner />

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <h2
          style={{
            flex: 1,
            margin: 0,
            fontFamily: 'Barlow Condensed, sans-serif',
            fontWeight: 800,
            fontSize: 22,
            color: 'var(--text1)',
          }}
        >
          AI Mockups
        </h2>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['gallery', 'list'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 7,
                border: `1px solid ${view === v ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`,
                background: view === v ? 'rgba(79,127,255,0.15)' : 'transparent',
                color: view === v ? 'var(--accent)' : 'var(--text3)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title={v === 'gallery' ? 'Gallery view' : 'List view'}
            >
              {v === 'gallery' ? <Grid3X3 size={15} /> : <List size={15} />}
            </button>
          ))}
        </div>
        <button
          onClick={openDrawer}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 16px',
            background: 'var(--accent)',
            borderRadius: 9,
            border: 'none',
            color: '#fff',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          <Plus size={15} />
          New Mockup
        </button>
      </div>

      {/* ── Filter tabs + search ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 3,
            background: 'var(--surface2)',
            borderRadius: 9,
            padding: 3,
          }}
        >
          {FILTER_TABS.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                padding: '6px 14px',
                borderRadius: 7,
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                background: activeFilter === f ? 'var(--surface)' : 'transparent',
                color: activeFilter === f ? 'var(--text1)' : 'var(--text3)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {f}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text3)',
              pointerEvents: 'none',
            }}
          />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by customer or business..."
            style={{
              width: '100%',
              boxSizing: 'border-box' as const,
              background: 'var(--surface2)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 9,
              padding: '7px 12px 7px 32px',
              color: 'var(--text1)',
              fontSize: 13,
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 200,
            color: 'var(--text3)',
            gap: 10,
          }}
        >
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 14 }}>Loading mockups...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text3)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎨</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text2)', marginBottom: 8 }}>
            {search || activeFilter !== 'All' ? 'No mockups match your filters' : 'No mockups yet'}
          </div>
          <div style={{ fontSize: 13 }}>
            {search || activeFilter !== 'All'
              ? 'Try adjusting your search or filters'
              : 'Click "New Mockup" to generate AI wrap designs'}
          </div>
        </div>
      ) : view === 'gallery' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
            gap: 16,
          }}
        >
          {filtered.map(m => (
            <MockupCard key={m.id} mockup={m} />
          ))}
        </div>
      ) : (
        <MockupListView mockups={filtered} />
      )}

      {/* ── New Mockup Drawer ── */}
      {drawerOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={e => {
            if (e.target === e.currentTarget) setDrawerOpen(false)
          }}
        >
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: 'min(480px, 100vw)',
              background: 'var(--surface)',
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Drawer header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '16px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                flexShrink: 0,
              }}
            >
              {step > 1 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text2)',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <ChevronLeft size={18} />
                </button>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text1)' }}>
                  New Mockup — Step {step} of 4
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                  {step === 1
                    ? 'Select or enter customer'
                    : step === 2
                      ? 'Choose vehicle type'
                      : step === 3
                        ? 'Brand & style details'
                        : 'Review & generate'}
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text3)',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Step progress bar */}
            <div
              style={{
                display: 'flex',
                gap: 3,
                padding: '10px 20px',
                flexShrink: 0,
              }}
            >
              {[1, 2, 3, 4].map(s => (
                <div
                  key={s}
                  style={{
                    flex: 1,
                    height: 3,
                    borderRadius: 3,
                    background: s <= step ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                    transition: 'background 0.2s',
                  }}
                />
              ))}
            </div>

            {/* Step content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {/* Step 1 — Customer */}
              {step === 1 && (
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--text3)',
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.07em',
                      display: 'block',
                      marginBottom: 10,
                    }}
                  >
                    Search Existing Customer
                  </label>
                  <input
                    value={customerQuery}
                    onChange={e => setCustomerQuery(e.target.value)}
                    placeholder="Type name or business..."
                    style={{
                      width: '100%',
                      boxSizing: 'border-box' as const,
                      background: 'var(--surface2)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 9,
                      padding: '10px 14px',
                      color: 'var(--text1)',
                      fontSize: 14,
                      outline: 'none',
                      marginBottom: 8,
                    }}
                  />

                  {selectedCustomer && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        background: 'rgba(34,192,122,0.08)',
                        border: '1px solid rgba(34,192,122,0.28)',
                        borderRadius: 9,
                        padding: '10px 14px',
                        marginBottom: 16,
                      }}
                    >
                      <Check size={16} color="var(--green)" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
                          {selectedCustomer.name}
                        </div>
                        {selectedCustomer.email && (
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{selectedCustomer.email}</div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setSelectedCustomer(null)
                          setCustomerQuery('')
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text3)',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {customerResults.length > 0 && !selectedCustomer && (
                    <div
                      style={{
                        background: 'var(--surface2)',
                        borderRadius: 9,
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.08)',
                        marginBottom: 16,
                      }}
                    >
                      {customerResults.map(c => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedCustomer(c)
                            setCustomerQuery(c.name)
                            setCustomerResults([])
                            if (!businessName) setBusinessName(c.business_name || c.name)
                          }}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '10px 14px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            cursor: 'pointer',
                            color: 'var(--text1)',
                            fontSize: 13,
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{c.name}</div>
                          {c.business_name && (
                            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                              {c.business_name}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16 }}>
                    <label
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--text3)',
                        textTransform: 'uppercase' as const,
                        letterSpacing: '0.07em',
                        display: 'block',
                        marginBottom: 10,
                      }}
                    >
                      Or Enter Business Name Directly
                    </label>
                    <input
                      value={businessName}
                      onChange={e => setBusinessName(e.target.value)}
                      placeholder="Business name (required to continue)"
                      style={{
                        width: '100%',
                        boxSizing: 'border-box' as const,
                        background: 'var(--surface2)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 9,
                        padding: '10px 14px',
                        color: 'var(--text1)',
                        fontSize: 14,
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Step 2 — Vehicle */}
              {step === 2 && (
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--text3)',
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.07em',
                      display: 'block',
                      marginBottom: 14,
                    }}
                  >
                    Select Vehicle Type
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {VEHICLE_TYPES.map(v => (
                      <button
                        key={v.id}
                        onClick={() => setVehicleType(v.id)}
                        style={{
                          padding: '18px 14px',
                          borderRadius: 12,
                          textAlign: 'center',
                          background:
                            vehicleType === v.id ? 'rgba(79,127,255,0.12)' : 'var(--surface2)',
                          border: `2px solid ${vehicleType === v.id ? 'var(--accent)' : 'rgba(255,255,255,0.08)'}`,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          display: 'flex',
                          flexDirection: 'column' as const,
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <span style={{ fontSize: 26 }}>{v.emoji}</span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: vehicleType === v.id ? 'var(--accent)' : 'var(--text1)',
                          }}
                        >
                          {v.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3 — Brand */}
              {step === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Colors */}
                  <div>
                    <label
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--text3)',
                        textTransform: 'uppercase' as const,
                        letterSpacing: '0.07em',
                        display: 'block',
                        marginBottom: 10,
                      }}
                    >
                      Brand Colors (up to 4)
                    </label>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      {brandColors.map((c, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                          <input
                            type="color"
                            value={c}
                            onChange={e => {
                              const updated = [...brandColors]
                              updated[i] = e.target.value
                              setBrandColors(updated)
                            }}
                            style={{
                              width: 46,
                              height: 46,
                              borderRadius: 9,
                              border: '2px solid rgba(255,255,255,0.15)',
                              cursor: 'pointer',
                              padding: 2,
                            }}
                          />
                          {brandColors.length > 1 && (
                            <button
                              onClick={() => setBrandColors(prev => prev.filter((_, j) => j !== i))}
                              style={{
                                position: 'absolute',
                                top: -6,
                                right: -6,
                                width: 17,
                                height: 17,
                                borderRadius: '50%',
                                background: 'var(--red)',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#fff',
                                fontSize: 10,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                              }}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                      {brandColors.length < 4 && (
                        <button
                          onClick={() => setBrandColors(prev => [...prev, '#ffffff'])}
                          style={{
                            width: 46,
                            height: 46,
                            borderRadius: 9,
                            border: '2px dashed rgba(255,255,255,0.2)',
                            background: 'transparent',
                            cursor: 'pointer',
                            color: 'var(--text3)',
                            fontSize: 22,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Logo URL */}
                  <div>
                    <label
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--text3)',
                        textTransform: 'uppercase' as const,
                        letterSpacing: '0.07em',
                        display: 'block',
                        marginBottom: 10,
                      }}
                    >
                      Logo URL (optional)
                    </label>
                    <input
                      value={logoUrl}
                      onChange={e => setLogoUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      style={{
                        width: '100%',
                        boxSizing: 'border-box' as const,
                        background: 'var(--surface2)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 9,
                        padding: '10px 14px',
                        color: 'var(--text1)',
                        fontSize: 13,
                        outline: 'none',
                      }}
                    />
                  </div>

                  {/* Style preference */}
                  <div>
                    <label
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--text3)',
                        textTransform: 'uppercase' as const,
                        letterSpacing: '0.07em',
                        display: 'block',
                        marginBottom: 12,
                      }}
                    >
                      Style Preference
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {STYLE_OPTS.map(s => (
                        <button
                          key={s}
                          onClick={() => setStylePreference(s)}
                          style={{
                            padding: '11px 14px',
                            borderRadius: 10,
                            textAlign: 'left',
                            background:
                              stylePreference === s ? 'rgba(79,127,255,0.12)' : 'var(--surface2)',
                            border: `1px solid ${stylePreference === s ? 'var(--accent)' : 'rgba(255,255,255,0.08)'}`,
                            cursor: 'pointer',
                            color: stylePreference === s ? 'var(--accent)' : 'var(--text1)',
                            fontSize: 13,
                            fontWeight: 600,
                            transition: 'all 0.15s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                          }}
                        >
                          {stylePreference === s && (
                            <Check size={14} color="var(--accent)" style={{ flexShrink: 0 }} />
                          )}
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Business name (if not already set) */}
                  <div>
                    <label
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--text3)',
                        textTransform: 'uppercase' as const,
                        letterSpacing: '0.07em',
                        display: 'block',
                        marginBottom: 10,
                      }}
                    >
                      Business Name
                    </label>
                    <input
                      value={businessName}
                      onChange={e => setBusinessName(e.target.value)}
                      placeholder="Your business name"
                      style={{
                        width: '100%',
                        boxSizing: 'border-box' as const,
                        background: 'var(--surface2)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 9,
                        padding: '10px 14px',
                        color: 'var(--text1)',
                        fontSize: 13,
                        outline: 'none',
                      }}
                    />
                  </div>

                  {/* Tagline */}
                  <div>
                    <label
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--text3)',
                        textTransform: 'uppercase' as const,
                        letterSpacing: '0.07em',
                        display: 'block',
                        marginBottom: 10,
                      }}
                    >
                      Tagline (optional)
                    </label>
                    <input
                      value={tagline}
                      onChange={e => setTagline(e.target.value)}
                      placeholder="Your slogan or tagline"
                      style={{
                        width: '100%',
                        boxSizing: 'border-box' as const,
                        background: 'var(--surface2)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 9,
                        padding: '10px 14px',
                        color: 'var(--text1)',
                        fontSize: 13,
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Step 4 — Generate */}
              {step === 4 && (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ fontSize: 52, marginBottom: 16 }}>🎨</div>
                  <h3
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: 'var(--text1)',
                      margin: '0 0 10px',
                    }}
                  >
                    Ready to Generate
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--text3)', margin: '0 0 6px' }}>
                    AI will create 3 unique mockup variations
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text3)', margin: '0 0 24px' }}>
                    {businessName && (
                      <strong style={{ color: 'var(--text2)' }}>{businessName}</strong>
                    )}
                    {vehicleType && ` · ${vehicleType.replace('_', ' ')}`}
                    {stylePreference && ` · ${stylePreference}`}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      justifyContent: 'center',
                      marginBottom: 28,
                    }}
                  >
                    {brandColors.map((c, i) => (
                      <div
                        key={i}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          background: c,
                          border: '2px solid rgba(255,255,255,0.2)',
                        }}
                      />
                    ))}
                  </div>
                  {generating ? (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <RefreshCw
                        size={40}
                        color="var(--accent)"
                        style={{ animation: 'spin 1s linear infinite' }}
                      />
                      <div style={{ fontSize: 14, color: 'var(--text2)', fontWeight: 700 }}>
                        Generating 3 variations...
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                        Claude is crafting your prompt · Replicate is rendering
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        This may take 30–60 seconds
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={generate}
                      disabled={!businessName || !vehicleType || !stylePreference}
                      style={{
                        padding: '14px 36px',
                        borderRadius: 12,
                        border: 'none',
                        background: 'var(--accent)',
                        color: '#fff',
                        fontSize: 15,
                        fontWeight: 800,
                        cursor:
                          !businessName || !vehicleType || !stylePreference
                            ? 'not-allowed'
                            : 'pointer',
                        opacity: !businessName || !vehicleType || !stylePreference ? 0.45 : 1,
                        letterSpacing: '0.02em',
                      }}
                    >
                      Generate Mockups
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Footer nav */}
            {step < 4 && !generating && (
              <div
                style={{
                  padding: '14px 20px',
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  flexShrink: 0,
                }}
              >
                <button
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canAdvance}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'var(--accent)',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: canAdvance ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    opacity: canAdvance ? 1 : 0.4,
                  }}
                >
                  Continue <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </>
  )
}

// ── Card ────────────────────────────────────────────────────────────────────

function MockupCard({ mockup }: { mockup: DesignMockup }) {
  const status = getStatus(mockup)
  const cfg = STATUS_CONFIG[status]
  const firstImg = Array.isArray(mockup.mockup_urls) && mockup.mockup_urls.length > 0
    ? mockup.mockup_urls[0]
    : null
  const customerName = (mockup.customer as any)?.name || mockup.business_name || '—'

  return (
    <Link href={`/design/mockups/${mockup.id}`} style={{ textDecoration: 'none' }}>
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12,
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'border-color 0.2s',
        }}
        onMouseEnter={e => {
          ;(e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(79,127,255,0.4)'
        }}
        onMouseLeave={e => {
          ;(e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)'
        }}
      >
        {/* Thumbnail */}
        <div
          style={{
            height: 158,
            background: 'var(--surface2)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {firstImg ? (
            <img
              src={firstImg}
              alt="Mockup preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--text3)',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 32 }}>🎨</span>
              <span style={{ fontSize: 11 }}>
                {status === 'pending' ? 'Pending generation' : 'No image yet'}
              </span>
            </div>
          )}
          {/* Status pill */}
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: cfg.bg,
              color: cfg.color,
              fontSize: 9,
              fontWeight: 800,
              padding: '3px 9px',
              borderRadius: 20,
              letterSpacing: '0.05em',
              backdropFilter: 'blur(6px)',
            }}
          >
            {cfg.label.toUpperCase()}
          </div>
        </div>

        {/* Info */}
        <div style={{ padding: '11px 13px' }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--text1)',
              marginBottom: 3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {customerName}
          </div>
          {mockup.business_name && mockup.business_name !== customerName && (
            <div
              style={{
                fontSize: 11,
                color: 'var(--text3)',
                marginBottom: 4,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {mockup.business_name}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {mockup.vehicle_type && (
              <span style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'capitalize' as const }}>
                {mockup.vehicle_type.replace('_', ' ')}
              </span>
            )}
            {mockup.style_preference && (
              <span style={{ fontSize: 10, color: 'var(--text3)' }}>· {mockup.style_preference}</span>
            )}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 6 }}>
            {new Date(mockup.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>
    </Link>
  )
}

// ── List view ───────────────────────────────────────────────────────────────

function MockupListView({ mockups }: { mockups: DesignMockup[] }) {
  return (
    <div
      style={{
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '56px 1fr 1fr 110px 90px 24px',
          gap: 12,
          padding: '9px 16px',
          background: 'var(--surface2)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--text3)',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.07em',
        }}
      >
        <span>Image</span>
        <span>Customer</span>
        <span>Vehicle</span>
        <span>Status</span>
        <span>Date</span>
        <span />
      </div>

      {mockups.map((m, i) => {
        const status = getStatus(m)
        const cfg = STATUS_CONFIG[status]
        const firstImg = Array.isArray(m.mockup_urls) && m.mockup_urls.length > 0
          ? m.mockup_urls[0]
          : null

        return (
          <Link
            key={m.id}
            href={`/design/mockups/${m.id}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '56px 1fr 1fr 110px 90px 24px',
              gap: 12,
              padding: '11px 16px',
              textDecoration: 'none',
              alignItems: 'center',
              background: i % 2 === 0 ? 'var(--surface)' : 'rgba(26,29,39,0.5)',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              transition: 'background 0.15s',
            }}
          >
            <div
              style={{
                width: 48,
                height: 36,
                borderRadius: 6,
                overflow: 'hidden',
                background: 'var(--surface2)',
                flexShrink: 0,
              }}
            >
              {firstImg && (
                <img
                  src={firstImg}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text1)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {(m.customer as any)?.name || m.business_name || '—'}
              </div>
              {m.business_name && (
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--text3)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {m.business_name}
                </div>
              )}
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--text2)',
                textTransform: 'capitalize' as const,
              }}
            >
              {m.vehicle_type?.replace('_', ' ') || '—'}
            </div>
            <div>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  padding: '3px 9px',
                  borderRadius: 20,
                  background: cfg.bg,
                  color: cfg.color,
                  letterSpacing: '0.05em',
                }}
              >
                {cfg.label.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              {new Date(m.created_at).toLocaleDateString()}
            </div>
            <ChevronRight size={14} color="var(--text3)" />
          </Link>
        )
      })}
    </div>
  )
}
