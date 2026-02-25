'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Check, Zap } from 'lucide-react'
import FunnelShell from '@/components/funnel/FunnelShell'
import { setFunnel, getFunnel } from '@/lib/funnelState'
import { getVehicleSize, PRICING_BY_SIZE, ADDON_PRICES, ADDON_LABELS, SIZE_LABELS } from '@/lib/vehicleSizes'

const COVERAGE_OPTIONS = [
  { id: 'full_wrap', label: 'Full Wrap', sub: 'Complete vehicle coverage', badge: 'Most Popular' },
  { id: 'partial_wrap', label: 'Partial Wrap', sub: 'Doors, hood, or rear', badge: null },
  { id: 'spot_graphics', label: 'Spot Graphics', sub: 'Logos, decals, accents', badge: null },
  { id: 'color_change', label: 'Color Change', sub: 'Full color transformation', badge: null },
  { id: 'chrome_delete', label: 'Chrome Delete', sub: 'Remove all chrome trim', badge: 'Flat $625' },
]

function VehiclePreview({ make, model, year }: { make: string; model: string; year: number }) {
  const [err, setErr] = useState(false)
  const src = `https://cdn.imagin.studio/getimage?customer=hrjavascript-masede&make=${encodeURIComponent(make)}&modelFamily=${encodeURIComponent(model)}&modelYear=${year}&angle=01`
  if (err) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120 }}>
      <svg width="200" height="80" viewBox="0 0 200 80" fill="none" style={{ opacity: 0.25 }}>
        <rect x="20" y="40" width="160" height="30" rx="8" fill="#4f7fff"/>
        <rect x="40" y="20" width="120" height="35" rx="10" fill="#4f7fff"/>
        <circle cx="55" cy="72" r="12" fill="#0d0f14" stroke="#4f7fff" strokeWidth="3"/>
        <circle cx="145" cy="72" r="12" fill="#0d0f14" stroke="#4f7fff" strokeWidth="3"/>
      </svg>
    </div>
  )
  return <img src={src} alt={`${year} ${make} ${model}`} style={{ maxWidth: '100%', maxHeight: 140, objectFit: 'contain', display: 'block', margin: '0 auto' }} onError={() => setErr(true)} />
}

