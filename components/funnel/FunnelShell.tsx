'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

const STEPS = [
  '/get-started',
  '/get-started/purpose',
  '/get-started/brand',
  '/get-started/year',
  '/get-started/model',
  '/get-started/coverage',
  '/get-started/info',
  '/get-started/checkout',
  '/get-started/confirmed',
]

interface FunnelShellProps {
  step: number // 1-9
  children: React.ReactNode
  backHref?: string | null
}

export default function FunnelShell({ step, children, backHref }: FunnelShellProps) {
  const router = useRouter()
  const progress = ((step - 1) / (STEPS.length - 1)) * 100

  return (
    <div style={{ minHeight: '100vh', background: '#0d0f14', display: 'flex', flexDirection: 'column' }}>
      {/* Progress bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: 3, background: '#1a1d27' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          style={{ height: '100%', background: 'linear-gradient(90deg, #4f7fff, #22d3ee)', borderRadius: 2 }}
        />
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0', maxWidth: 800, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {backHref !== null && step > 1 ? (
          <button
            onClick={() => backHref ? router.push(backHref) : router.back()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9299b5', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '8px 0' }}
          >
            <ChevronLeft size={18} />
            Back
          </button>
        ) : (
          <div />
        )}
        <div style={{ fontSize: 13, color: '#5a6080' }}>
          {step} of 9
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px 48px', maxWidth: 800, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            style={{ width: '100%' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
