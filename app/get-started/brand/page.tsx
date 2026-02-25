'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Search, Hash } from 'lucide-react'
import FunnelShell from '@/components/funnel/FunnelShell'
import { setFunnel } from '@/lib/funnelState'
import { VEHICLE_BRANDS } from '@/lib/vehicleBrands'

export default function BrandPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [vin, setVin] = useState('')
  const [vinLoading, setVinLoading] = useState(false)
  const [vinError, setVinError] = useState('')
  const [showVin, setShowVin] = useState(false)

  const filtered = VEHICLE_BRANDS.filter(b =>
    b.name.toLowerCase().includes(query.toLowerCase())
  )

  function handleSelect(name: string) {
    setFunnel({ vehicleMake: name })
    router.push('/get-started/year')
  }

  async function handleVinDecode() {
    if (vin.trim().length < 10) return
    setVinLoading(true)
    setVinError('')
    try {
      const res = await fetch(`/api/vehicles/decode-vin?vin=${encodeURIComponent(vin.trim())}`)
      const data = await res.json()
      if (data.error) { setVinError('Could not decode VIN — try entering manually.'); setVinLoading(false); return }
      setFunnel({ vehicleMake: data.make, vehicleModel: data.model, vehicleYear: data.year || undefined, vehicleVin: vin.trim() })
      router.push('/get-started/coverage')
    } catch {
      setVinError('VIN decode failed — try entering manually.')
    }
    setVinLoading(false)
  }

  return (
    <FunnelShell step={3} backHref="/get-started/purpose">
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 700, color: '#e8eaed', margin: '0 0 12px' }}>
          Select your vehicle brand
        </motion.h1>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#5a6080', pointerEvents: 'none' }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search brands..."
          style={{ width: '100%', padding: '12px 14px 12px 40px', background: '#13151c', border: '1px solid #1a1d27', borderRadius: 12, color: '#e8eaed', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      {/* VIN toggle */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <button
          onClick={() => setShowVin(v => !v)}
          style={{ background: 'none', border: 'none', color: '#4f7fff', cursor: 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <Hash size={14} /> Know your VIN? Decode it automatically
        </button>
        {showVin && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} style={{ marginTop: 12, display: 'flex', gap: 8, maxWidth: 420, margin: '12px auto 0' }}>
            <input
              value={vin}
              onChange={e => setVin(e.target.value.toUpperCase())}
              placeholder="Enter 17-digit VIN"
              maxLength={17}
              style={{ flex: 1, padding: '10px 14px', background: '#13151c', border: '1px solid #1a1d27', borderRadius: 10, color: '#e8eaed', fontSize: 14, outline: 'none', letterSpacing: '0.05em' }}
            />
            <button
              onClick={handleVinDecode}
              disabled={vinLoading || vin.length < 10}
              style={{ padding: '10px 18px', background: '#4f7fff', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14, opacity: (vinLoading || vin.length < 10) ? 0.5 : 1 }}
            >
              {vinLoading ? '...' : 'Decode'}
            </button>
          </motion.div>
        )}
        {vinError && <div style={{ color: '#f25a5a', fontSize: 12, marginTop: 8 }}>{vinError}</div>}
      </div>

      {/* Brand grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
        {filtered.map((brand, i) => (
          <motion.button
            key={brand.name}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(i * 0.02, 0.3) }}
            whileHover={{ scale: 1.05, borderColor: '#4f7fff' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSelect(brand.name)}
            style={{
              background: '#13151c',
              border: '1px solid #1a1d27',
              borderRadius: 14,
              padding: '16px 8px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s',
            }}
          >
            {brand.logo ? (
              <img
                src={brand.logo}
                alt={brand.name}
                style={{ width: 40, height: 40, objectFit: 'contain' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <div style={{ width: 40, height: 40, background: '#1a1d27', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#5a6080' }}>?</div>
            )}
            <span style={{ fontSize: 11, color: '#9299b5', textAlign: 'center', lineHeight: 1.2 }}>{brand.name}</span>
          </motion.button>
        ))}
      </div>
    </FunnelShell>
  )
}
