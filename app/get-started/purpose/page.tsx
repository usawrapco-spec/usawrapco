'use client'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Briefcase, User } from 'lucide-react'
import FunnelShell from '@/components/funnel/FunnelShell'
import { setFunnel } from '@/lib/funnelState'

const OPTIONS = [
  {
    id: 'business',
    label: 'Business',
    sub: 'Advertise your brand, fleet graphics, commercial use',
    icon: Briefcase,
    color: '#4f7fff',
  },
  {
    id: 'personal',
    label: 'Personal',
    sub: 'Color change, custom design, protection',
    icon: User,
    color: '#22c07a',
  },
]

export default function PurposePage() {
  const router = useRouter()

  function handleSelect(id: string) {
    setFunnel({ purpose: id })
    router.push('/get-started/brand')
  }

  return (
    <FunnelShell step={2} backHref="/get-started">
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ fontSize: 'clamp(26px, 5vw, 38px)', fontWeight: 700, color: '#e8eaed', margin: '0 0 12px' }}
        >
          Business or Personal?
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} style={{ color: '#9299b5', fontSize: 16 }}>
          This helps us tailor your quote.
        </motion.p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, maxWidth: 520, margin: '0 auto' }}>
        {OPTIONS.map((opt, i) => {
          const Icon = opt.icon
          return (
            <motion.button
              key={opt.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSelect(opt.id)}
              style={{
                background: '#13151c',
                border: `1px solid #1a1d27`,
                borderRadius: 20,
                padding: '36px 24px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
                color: '#e8eaed',
                transition: 'all 0.2s',
                textAlign: 'center',
              }}
            >
              <div style={{ background: `${opt.color}22`, borderRadius: 16, padding: 18 }}>
                <Icon size={36} color={opt.color} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 8 }}>{opt.label}</div>
                <div style={{ fontSize: 13, color: '#9299b5', lineHeight: 1.5 }}>{opt.sub}</div>
              </div>
            </motion.button>
          )
        })}
      </div>
    </FunnelShell>
  )
}
