'use client'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Car, Truck, Ship, Package, Users } from 'lucide-react'
import FunnelShell from '@/components/funnel/FunnelShell'
import { setFunnel } from '@/lib/funnelState'

const OPTIONS = [
  { id: 'vehicle', label: 'Vehicle', sub: 'Car, truck, SUV', icon: Car },
  { id: 'fleet', label: 'Fleet', sub: 'Multiple vehicles', icon: Users },
  { id: 'trailer', label: 'Trailer', sub: 'Box, flatbed, utility', icon: Truck },
  { id: 'boat', label: 'Boat', sub: 'Marine craft', icon: Ship },
  { id: 'other', label: 'Something Else', sub: 'ATV, golf cart, etc.', icon: Package },
]

export default function GetStartedPage() {
  const router = useRouter()

  function handleSelect(id: string) {
    setFunnel({ projectType: id })
    if (id === 'fleet' || id === 'other') {
      router.push('/get-started/info')
    } else {
      router.push('/get-started/purpose')
    }
  }

  return (
    <FunnelShell step={1} backHref={null}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          style={{ display: 'inline-block', background: 'linear-gradient(135deg, #4f7fff22, #22d3ee22)', border: '1px solid #4f7fff44', borderRadius: 16, padding: '12px 20px', marginBottom: 24 }}
        >
          <span style={{ fontSize: 13, color: '#4f7fff', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Get a Quote</span>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{ fontSize: 'clamp(28px, 6vw, 42px)', fontWeight: 700, color: '#e8eaed', margin: '0 0 12px', lineHeight: 1.1 }}
        >
          What would you like to wrap?
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{ color: '#9299b5', fontSize: 16, margin: 0 }}
        >
          Get an instant price estimate in under 2 minutes.
        </motion.p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        {OPTIONS.map((opt, i) => {
          const Icon = opt.icon
          return (
            <motion.button
              key={opt.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06 }}
              whileHover={{ scale: 1.03, borderColor: '#4f7fff' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSelect(opt.id)}
              style={{
                background: '#13151c',
                border: '1px solid #1a1d27',
                borderRadius: 16,
                padding: '28px 16px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
                color: '#e8eaed',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ background: '#1a1d27', borderRadius: 12, padding: 14 }}>
                <Icon size={28} color="#4f7fff" />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{opt.label}</div>
                <div style={{ fontSize: 12, color: '#9299b5', marginTop: 3 }}>{opt.sub}</div>
              </div>
            </motion.button>
          )
        })}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{ textAlign: 'center', marginTop: 32, color: '#5a6080', fontSize: 13 }}
      >
        No commitment required — just exploring? We'll give you a ballpark.
      </motion.div>
    </FunnelShell>
  )
}
