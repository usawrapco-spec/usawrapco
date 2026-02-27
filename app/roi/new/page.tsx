'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ROICalculator from '@/components/roi/ROICalculator'
import RouteMapper from '@/components/roi/RouteMapper'
import QRGenerator from '@/components/roi/QRGenerator'

type Step = 1 | 2 | 3

const STEP_LABELS = ['ROI Calculator', 'Route Mapper', 'Tracking Setup']

export default function NewCampaignPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [step, setStep] = useState<Step>(1)
  const [creating, setCreating] = useState(false)
  const [calcData, setCalcData] = useState<any>(null)
  const [impressionEstimate, setImpressionEstimate] = useState<number | undefined>()
  const [campaignId, setCampaignId] = useState('')
  const [campaignSlug, setCampaignSlug] = useState('')
  const [vehicleLabel, setVehicleLabel] = useState('')

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return
      if (!user) { router.push('/login'); return }
      setAuthChecked(true)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!authChecked) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    )
  }

  // Step 1 complete
  const handleCalcComplete = async (data: any) => {
    setCalcData(data)
    // Create campaign record
    setCreating(true)
    try {
      const label = vehicleLabel || 'Vehicle 1'
      const res = await fetch('/api/roi/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_label: label,
          industry: data.industry,
          avg_ltv: data.avgLtv,
          investment_amount: data.investmentAmount,
        }),
      })
      const result = await res.json()
      if (result.campaign) {
        setCampaignId(result.campaign.id)
        setCampaignSlug(result.campaign.qr_slug)
      }
    } catch (err) {
      console.error('Failed to create campaign:', err)
    } finally {
      setCreating(false)
    }
    setStep(2)
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link
          href="/roi/dashboard"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'var(--surface2)',
            color: 'var(--text2)',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 style={{
            fontSize: 24,
            fontWeight: 900,
            fontFamily: 'Barlow Condensed, sans-serif',
            color: 'var(--text1)',
            margin: 0,
          }}>
            New Campaign
          </h1>
        </div>
      </div>

      {/* Step Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
        {STEP_LABELS.map((label, i) => {
          const stepNum = (i + 1) as Step
          const isActive = step === stepNum
          const isDone = step > stepNum

          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                background: isActive ? 'rgba(79,127,255,0.1)' : isDone ? 'rgba(34,192,122,0.08)' : 'var(--surface2)',
                border: `1px solid ${isActive ? 'var(--accent)' : isDone ? 'var(--green)' : 'var(--border)'}`,
              }}>
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  background: isDone ? 'var(--green)' : isActive ? 'var(--accent)' : 'var(--surface)',
                  color: isDone || isActive ? '#fff' : 'var(--text3)',
                }}>
                  {isDone ? <Check size={11} /> : stepNum}
                </div>
                <span style={{
                  fontSize: 12,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--accent)' : isDone ? 'var(--green)' : 'var(--text3)',
                }}>
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <ArrowRight size={14} style={{ color: 'var(--text3)' }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Vehicle label input (shown on step 1) */}
      {step === 1 && (
        <div style={{ marginBottom: 20 }}>
          <label style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text2)',
            marginBottom: 6,
          }}>
            Vehicle / Wrap Label
          </label>
          <input
            value={vehicleLabel}
            onChange={e => setVehicleLabel(e.target.value)}
            placeholder="e.g. VAN-001 | 2022 Ford Transit"
            style={{
              width: '100%',
              maxWidth: 400,
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface2)',
              color: 'var(--text1)',
              fontSize: 14,
              outline: 'none',
            }}
          />
        </div>
      )}

      {/* Step Content */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: 24,
      }}>
        {creating && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
            <span style={{ marginLeft: 10, color: 'var(--text2)' }}>Creating campaign...</span>
          </div>
        )}

        {!creating && step === 1 && (
          <ROICalculator
            onComplete={handleCalcComplete}
            impressionEstimate={impressionEstimate}
          />
        )}

        {!creating && step === 2 && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{
                fontSize: 18,
                fontWeight: 800,
                fontFamily: 'Barlow Condensed, sans-serif',
                color: 'var(--text1)',
                margin: '0 0 4px 0',
              }}>
                Let&apos;s make that customer estimate real
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0 }}>
                Draw your daily route. AI will calculate your actual impressions — not a guess.
              </p>
            </div>
            <RouteMapper
              campaignId={campaignId}
              onImpressionEstimate={(imp) => {
                setImpressionEstimate(imp)
              }}
              onSkip={() => setStep(3)}
              height={450}
            />
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setStep(3)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 20px',
                  borderRadius: 10,
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Continue to Tracking Setup
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {!creating && step === 3 && campaignId && (
          <QRGenerator
            campaignId={campaignId}
            slug={campaignSlug}
            onComplete={() => router.push(`/roi/${campaignId}`)}
          />
        )}
      </div>
    </div>
  )
}