export default function CoveragePage() {
  const router = useRouter()
  const [funnel, setFunnelState] = useState<ReturnType<typeof getFunnel>>({})
  const [selected, setSelected] = useState('')
  const [addons, setAddons] = useState<string[]>([])
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const f = getFunnel()
    setFunnelState(f)
    if (f.coverageType) setSelected(f.coverageType)
    if (f.addons) setAddons(f.addons)
  }, [])

  const size = funnel.vehicleMake && funnel.vehicleModel ? getVehicleSize(funnel.vehicleMake, funnel.vehicleModel) : 'mid'
  const pricing = PRICING_BY_SIZE[size]

  function getBasePrice(coverageId: string) {
    if (!pricing) return 0
    switch (coverageId) {
      case 'full_wrap': return pricing.fullWrap
      case 'partial_wrap': return pricing.partialWrap
      case 'spot_graphics': return pricing.spotGraphics
      case 'color_change': return pricing.colorChange
      case 'chrome_delete': return pricing.chromeDelete
      default: return 0
    }
  }

  useEffect(() => {
    if (!selected) { setTotal(0); return }
    const base = getBasePrice(selected)
    const addonSum = addons.reduce((s, a) => s + (ADDON_PRICES[a] || 0), 0)
    setTotal(base + addonSum)
  }, [selected, addons, size])

  function toggleAddon(id: string) {
    setAddons(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])
  }

  function handleContinue() {
    if (!selected) return
    setFunnel({ coverageType: selected, addons, totalPrice: total, vehicleSize: size })
    router.push('/get-started/info')
  }

  const monthlyApprox = total > 0 ? Math.round(total / 24) : 0

  return (
    <FunnelShell step={6} backHref="/get-started/model">
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ fontSize: 'clamp(22px, 5vw, 34px)', fontWeight: 700, color: '#e8eaed', margin: '0 0 8px' }}>
          Choose your wrap coverage
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} style={{ color: '#9299b5', fontSize: 14 }}>
          {funnel.vehicleYear} {funnel.vehicleMake} {funnel.vehicleModel} &mdash; <span style={{ color: '#4f7fff' }}>{SIZE_LABELS[size]}</span>
        </motion.p>
      </div>

      {funnel.vehicleMake && funnel.vehicleModel && funnel.vehicleYear && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} style={{ marginBottom: 24, background: '#13151c', borderRadius: 16, padding: 16 }}>
          <VehiclePreview make={funnel.vehicleMake} model={funnel.vehicleModel} year={funnel.vehicleYear} />
        </motion.div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {COVERAGE_OPTIONS.map((opt, i) => {
          const price = getBasePrice(opt.id)
          const isSelected = selected === opt.id
          return (
            <motion.button
              key={opt.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.06 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelected(opt.id)}
              style={{
                background: isSelected ? '#4f7fff15' : '#13151c',
                border: `2px solid ${isSelected ? '#4f7fff' : '#1a1d27'}`,
                borderRadius: 14,
                padding: '16px 18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                transition: 'all 0.15s',
                textAlign: 'left',
              }}
            >
              <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${isSelected ? '#4f7fff' : '#5a6080'}`, background: isSelected ? '#4f7fff' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {isSelected && <Check size={12} color="#fff" />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600, color: '#e8eaed', fontSize: 15 }}>{opt.label}</span>
                  {opt.badge && (
                    <span style={{ background: '#4f7fff22', color: '#4f7fff', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, letterSpacing: '0.04em' }}>{opt.badge}</span>
                  )}
                </div>
                <div style={{ color: '#9299b5', fontSize: 12, marginTop: 2 }}>{opt.sub}</div>
              </div>
              <div style={{ fontWeight: 700, color: '#22c07a', fontSize: 16, flexShrink: 0 }}>
                ${price.toLocaleString()}
              </div>
            </motion.button>
          )
        })}
      </div>

      {selected && selected !== 'chrome_delete' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#9299b5', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Add-ons</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {Object.entries(ADDON_LABELS).map(([id, label]) => {
              const active = addons.includes(id)
              return (
                <button
                  key={id}
                  onClick={() => toggleAddon(id)}
                  style={{
                    background: active ? '#22c07a15' : '#13151c',
                    border: `1px solid ${active ? '#22c07a' : '#1a1d27'}`,
                    borderRadius: 10,
                    padding: '10px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 13, color: active ? '#22c07a' : '#9299b5' }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: active ? '#22c07a' : '#5a6080' }}>+${ADDON_PRICES[id]}</span>
                </button>
              )
            })}
          </div>
        </motion.div>
      )}

      {selected && total > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ background: '#13151c', border: '1px solid #1a1d27', borderRadius: 16, padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 12, color: '#5a6080', marginBottom: 4 }}>ESTIMATED TOTAL</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#e8eaed' }}>${total.toLocaleString()}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <Zap size={12} color="#f59e0b" />
                <span style={{ fontSize: 12, color: '#f59e0b' }}>As low as ${monthlyApprox}/mo with financing</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: '#5a6080' }}>Deposit today</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#22c07a' }}>$250</div>
            </div>
          </div>
        </motion.div>
      )}

      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleContinue}
        disabled={!selected}
        style={{
          width: '100%',
          padding: '16px',
          background: selected ? 'linear-gradient(135deg, #4f7fff, #22d3ee)' : '#1a1d27',
          border: 'none',
          borderRadius: 14,
          color: selected ? '#fff' : '#5a6080',
          fontWeight: 700,
          fontSize: 16,
          cursor: selected ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s',
        }}
      >
        Continue to Contact Info
      </motion.button>
    </FunnelShell>
  )
}
