'use client'

import { useState } from 'react'
import { TrendingUp } from 'lucide-react'
import PublicROICalculator from '@/components/roi/PublicROICalculator'
import PublicRouteMapper from '@/components/roi/PublicRouteMapper'
import PublicLeadCapture from '@/components/roi/PublicLeadCapture'
import PublicThankYou from '@/components/roi/PublicThankYou'

type StepNumber = 1 | 2 | 3 | 4

interface FormData {
  // Calculator
  industry: string
  avgJobValue: number
  numVehicles: number
  primaryCity: string
  // Route
  routeWaypoints: { lat: number; lng: number }[]
  estimatedDailyImpressions: number
  milesPerDay: number
  cityType: 'urban' | 'suburban' | 'rural'
  // Projections
  monthlyImpressions: number
  monthlyLeads: number
  monthlyRevenue: number
  annualRevenue: number
  roiMultiplier: number
  effectiveCPM: number
  // Lead capture
  name: string
  company: string
  email: string
  phone: string
  vehicleType: string
  // Result
  trackingCode: string
  leadId: string
}

const STEP_LABELS = ['Calculate ROI', 'Map Your Route', 'Get Your Code', 'Your Results']

export default function PublicROIPage() {
  const [step, setStep] = useState<StepNumber>(1)
  const [formData, setFormData] = useState<FormData>({
    industry: '',
    avgJobValue: 0,
    numVehicles: 1,
    primaryCity: '',
    routeWaypoints: [],
    estimatedDailyImpressions: 0,
    milesPerDay: 30,
    cityType: 'suburban',
    monthlyImpressions: 0,
    monthlyLeads: 0,
    monthlyRevenue: 0,
    annualRevenue: 0,
    roiMultiplier: 0,
    effectiveCPM: 0,
    name: '',
    company: '',
    email: '',
    phone: '',
    vehicleType: '',
    trackingCode: '',
    leadId: '',
  })

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{
        padding: '24px 20px 0',
        maxWidth: 800,
        margin: '0 auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <TrendingUp size={24} style={{ color: 'var(--green)' }} />
          <h1 style={{
            fontSize: 28,
            fontWeight: 900,
            fontFamily: 'Barlow Condensed, sans-serif',
            color: 'var(--text1)',
            margin: 0,
          }}>
            Wrap ROI Calculator
          </h1>
        </div>
        <p style={{ fontSize: 14, color: 'var(--text2)', margin: '4px 0 20px' }}>
          See exactly how much revenue a vehicle wrap can generate for your business
        </p>

        {/* Step Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          marginBottom: 28,
          overflow: 'auto',
        }}>
          {STEP_LABELS.map((label, i) => {
            const num = (i + 1) as StepNumber
            const isActive = step === num
            const isDone = step > num

            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 8,
                  background: isActive ? 'rgba(79,127,255,0.1)' : isDone ? 'rgba(34,192,122,0.08)' : 'transparent',
                }}>
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    background: isDone ? 'var(--green)' : isActive ? 'var(--accent)' : 'var(--surface2)',
                    color: isDone || isActive ? '#fff' : 'var(--text3)',
                  }}>
                    {isDone ? '\u2713' : num}
                  </div>
                  <span style={{
                    fontSize: 12,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? 'var(--accent)' : isDone ? 'var(--green)' : 'var(--text3)',
                    whiteSpace: 'nowrap',
                  }}>
                    {label}
                  </span>
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div style={{
                    width: 24,
                    height: 1,
                    background: isDone ? 'var(--green)' : 'var(--border)',
                    flexShrink: 0,
                  }} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step Content */}
      <div style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: '0 20px 60px',
      }}>
        {step === 1 && (
          <PublicROICalculator
            formData={formData}
            onUpdate={updateFormData}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <PublicRouteMapper
            formData={formData}
            onUpdate={updateFormData}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && (
          <PublicLeadCapture
            formData={formData}
            onUpdate={updateFormData}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && (
          <PublicThankYou formData={formData} />
        )}
      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center',
        padding: '20px',
        borderTop: '1px solid var(--border)',
        color: 'var(--text3)',
        fontSize: 12,
      }}>
        USA Wrap Co - Vehicle Wraps That Work
      </div>
    </div>
  )
}
