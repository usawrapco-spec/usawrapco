'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import FunnelShell from '@/components/funnel/FunnelShell'
import { setFunnel, getFunnel } from '@/lib/funnelState'

function VehicleImage({ make, model, year }: { make: string; model: string; year: number }) {
  const [errored, setErrored] = useState(false)
  const src = `https://cdn.imagin.studio/getimage?customer=hrjavascript-masede&make=${encodeURIComponent(make)}&modelFamily=${encodeURIComponent(model)}&modelYear=${year}&angle=01`

  if (errored) {
    return (
      <svg width="100%" height="100" viewBox="0 0 200 80" fill="none" style={{ opacity: 0.3 }}>
        <rect x="20" y="40" width="160" height="30" rx="8" fill="#4f7fff"/>
        <rect x="40" y="20" width="120" height="35" rx="10" fill="#4f7fff"/>
        <circle cx="55" cy="72" r="12" fill="#1a1d27" stroke="#4f7fff" strokeWidth="3"/>
        <circle cx="145" cy="72" r="12" fill="#1a1d27" stroke="#4f7fff" strokeWidth="3"/>
      </svg>
    )
  }
  return (
    <img src={src} alt={`${year} ${make} ${model}`} style={{ maxWidth: '100%', maxHeight: 100, objectFit: 'contain' }} onError={() => setErrored(true)} />
  )
}

export default function ModelPage() {
  const router = useRouter()
  const [models, setModels] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [funnel, setFunnelState] = useState<ReturnType<typeof getFunnel>>({})

  useEffect(() => {
    const f = getFunnel()
    setFunnelState(f)
    if (!f.vehicleMake || !f.vehicleYear) { router.push('/get-started/brand'); return }
    fetch(`/api/vehicles/models?make=${encodeURIComponent(f.vehicleMake)}&year=${f.vehicleYear}`)
      .then(r => r.json())
      .then(d => { setModels(d.models || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = models.filter(m => m.toLowerCase().includes(query.toLowerCase()))

  function handleSelect(model: string) {
    setFunnel({ vehicleModel: model })
    router.push('/get-started/coverage')
  }

  return (
    <FunnelShell step={5} backHref="/get-started/year">
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 700, color: '#e8eaed', margin: '0 0 8px' }}>
          What model?
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} style={{ color: '#9299b5', fontSize: 15 }}>
          {funnel.vehicleYear} {funnel.vehicleMake}
        </motion.p>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#5a6080', pointerEvents: 'none' }} />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search models..." style={{ width: '100%', padding: '12px 14px 12px 40px', background: '#13151c', border: '1px solid #1a1d27', borderRadius: 12, color: '#e8eaed', fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: '#5a6080' }}>Loading models...</div>
      )}

      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {filtered.map((model, i) => (
            <motion.button
              key={model}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.3) }}
              whileHover={{ scale: 1.02, borderColor: '#4f7fff' }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleSelect(model)}
              style={{
                background: '#13151c',
                border: '1px solid #1a1d27',
                borderRadius: 14,
                padding: '16px 12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.15s',
              }}
            >
              {funnel.vehicleMake && funnel.vehicleYear && (
                <VehicleImage make={funnel.vehicleMake} model={model} year={funnel.vehicleYear} />
              )}
              <span style={{ fontSize: 13, color: '#e8eaed', fontWeight: 600, textAlign: 'center' }}>{model}</span>
            </motion.button>
          ))}
          {filtered.length === 0 && !loading && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#5a6080', padding: 32 }}>No models found. Try a different search.</div>
          )}
        </div>
      )}
    </FunnelShell>
  )
}
