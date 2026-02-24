'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { CreditCard, Calendar, CheckCircle, Car } from 'lucide-react'
import FunnelShell from '@/components/funnel/FunnelShell'
import { setFunnel, getFunnel } from '@/lib/funnelState'
import { ADDON_LABELS } from '@/lib/vehicleSizes'

const COVERAGE_LABELS: Record<string, string> = {
  full_wrap: 'Full Wrap',
  partial_wrap: 'Partial Wrap',
  spot_graphics: 'Spot Graphics',
  color_change: 'Color Change',
  chrome_delete: 'Chrome Delete',
}

const TIMELINE = [
  { label: '$250 deposit today', desc: 'Secures your slot and design consultation', color: '#22c07a' },
  { label: '50% after design approval', desc: 'Paid once you approve final design proof', color: '#4f7fff' },
  { label: 'Balance after installation', desc: 'Final payment when your wrap is complete', color: '#8b5cf6' },
]

export default function CheckoutPage() {
  const router = useRouter()
  const [funnel, setFunnelState] = useState<ReturnType<typeof getFunnel>>({})
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    setFunnelState(getFunnel())
  }, [])

  async function handlePay() {
    setLoading(true)

    // Save lead first
    let leadId = funnel.leadId
    if (!leadId) {
      try {
        const res = await fetch('/api/onboarding/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: funnel.fullName,
            email: funnel.email,
            phone: funnel.phone,
            business_name: funnel.businessName,
            project_type: funnel.projectType,
            purpose: funnel.purpose,
            vehicle_year: funnel.vehicleYear,
            vehicle_make: funnel.vehicleMake,
            vehicle_model: funnel.vehicleModel,
            vehicle_vin: funnel.vehicleVin,
            coverage_type: funnel.coverageType,
            addons: funnel.addons,
            total_price: funnel.totalPrice,
            design_notes: funnel.designNotes,
            logo_url: funnel.logoUrl,
            referral_source: funnel.referralSource,
          }),
        })
        const data = await res.json()
        leadId = data.id
        if (leadId) setFunnel({ leadId })
      } catch {
        // continue anyway
      }
    }

    // Try Stripe checkout
    try {
      const res = await fetch('/api/onboarding/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          email: funnel.email,
          vehicle_year: funnel.vehicleYear,
          vehicle_make: funnel.vehicleMake,
          vehicle_model: funnel.vehicleModel,
          coverage_type: funnel.coverageType,
        }),
      })
      const data = await res.json()
      if (data.noStripe) {
        // No Stripe — go straight to confirmed
        router.push('/get-started/confirmed')
        return
      }
      if (data.url) {
        window.location.href = data.url
        return
      }
    } catch {
      // fallback
    }

    // Fallback: go to confirmed without payment
    router.push('/get-started/confirmed')
    setLoading(false)
  }

  async function handleNoPayment() {
    setLoading(true)
    try {
      await fetch('/api/onboarding/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: funnel.fullName,
          email: funnel.email,
          phone: funnel.phone,
          business_name: funnel.businessName,
          project_type: funnel.projectType,
          purpose: funnel.purpose,
          vehicle_year: funnel.vehicleYear,
          vehicle_make: funnel.vehicleMake,
          vehicle_model: funnel.vehicleModel,
          vehicle_vin: funnel.vehicleVin,
          coverage_type: funnel.coverageType,
          addons: funnel.addons,
          total_price: funnel.totalPrice,
          design_notes: funnel.designNotes,
          logo_url: funnel.logoUrl,
          referral_source: funnel.referralSource,
        }),
      })
    } catch {
      // non-fatal
    }
    router.push('/get-started/confirmed')
  }

  const addons = funnel.addons || []
  const addonTotal = addons.reduce((s: number, a: string) => {
    const ADDON_PRICES: Record<string, number> = { roof: 400, window_perf: 300, door_handles: 150, mirrors: 100 }
    return s + (ADDON_PRICES[a] || 0)
  }, 0)
  const basePrice = (funnel.totalPrice || 0) - addonTotal

  return (
    <FunnelShell step={8} backHref="/get-started/info">
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ fontSize: 'clamp(22px, 5vw, 34px)', fontWeight: 700, color: '#e8eaed', margin: '0 0 8px' }}>
          Review your quote
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} style={{ color: '#9299b5', fontSize: 14 }}>
          Everything looks good? Lock in your spot with a $250 deposit.
        </motion.p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 520, margin: '0 auto' }}>
        {/* Summary card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ background: '#13151c', border: '1px solid #1a1d27', borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ background: '#4f7fff22', borderRadius: 10, padding: 10 }}>
              <Car size={20} color="#4f7fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#e8eaed', fontSize: 16 }}>
                {funnel.vehicleYear} {funnel.vehicleMake} {funnel.vehicleModel}
              </div>
              <div style={{ color: '#9299b5', fontSize: 13 }}>{funnel.purpose === 'business' ? 'Business' : 'Personal'}</div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #1a1d27', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9299b5', fontSize: 14 }}>{COVERAGE_LABELS[funnel.coverageType || ''] || funnel.coverageType}</span>
              <span style={{ color: '#e8eaed', fontWeight: 600 }}>${basePrice.toLocaleString()}</span>
            </div>
            {addons.map((a: string) => {
              const ADDON_PRICES: Record<string, number> = { roof: 400, window_perf: 300, door_handles: 150, mirrors: 100 }
              return (
                <div key={a} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#9299b5', fontSize: 14 }}>{ADDON_LABELS[a] || a}</span>
                  <span style={{ color: '#e8eaed', fontWeight: 600 }}>+${ADDON_PRICES[a] || 0}</span>
                </div>
              )
            })}
            <div style={{ borderTop: '1px solid #1a1d27', paddingTop: 10, display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontWeight: 700, color: '#e8eaed' }}>Total Estimate</span>
              <span style={{ fontWeight: 700, color: '#22c07a', fontSize: 20 }}>${(funnel.totalPrice || 0).toLocaleString()}</span>
            </div>
          </div>
        </motion.div>

        {/* Contact summary */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={{ background: '#13151c', border: '1px solid #1a1d27', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ color: '#9299b5', fontSize: 13 }}>{funnel.fullName} &mdash; {funnel.email} &mdash; {funnel.phone}</div>
          {funnel.businessName && <div style={{ color: '#9299b5', fontSize: 13 }}>{funnel.businessName}</div>}
        </motion.div>

        {/* Payment timeline */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ background: '#13151c', border: '1px solid #1a1d27', borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#9299b5', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={14} /> Payment Timeline
          </div>
          {TIMELINE.map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: i < 2 ? 14 : 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.color, flexShrink: 0, marginTop: 4 }} />
                {i < 2 && <div style={{ width: 1, height: 20, background: '#1a1d27' }} />}
              </div>
              <div>
                <div style={{ fontWeight: 600, color: '#e8eaed', fontSize: 14 }}>{t.label}</div>
                <div style={{ color: '#9299b5', fontSize: 12, marginTop: 2 }}>{t.desc}</div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={handlePay}
          disabled={loading}
          style={{
            width: '100%',
            padding: '18px',
            background: 'linear-gradient(135deg, #22c07a, #4f7fff)',
            border: 'none',
            borderRadius: 14,
            color: '#fff',
            fontWeight: 700,
            fontSize: 17,
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.8 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            transition: 'all 0.2s',
          }}
        >
          <CreditCard size={18} />
          {loading ? 'Processing...' : 'Pay $250 Deposit'}
        </motion.button>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          onClick={handleNoPayment}
          disabled={loading}
          style={{ background: 'none', border: 'none', color: '#9299b5', cursor: 'pointer', fontSize: 14, padding: '8px', textDecoration: 'underline', textDecorationColor: '#5a6080' }}
        >
          Skip deposit — we will contact you instead
        </motion.button>
      </div>
    </FunnelShell>
  )
}
