'use client'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import FunnelShell from '@/components/funnel/FunnelShell'
import { setFunnel, getFunnel } from '@/lib/funnelState'

const YEARS: number[] = []
for (let y = 2026; y >= 2000; y--) YEARS.push(y)

export default function YearPage() {
  const router = useRouter()
  const funnel = typeof window !== 'undefined' ? getFunnel() : {}

  function handleSelect(year: number) {
    setFunnel({ vehicleYear: year })
    router.push('/get-started/model')
  }

  return (
    <FunnelShell step={4} backHref="/get-started/brand">
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 700, color: '#e8eaed', margin: '0 0 8px' }}>
          What year?
        </motion.h1>
        {funnel.vehicleMake && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} style={{ color: '#9299b5', fontSize: 15 }}>
            {funnel.vehicleMake}
          </motion.p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8 }}>
        {YEARS.map((year, i) => (
          <motion.button
            key={year}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: Math.min(i * 0.01, 0.4) }}
            whileHover={{ scale: 1.05, background: '#4f7fff', color: '#fff' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSelect(year)}
            style={{
              background: '#13151c',
              border: '1px solid #1a1d27',
              borderRadius: 10,
              padding: '12px 4px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 15,
              color: '#e8eaed',
              transition: 'all 0.15s',
            }}
          >
            {year}
          </motion.button>
        ))}
      </div>
    </FunnelShell>
  )
}
