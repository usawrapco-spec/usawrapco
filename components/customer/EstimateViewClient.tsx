'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Truck,
  FileText,
  Download,
  Phone,
  CheckCircle,
  ChevronRight,
  ArrowLeft,
  Eraser,
  PenTool,
  Shield,
  Clock,
  AlertTriangle,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────────
interface EstimateViewClientProps {
  token: string
}

interface EstimateLineItem {
  id?: string
  item: string
  description: string
  vehicle: string
  qty: number
  price: number
  specs?: Record<string, unknown> | null
}

interface BundleConfig {
  discount_type: 'percent' | 'fixed'
  discount_value: number
  min_zones: number
  total_zones: number
  discount_label: string
}

interface ProposalConfig {
  mode: string
  bundle: BundleConfig
  zones: unknown[]
}

interface EstimateData {
  number: string
  date: string
  validUntil: string
  customerName: string
  customerEmail: string
  customerPhone: string
  customerCompany: string
  scopeOfWork: string
  lineItems: EstimateLineItem[]
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  status: string
  serviceType?: 'wrap' | 'boat_decking'
  proposalConfig?: ProposalConfig | null
}

const EMPTY_ESTIMATE: EstimateData = {
  number: '', date: new Date().toISOString(), validUntil: new Date().toISOString(),
  customerName: '', customerEmail: '', customerPhone: '', customerCompany: '',
  scopeOfWork: '', lineItems: [], subtotal: 0, taxRate: 0.0825, taxAmount: 0, total: 0, status: 'draft',
}

type Step = 'estimate' | 'terms' | 'signature' | 'done'

// ─── Washington State Vehicle Wrap Service Agreement ─────────────────────────
const WRAP_TERMS = [
  {
    title: '1. Client Participation Requirements',
    content: 'To deliver the best results possible, your active participation is required. You must submit clear photos of your vehicle and any requested measurements at least 1 hour prior to your scheduled design consultation. If required photos, files, or measurements are missing, your consultation will be canceled — we do not issue refunds for missed or canceled consultations, but we are happy to reschedule once materials are received. You must not be driving during your consultation and must be in a quiet location, able to view your screen for 30 minutes uninterrupted. Only one consultation session is included per design package. A $150 re-vectoring fee applies if a proper vector file is not provided — low-resolution images and non-scalable files are not accepted.',
  },
  {
    title: '2. Design Process & Revision Policy',
    content: 'After intake and consultation, you will receive three initial mockups. We will discuss those and combine elements into a fourth concept for revisions. Initial mockups take approximately 5–12 business days. Your package includes three (3) revision rounds, each submitted as a clearly organized list of up to 10 specific edits (e.g., "Change background to matte black"). Vague feedback will be returned for clarification. If you wish to restart the design after the fourth concept, a new design package must be purchased. Source files are only provided if included in your selected package.',
  },
  {
    title: '3. Pricing, Approvals & Printing',
    content: 'All quotes are approximate estimates based on expected coverage. Final pricing may adjust depending on the finalized design and actual material usage. Once you approve the design for print, no further changes can be made — even if printing has not yet started. Changes after approval are subject to additional fees. If a design is printed and does not fit due to an incorrect template approved by the customer, we can reprint at a discounted rate of 25% of total job cost. It is the customer\'s responsibility to verify template accuracy before final approval.',
  },
  {
    title: '4. Payment Terms & Deposits',
    content: 'A 50% deposit is required to begin any artwork, order materials, or schedule installation. If a refund is requested, it will be calculated as the total deposit minus fees incurred. The remaining balance is due at the time of vehicle delivery and prior to customer pickup. If payment is not made within 10 days of job completion, we reserve the right to automatically charge the card on file. By accepting this estimate, you authorize USA Wrap Co to securely store your payment method and charge it for any unpaid balance. A 11% monthly interest charge applies on outstanding balances after 10 days. Customer must still pay full balance due upon pickup even if a return visit is required.',
  },
  {
    title: '5. Vehicle Preparation & Cancellations',
    content: 'Vehicles must be clean and dry upon drop-off. Do not use waxes, gloss enhancers, tire shine, or similar detailing products before your appointment. If the vehicle is excessively dirty or wet, a $100 cleaning fee will apply. Cancellations must be made at least 24 hours before your scheduled drop-off. Late cancellations, late drop-offs, or no-shows are subject to a $250 fee.',
  },
  {
    title: '6. Artwork, Colors & Copyright',
    content: 'Use of copyrighted or trademarked artwork is prohibited unless written permission has been obtained. USA Wrap Co assumes you have secured all necessary permissions and is not liable for copyright violations. All design work, source files, and working templates remain the property of USA Wrap Co until the project is paid in full. On-screen colors may not match printed output. Color tolerance is within ±3–5%, which is accepted industry standard. All logos must be provided in vector format (.AI, .EPS, or .SVG); a $150 re-vectoring fee applies otherwise. We reserve the right to place a small company logo on completed wraps as a mark of authorship — this may be waived with qualifying packages.',
  },
  {
    title: '7. Installation — What to Expect',
    content: 'A vinyl wrap is not paint. Vehicle wraps are 2D printed panels installed on a 3D surface — minor variations, seams (1" where panels meet), small exposed areas near door handles, gas caps, curves, or moldings are normal and expected. Extreme curves, mirrors, and bumpers may reveal original paint color at tight edges. In some cases, relief cuts or patches are necessary. Vinyl does not adhere to plastic trims, rubber moldings, or chrome. Poor surface paint or failing clear coats will cause adhesion failure — the vehicle owner is responsible for ensuring the surface is wrap-ready. Full wraps typically take 2–5 business days; partials can often be completed in one day. USA Wrap Co reserves the right to take additional time if issues arise during installation. Vehicles must have at least a quarter tank of fuel and be free of personal belongings.',
  },
  {
    title: '8. Dust, Particles & Environment',
    content: 'During installation, every effort is made to ensure a clean, smooth, and professional finish. Achieving a completely sterile, dust-free environment is not possible — small particles of dirt or debris may occasionally become trapped beneath the vinyl. These imperfections are typically only noticeable upon very close inspection. Our wraps are intended to be viewed from a standard distance of five feet, at which such minor flaws are virtually undetectable. This is a widely accepted industry standard. We strongly recommend a full paint-safe detailing treatment prior to wrap installation for best results.',
  },
  {
    title: '9. Warranty & Materials',
    content: 'USA Wrap Co provides a 3-year limited warranty on installation workmanship and materials under normal use and proper care. Warranty does not cover: neglect, misuse, improper cleaning (high-pressure washing, abrasive pads, bleach, harsh chemicals), automatic car washes, accidents, pre-existing paint damage, chipping clear coat, or vehicles older than 5 years with prior body work. No warranty is provided on graphics applied to windows or on materials USA Wrap Co did not install. Please wait at least one week before washing after installation.',
  },
  {
    title: '10. Removals',
    content: 'All removals are quoted separately and billed by the hour. USA Wrap Co is not responsible for damage to paintwork, clear coat, or existing striping during removal. We do not advise application on re-sprayed surfaces or poor/rusted paintwork. No warranty is provided if wrapping over an existing wrap.',
  },
  {
    title: '11. Mobile Installations',
    content: 'Mobile installation services are available for your convenience; however, the workspace must be completely dry, clean, and properly lit. If these conditions are not met upon arrival, we will reschedule and the daily mobile fee will not be credited. We reserve the right to cancel or reschedule mobile installations in the event of unfavorable weather conditions.',
  },
  {
    title: '12. Boat Wrap Addendum (if applicable)',
    content: 'Boat wrapping involves unique challenges. Coverage is not guaranteed to conceal every surface. Wrap coverage near edges, seams, or hardware may leave original surfaces partially visible. Vinyl does not adhere to plastic trims or hardware — items will not be removed. Boat wraps carry a 90-day limited warranty on edge adhesion only — this does not cover seams, particles, or aesthetics. Aluminum boats exposed to saltwater may require sanding ($100/hr, 1-hour minimum) with no adhesion warranty provided thereafter. Color change vinyl comes in 60" rolls; printed wraps come in 54" rolls — material limitations apply to hull height.',
  },
  {
    title: '13. Liability',
    content: 'USA Wrap Co\'s liability is limited to the cost of services rendered. We are not liable for indirect, incidental, or consequential damages. USA Wrap Co is not responsible for pre-existing paint defects, hidden damage, or prior repairs that affect adhesion or appearance. In some cases, simple 12V wiring may need to be disconnected to complete installation — USA Wrap Co is not responsible for any issues arising from reconnecting existing wiring.',
  },
  {
    title: '14. Media Consent',
    content: 'By accepting this agreement, you grant USA Wrap Co the perpetual, irrevocable right to photograph and record the completed project and use those images or videos for marketing, social media, website, and promotional purposes. You will receive no compensation for this use. You may request removal of identifying information (license plates, etc.) before publication.',
  },
  {
    title: '15. Governing Law & Dispute Resolution',
    content: 'This agreement is governed by the laws of the State of Washington. Any disputes arising from this agreement shall first be attempted in good faith through written notice. If unresolved within 30 days, disputes shall be resolved by binding arbitration in Pierce County, Washington, in accordance with the American Arbitration Association rules. The prevailing party shall be entitled to reasonable attorney fees and costs. You consent to the recording of telephone calls with our team for quality assurance, in accordance with Washington State law.',
  },
]

// ─── Dekwave Boat Decking Service Agreement ───────────────────────────────────
const BOAT_TERMS = [
  {
    title: '1. Scope of Work',
    content: 'Chance the Wrapper LLC dba Dekwave ("Contractor") will design, fabricate, and install synthetic marine decking material as quoted. Coverage is based on the package selected (½, ¾, or Full). Zones may include foredeck, cockpit, swim step, side decks, and/or flybridge depending on vessel size. A minimum charge of one decking sheet (~30 sq ft) applies to all projects; no job will be performed for less than this minimum.',
  },
  {
    title: '2. Payment Terms & Deposits',
    content: 'A deposit is required to secure scheduling. Deposits become non-refundable once scanning/design work has begun, regardless of whether installation is completed. The final balance is due within 48 hours of job completion, whether or not the Client has inspected the vessel — the vessel will not be released until payment is received in full. Client agrees their credit/debit card will be securely stored on file. If the final balance is not paid within 10 days of completion, Contractor is authorized to automatically charge the card on file. Failure to pay within this timeframe may result in storage fees and additional collection costs.',
  },
  {
    title: '3. Vessel Preparation & Site Conditions',
    content: 'The vessel must be completely cleared of all obstacles, equipment, and personal items prior to scanning or installation. If the vessel is not ready: a $500 rescheduling fee will be charged, or a $500 flat rate will apply if Contractor\'s team is required to clear the space. Contractor is not responsible for any damage that occurs during installation, including scratches, scuffs, or incidental impact on existing surfaces, fittings, or equipment. By signing this agreement, the Client waives all rights to pursue legal action against the Contractor for any such damage occurring during the normal course of installation. For mobile appointments, service is subject to weather and site conditions; Contractor reserves the right to reschedule if conditions are unsuitable. Client acknowledges that mobile installs may not always achieve the same results as in-shop installations.',
  },
  {
    title: '4. Warranty',
    content: 'Contractor provides a 3-year limited warranty covering installation workmanship and material adhesion. Warranty begins at the date of installation and applies only if decking has been properly maintained. Warranty does NOT cover: neglect, misuse, or improper maintenance; bird droppings, fish blood, fuel, oil, or harsh chemicals left uncleaned; improper cleaning methods (high-pressure washing, abrasive pads, bleach, solvents); normal wear such as fading, staining, or cosmetic blemishes; pre-existing gelcoat/paint damage, corrosion, or poor substrate adhesion. For warranty claims, decking must show signs of proper maintenance (regular cleaning with mild soap, fresh water, and a soft brush).',
  },
  {
    title: '5. Installation Terms',
    content: 'Contractor does not remove hardware (cleats, rails, lights, fittings, etc.). Decking will be cut around these features, and some original surfaces may remain exposed. Trim or edge-sealing methods may be used at Contractor\'s discretion and are permanent once installed. Surface prep (sanding, grinding, or corrosion treatment) may be required for aluminum or salt-exposed decks and is billed at $100/hour (1-hour minimum). Even with prep, salt migration may affect adhesion over time. If additional templating or corrective work is required due to irregular surfaces or inaccurate measurements, pricing may be revised. Cosmetic perfection is not guaranteed — due to marine surfaces, seams, joints, or exposed areas are normal and expected. Contractor guarantees functionality, adhesion, and durability, not flawless appearance.',
  },
  {
    title: '6. Removals',
    content: 'Removal of decking and adhesives is billed separately at $100/hour (1-hour minimum). Contractor is not responsible for any damage to paint, gelcoat, or underlying surfaces during removal.',
  },
  {
    title: '7. Marine Environment Conditions',
    content: 'Marine environments are inherently irregular. Minor gaps, seams, and exposure of original surfaces around fittings or edges are normal and expected. Saltwater and aluminum boats may require additional preparation and still carry a risk of reduced adhesion over time. No universal boat templates exist; quotes may be revised if additional templating or adjustments are required.',
  },
  {
    title: '8. Liability',
    content: 'Contractor is not liable for pre-existing defects, hidden damage, or prior repairs that affect adhesion. Synthetic decking is a cosmetic and protective surface — it is not a structural or gelcoat repair. Adhesion and longevity depend on proper care and environmental conditions. Contractor\'s total liability is limited to the amount paid for the services rendered. To the fullest extent permitted under Washington State law, Client waives any claims for consequential, incidental, or indirect damages arising from this agreement.',
  },
  {
    title: '9. Client Acknowledgments',
    content: 'By signing, the Client confirms they: understand decking may show seams, texture, or irregularities; accept the 3-year limited warranty applies only if proper care and maintenance are followed; agree that hardware will not be removed and some original surfaces may remain visible; accept responsibility for preparing the vessel or paying fees if Contractor must clear it; understand mobile installs may be rescheduled due to weather or conditions; and authorize Chance the Wrapper LLC dba Dekwave to perform all agreed-upon work and accept all terms of this contract.',
  },
  {
    title: '10. Governing Law & Dispute Resolution',
    content: 'This agreement is governed by the laws of the State of Washington. Any disputes arising from this agreement shall first be attempted in good faith through written notice. If unresolved within 30 days, disputes shall be resolved by binding arbitration in Pierce County, Washington, in accordance with the American Arbitration Association rules. The prevailing party shall be entitled to reasonable attorney fees and costs. This agreement constitutes the entire agreement between both parties and supersedes all prior proposals, oral or written communications relating to the subject matter herein.',
  },
]

// ─── Colors / Styles ────────────────────────────────────────────────────────────
const C = {
  bg: '#0d0f14',
  surface: '#161920',
  surface2: '#1e2330',
  border: '#2a2f3d',
  accent: '#4f7fff',
  green: '#22c07a',
  red: '#f25a5a',
  amber: '#f59e0b',
  text1: '#ffffff',
  text2: '#8b95a5',
  text3: '#5a6080',
}

// ─── Component ──────────────────────────────────────────────────────────────────
export default function EstimateViewClient({ token }: EstimateViewClientProps) {
  const [step, setStep] = useState<Step>('estimate')
  const [animDir, setAnimDir] = useState<'next' | 'back'>('next')
  const [animating, setAnimating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [est, setEst] = useState<EstimateData>(EMPTY_ESTIMATE)

  // Terms state
  const [termsScrolled, setTermsScrolled] = useState(false)
  const [termsAgreed, setTermsAgreed] = useState(false)
  const termsRef = useRef<HTMLDivElement>(null)

  // Signature state
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSigned, setHasSigned] = useState(false)
  const [signerName, setSignerName] = useState('')
  const lastPoint = useRef<{ x: number; y: number } | null>(null)

  // Redirect timer
  const [countdown, setCountdown] = useState(3)

  // Zone proposal selection
  const [selectedZoneIds, setSelectedZoneIds] = useState<Set<string>>(new Set())

  // ─── Fetch estimate by token ─────────────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    fetch(`/api/estimates/view/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setFetchError(data.error)
        } else {
          setEst(data)
          setSignerName(data.customerName)
          // Pre-select all zones for zone proposals
          if (data.proposalConfig?.mode === 'zone_select') {
            setSelectedZoneIds(new Set(data.lineItems.map((li: EstimateLineItem) => li.id || li.item)))
          }
        }
      })
      .catch(() => setFetchError('Failed to load estimate'))
      .finally(() => setLoading(false))
  }, [token])

  // ─── Step navigation ────────────────────────────────────────────────────────
  const steps: Step[] = ['estimate', 'terms', 'signature', 'done']
  const stepIndex = steps.indexOf(step)

  const goTo = useCallback((next: Step, dir: 'next' | 'back') => {
    if (animating) return
    setAnimDir(dir)
    setAnimating(true)
    setTimeout(() => {
      setStep(next)
      setAnimating(false)
    }, 250)
  }, [animating])

  // ─── Terms scroll detection ─────────────────────────────────────────────────
  const handleTermsScroll = useCallback(() => {
    const el = termsRef.current
    if (!el) return
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 20
    if (atBottom) setTermsScrolled(true)
  }, [])

  // ─── Canvas signature pad ──────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'signature') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    ctx.scale(2, 2)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#1a1d27'
    ctx.lineWidth = 2.5
  }, [step])

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    }
  }

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setIsDrawing(true)
    const pos = getPos(e)
    lastPoint.current = pos
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
    }
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx || !lastPoint.current) return
    const pos = getPos(e)

    // Smooth line with quadratic curve
    const midX = (lastPoint.current.x + pos.x) / 2
    const midY = (lastPoint.current.y + pos.y) / 2
    ctx.quadraticCurveTo(lastPoint.current.x, lastPoint.current.y, midX, midY)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(midX, midY)

    // Pressure simulation based on speed
    const dist = Math.sqrt(
      Math.pow(pos.x - lastPoint.current.x, 2) +
      Math.pow(pos.y - lastPoint.current.y, 2)
    )
    const speed = Math.min(dist / 2, 8)
    ctx.lineWidth = Math.max(1.5, 3.5 - speed * 0.2)

    lastPoint.current = pos
    if (!hasSigned) setHasSigned(true)
  }

  const endDraw = () => {
    setIsDrawing(false)
    lastPoint.current = null
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSigned(false)
  }

  const getSignatureData = (): string | null => {
    const canvas = canvasRef.current
    if (!canvas || !hasSigned) return null
    return canvas.toDataURL('image/png')
  }

  const handleSignAndContinue = async () => {
    const sigData = getSignatureData()
    if (!sigData || !signerName.trim()) return

    const isZoneProposal = est.proposalConfig?.mode === 'zone_select'
    const zoneItems = isZoneProposal ? est.lineItems.filter(li => selectedZoneIds.has(li.id || li.item)) : []
    const finalTotal = zoneItems.reduce((s, li) => s + li.price * li.qty, 0)

    try {
      await fetch('/api/estimates/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          signerName: signerName.trim(),
          signatureData: sigData,
          ...(isZoneProposal ? { selectedZones: Array.from(selectedZoneIds), finalTotal } : {}),
        }),
      })
    } catch {}

    goTo('done', 'next')
  }

  // ─── Redirect countdown ────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'done') return
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          window.location.href = `/onboard/${token}`
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [step, token])

  // ─── Step indicator ────────────────────────────────────────────────────────
  const StepIndicator = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
      {steps.map((s, i) => (
        <div
          key={s}
          style={{
            width: i <= stepIndex ? 28 : 8,
            height: 8,
            borderRadius: 4,
            background: i <= stepIndex ? C.accent : C.surface2,
            transition: 'all 0.3s ease',
          }}
        />
      ))}
    </div>
  )

  // ─── Slide animation wrapper ───────────────────────────────────────────────
  const slideStyle: React.CSSProperties = {
    opacity: animating ? 0 : 1,
    transform: animating
      ? `translateX(${animDir === 'next' ? '40px' : '-40px'})`
      : 'translateX(0)',
    transition: 'all 0.25s ease',
  }

  // ─── Format currency ──────────────────────────────────────────────────────
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  // ─── STEP 1: View Estimate ────────────────────────────────────────────────
  const renderEstimate = () => (
    <div style={slideStyle}>
      {/* Estimate title */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 16px',
          background: `${C.accent}12`,
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 700,
          color: C.accent,
          letterSpacing: '0.04em',
          marginBottom: 12,
        }}>
          <FileText size={13} />
          ESTIMATE
        </div>
        <h1 style={{
          fontSize: 28,
          fontWeight: 900,
          color: C.text1,
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: '-0.01em',
          margin: '0 0 6px',
        }}>
          {est.number}
        </h1>
        <p style={{ fontSize: 13, color: C.text2, margin: 0 }}>
          Issued {new Date(est.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Customer info */}
      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 20,
        marginBottom: 20,
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          Prepared For
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text1, marginBottom: 4 }}>
          {est.customerName}
        </div>
        <div style={{ fontSize: 13, color: C.text2 }}>{est.customerCompany}</div>
        <div style={{ fontSize: 13, color: C.text2 }}>{est.customerEmail}</div>
        <div style={{ fontSize: 13, color: C.text2 }}>{est.customerPhone}</div>
      </div>

      {/* Line items — zone proposal or standard table */}
      {est.proposalConfig?.mode === 'zone_select' ? (() => {
        const bundle = est.proposalConfig!.bundle
        const selectedItems = est.lineItems.filter(li => selectedZoneIds.has(li.id || li.item))
        const subtotal = selectedItems.reduce((s, li) => s + li.price * li.qty, 0)
        const qualifies = selectedZoneIds.size >= bundle.min_zones
        const discountAmt = qualifies
          ? bundle.discount_type === 'percent' ? subtotal * (bundle.discount_value / 100) : bundle.discount_value
          : 0
        const total = subtotal - discountAmt
        const taxAmount = total * est.taxRate
        const needed = Math.max(0, bundle.min_zones - selectedZoneIds.size)

        return (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              Select Your Sections
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {est.lineItems.map((li) => {
                const key = li.id || li.item
                const active = selectedZoneIds.has(key)
                const scanFee = (li.specs?.scanning_fee as number | undefined) || 0
                return (
                  <div
                    key={key}
                    onClick={() => setSelectedZoneIds(prev => {
                      const n = new Set(prev)
                      active ? n.delete(key) : n.add(key)
                      return n
                    })}
                    style={{
                      padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                      border: `1.5px solid ${active ? C.accent : C.border}`,
                      background: active ? C.accent + '10' : C.surface,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                        border: `2px solid ${active ? C.accent : C.border}`,
                        background: active ? C.accent : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, color: '#fff', fontWeight: 900,
                      }}>
                        {active && '✓'}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: active ? C.text1 : C.text2 }}>{li.item}</div>
                        <div style={{ fontSize: 11, color: C.text3, fontFamily: "'JetBrains Mono', monospace" }}>{li.description}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: C.text1, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(li.price)}</div>
                      {scanFee > 0 && <div style={{ fontSize: 10, color: C.amber, fontFamily: "'JetBrains Mono', monospace" }}>+{fmt(scanFee)} scan</div>}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Bundle progress */}
            {bundle.discount_value > 0 && (
              <div style={{
                padding: '12px 14px', borderRadius: 10, marginBottom: 14,
                background: qualifies ? C.green + '10' : C.accent + '08',
                border: `1px solid ${qualifies ? C.green + '30' : C.accent + '20'}`,
              }}>
                {qualifies ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: C.green }}>
                    <CheckCircle size={14} />
                    {bundle.discount_label} — {bundle.discount_type === 'percent' ? bundle.discount_value + '% off' : fmt(bundle.discount_value) + ' back'} applied!
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: C.text2 }}>
                    Add <strong style={{ color: C.accent }}>{needed} more section{needed !== 1 ? 's' : ''}</strong> to unlock the {bundle.discount_label}
                    {bundle.discount_type === 'percent' ? ` (${bundle.discount_value}% off)` : ` (${fmt(bundle.discount_value)} back)`}
                  </div>
                )}
                <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: C.surface2 }}>
                  <div style={{ height: '100%', borderRadius: 2, width: Math.min(100, (selectedZoneIds.size / bundle.min_zones) * 100) + '%', background: qualifies ? C.green : C.accent, transition: 'width 0.3s' }} />
                </div>
                <div style={{ marginTop: 4, fontSize: 10, color: C.text3 }}>{selectedZoneIds.size} of {bundle.min_zones} sections</div>
              </div>
            )}

            {/* Running total */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: C.text2 }}>{selectedZoneIds.size} section{selectedZoneIds.size !== 1 ? 's' : ''} selected</span>
                <span style={{ fontSize: 14, color: C.text1, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{fmt(subtotal)}</span>
              </div>
              {qualifies && discountAmt > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: C.green }}>{bundle.discount_label}</span>
                  <span style={{ fontSize: 14, color: C.green, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>-{fmt(discountAmt)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: C.text2 }}>Tax ({(est.taxRate * 100).toFixed(2)}%)</span>
                <span style={{ fontSize: 14, color: C.text1, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{fmt(taxAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: C.text1 }}>Total</span>
                <span style={{ fontSize: 24, fontWeight: 900, color: qualifies && discountAmt > 0 ? C.green : C.text1, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(total + taxAmount)}</span>
              </div>
            </div>
          </div>
        )
      })() : (
        <div style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          overflow: 'hidden',
          marginBottom: 20,
        }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto auto auto',
            gap: 12,
            padding: '14px 20px',
            background: C.surface2,
            fontSize: 11,
            fontWeight: 800,
            color: C.text3,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            <div>Item</div>
            <div style={{ textAlign: 'center' }}>Qty</div>
            <div style={{ textAlign: 'right' }}>Price</div>
            <div style={{ textAlign: 'right' }}>Total</div>
          </div>

          {/* Line items */}
          {est.lineItems.map((li, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto auto',
                gap: 12,
                padding: '16px 20px',
                borderTop: `1px solid ${C.border}`,
                alignItems: 'start',
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text1, marginBottom: 3 }}>{li.item}</div>
                <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.5 }}>{li.description}</div>
                {li.vehicle && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 11, color: C.accent, fontWeight: 600 }}>
                    <Truck size={11} />{li.vehicle}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text1, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", minWidth: 32, paddingTop: 2 }}>{li.qty}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text2, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", minWidth: 80, paddingTop: 2 }}>{fmt(li.price)}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text1, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", minWidth: 80, paddingTop: 2 }}>{fmt(li.price * li.qty)}</div>
            </div>
          ))}

          {/* Totals */}
          <div style={{ borderTop: `1px solid ${C.border}`, padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: C.text2 }}>Subtotal</span>
              <span style={{ fontSize: 14, color: C.text1, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{fmt(est.subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: C.text2 }}>Tax ({(est.taxRate * 100).toFixed(2)}%)</span>
              <span style={{ fontSize: 14, color: C.text1, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{fmt(est.taxAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: C.text1 }}>Total</span>
              <span style={{ fontSize: 24, fontWeight: 900, color: C.green, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(est.total)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Scope of work */}
      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 20,
        marginBottom: 20,
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          Scope of Work
        </div>
        <p style={{ fontSize: 13, color: C.text2, lineHeight: 1.7, margin: 0 }}>
          {est.scopeOfWork}
        </p>
      </div>

      {/* Validity footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '12px 0 20px',
        fontSize: 12,
        color: C.text3,
      }}>
        <Clock size={13} />
        This estimate is valid for 30 days (expires {new Date(est.validUntil).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })})
      </div>

      {/* Download PDF */}
      <button
        onClick={() => window.print()}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: 10,
          border: `1px solid ${C.border}`,
          background: 'transparent',
          color: C.text2,
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 14,
        }}
      >
        <Download size={16} />
        Download PDF
      </button>

      {/* Accept button */}
      <button
        onClick={() => goTo('terms', 'next')}
        style={{
          width: '100%',
          padding: '18px',
          borderRadius: 12,
          border: 'none',
          background: C.green,
          color: '#fff',
          fontSize: 17,
          fontWeight: 900,
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: '0.02em',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          marginBottom: 20,
        }}
      >
        <CheckCircle size={20} />
        Accept Estimate
        <ChevronRight size={18} />
      </button>

      {/* Contact link */}
      <div style={{ textAlign: 'center' }}>
        <a
          href="tel:+15551234567"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: C.accent,
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <Phone size={14} />
          Have questions? Call us at (555) 123-4567
        </a>
      </div>
    </div>
  )

  // ─── STEP 2: Terms & Conditions ────────────────────────────────────────────
  const renderTerms = () => {
    const isBoat = est.serviceType === 'boat_decking'
    const termsContent = isBoat ? BOAT_TERMS : WRAP_TERMS
    const agreementTitle = isBoat
      ? 'DEKWAVE — Boat Decking Service Agreement'
      : 'USA WRAP CO — Vehicle Wrap Service Agreement'

    return (
    <div style={slideStyle}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: `${C.accent}12`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 14px',
        }}>
          <Shield size={24} style={{ color: C.accent }} />
        </div>
        <h2 style={{
          fontSize: 24,
          fontWeight: 900,
          color: C.text1,
          fontFamily: "'Barlow Condensed', sans-serif",
          margin: '0 0 6px',
        }}>
          Terms & Conditions
        </h2>
        <p style={{ fontSize: 13, color: C.text2, margin: 0 }}>
          Please review the full service agreement before continuing
        </p>
      </div>

      {/* Scrollable terms */}
      <div
        ref={termsRef}
        onScroll={handleTermsScroll}
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          padding: '24px 20px',
          maxHeight: 400,
          overflowY: 'auto',
          marginBottom: 20,
        }}
      >
        <div style={{
          fontSize: 11,
          fontWeight: 800,
          color: C.accent,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 20,
        }}>
          {agreementTitle}
        </div>

        {termsContent.map((section, i) => (
          <div key={i} style={{ marginBottom: i < termsContent.length - 1 ? 24 : 0 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
            }}>
              <Shield size={14} style={{ color: C.accent, flexShrink: 0 }} />
              <h3 style={{
                fontSize: 14,
                fontWeight: 800,
                color: C.text1,
                margin: 0,
                fontFamily: "'Barlow Condensed', sans-serif",
                letterSpacing: '0.01em',
              }}>
                {section.title}
              </h3>
            </div>
            <p style={{
              fontSize: 13,
              color: C.text2,
              lineHeight: 1.7,
              margin: 0,
              paddingLeft: 22,
            }}>
              {section.content}
            </p>
          </div>
        ))}
      </div>

      {/* Scroll hint */}
      {!termsScrolled && (
        <div style={{
          textAlign: 'center',
          fontSize: 12,
          color: C.amber,
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}>
          <AlertTriangle size={13} />
          Scroll to the bottom to continue
        </div>
      )}

      {/* Checkbox */}
      <label style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '16px 18px',
        background: termsAgreed ? `${C.green}08` : C.surface,
        border: `1px solid ${termsAgreed ? `${C.green}40` : C.border}`,
        borderRadius: 12,
        cursor: termsScrolled ? 'pointer' : 'not-allowed',
        opacity: termsScrolled ? 1 : 0.4,
        transition: 'all 0.2s',
        marginBottom: 20,
      }}>
        <input
          type="checkbox"
          checked={termsAgreed}
          disabled={!termsScrolled}
          onChange={e => setTermsAgreed(e.target.checked)}
          style={{
            width: 20,
            height: 20,
            accentColor: C.green,
            flexShrink: 0,
            marginTop: 1,
            cursor: termsScrolled ? 'pointer' : 'not-allowed',
          }}
        />
        <span style={{ fontSize: 13, color: C.text2, lineHeight: 1.6 }}>
          I have read and agree to the Terms & Conditions outlined above. I understand the payment terms, cancellation policy, and warranty coverage.
        </span>
      </label>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() => goTo('estimate', 'back')}
          style={{
            flex: 1,
            padding: '14px',
            borderRadius: 10,
            border: `1px solid ${C.border}`,
            background: 'transparent',
            color: C.text2,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <button
          onClick={() => termsAgreed && goTo('signature', 'next')}
          disabled={!termsAgreed}
          style={{
            flex: 2,
            padding: '14px',
            borderRadius: 10,
            border: 'none',
            background: termsAgreed ? C.accent : C.surface2,
            color: termsAgreed ? '#fff' : C.text3,
            fontSize: 15,
            fontWeight: 800,
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: '0.02em',
            cursor: termsAgreed ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'all 0.2s',
          }}
        >
          Continue to Signature
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
  }

  // ─── STEP 3: Digital Signature ─────────────────────────────────────────────
  const renderSignature = () => (
    <div style={slideStyle}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: `${C.accent}12`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 14px',
        }}>
          <PenTool size={24} style={{ color: C.accent }} />
        </div>
        <h2 style={{
          fontSize: 24,
          fontWeight: 900,
          color: C.text1,
          fontFamily: "'Barlow Condensed', sans-serif",
          margin: '0 0 6px',
        }}>
          Sign Your Agreement
        </h2>
        <p style={{ fontSize: 13, color: C.text2, margin: 0 }}>
          Draw your signature below to finalize the agreement
        </p>
      </div>

      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 20,
        marginBottom: 20,
      }}>
        {/* Signature pad */}
        <div style={{ marginBottom: 18 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}>
            <label style={{
              fontSize: 11,
              fontWeight: 800,
              color: C.text3,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              Your Signature
            </label>
            <button
              onClick={clearSignature}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                borderRadius: 6,
                border: `1px solid ${C.border}`,
                background: 'transparent',
                color: C.text3,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Eraser size={12} />
              Clear
            </button>
          </div>
          <div style={{
            borderRadius: 12,
            overflow: 'hidden',
            border: `2px solid ${hasSigned ? C.green + '40' : C.border}`,
            transition: 'border-color 0.2s',
          }}>
            <canvas
              ref={canvasRef}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
              style={{
                width: '100%',
                height: 160,
                background: '#ffffff',
                cursor: 'crosshair',
                touchAction: 'none',
                display: 'block',
              }}
            />
          </div>
          {!hasSigned && (
            <div style={{
              textAlign: 'center',
              fontSize: 12,
              color: C.text3,
              marginTop: 8,
              fontStyle: 'italic',
            }}>
              Draw your signature above using your mouse or finger
            </div>
          )}
        </div>

        {/* Name field */}
        <div style={{ marginBottom: 18 }}>
          <label style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 800,
            color: C.text3,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 8,
          }}>
            Full Name
          </label>
          <input
            value={signerName}
            onChange={e => setSignerName(e.target.value)}
            placeholder="Type your full legal name"
            style={{
              width: '100%',
              padding: '14px 16px',
              background: C.surface2,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              color: C.text1,
              fontSize: 15,
              outline: 'none',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Date (read-only) */}
        <div style={{ marginBottom: 20 }}>
          <label style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 800,
            color: C.text3,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 8,
          }}>
            Date
          </label>
          <div style={{
            padding: '14px 16px',
            background: C.surface2,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            color: C.text2,
            fontSize: 14,
          }}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </div>

        {/* Legal notice */}
        <div style={{
          padding: '14px 16px',
          background: `${C.accent}08`,
          border: `1px solid ${C.accent}20`,
          borderRadius: 10,
          fontSize: 12,
          color: C.text2,
          lineHeight: 1.6,
        }}>
          <Shield size={13} style={{ color: C.accent, display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
          By signing below, you agree to the terms and authorize USA Wrap Co to begin work as described in estimate {est.number}.
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() => goTo('terms', 'back')}
          style={{
            flex: 1,
            padding: '14px',
            borderRadius: 10,
            border: `1px solid ${C.border}`,
            background: 'transparent',
            color: C.text2,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <button
          onClick={handleSignAndContinue}
          disabled={!hasSigned || !signerName.trim()}
          style={{
            flex: 2,
            padding: '16px',
            borderRadius: 10,
            border: 'none',
            background: hasSigned && signerName.trim() ? C.green : C.surface2,
            color: hasSigned && signerName.trim() ? '#fff' : C.text3,
            fontSize: 16,
            fontWeight: 900,
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: '0.02em',
            cursor: hasSigned && signerName.trim() ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'all 0.2s',
          }}
        >
          <PenTool size={16} />
          Sign & Continue
        </button>
      </div>
    </div>
  )

  // ─── STEP 4: Done / Redirect ───────────────────────────────────────────────
  const renderDone = () => (
    <div style={{
      ...slideStyle,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '60px 0',
    }}>
      {/* Animated checkmark */}
      <div style={{
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: `${C.green}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        animation: 'scaleIn 0.4s ease',
      }}>
        <CheckCircle size={42} style={{ color: C.green }} />
      </div>
      <h2 style={{
        fontSize: 28,
        fontWeight: 900,
        color: C.text1,
        fontFamily: "'Barlow Condensed', sans-serif",
        marginBottom: 8,
      }}>
        Agreement Signed!
      </h2>
      <p style={{ fontSize: 14, color: C.text2, maxWidth: 360, marginBottom: 28, lineHeight: 1.6 }}>
        Thank you, {signerName}. Your signed agreement has been recorded.
        We are getting everything ready for your project.
      </p>
      <div style={{
        fontSize: 13,
        color: C.text3,
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <Clock size={14} />
        Redirecting in {countdown} second{countdown !== 1 ? 's' : ''}...
      </div>
      <button
        onClick={() => { window.location.href = `/onboard/${token}` }}
        style={{
          padding: '16px 36px',
          borderRadius: 12,
          border: 'none',
          background: C.accent,
          color: '#fff',
          fontSize: 15,
          fontWeight: 800,
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: '0.02em',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        Continue to Upload Assets
        <ChevronRight size={16} />
      </button>

      {/* Inject animation keyframes */}
      <style>{`
        @keyframes scaleIn {
          0% { transform: scale(0.4); opacity: 0; }
          60% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )

  // ─── Loading / Error states ───────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Clock size={32} style={{ color: C.text3 }} />
    </div>
  )

  if (fetchError) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
      <AlertTriangle size={40} style={{ color: C.red }} />
      <p style={{ color: C.text2, textAlign: 'center', fontSize: 15, margin: 0 }}>
        {fetchError === 'Estimate not found' ? 'This estimate link is invalid or has expired.' : 'Unable to load estimate. Please try again.'}
      </p>
    </div>
  )

  // ─── Main Layout ──────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      color: C.text1,
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    }}>
      <div style={{
        maxWidth: 700,
        margin: '0 auto',
        padding: '20px 16px 80px',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: '16px 0 8px',
          marginBottom: 8,
        }}>
          <img
            src="https://usawrapco.com/wp-content/uploads/2025/10/main-logo-1-e1759926343108.webp"
            alt="USA WRAP CO"
            style={{ height: 48, width: 'auto' }}
            onError={(e) => {
              const el = e.currentTarget
              el.style.display = 'none'
              const fallback = el.nextElementSibling as HTMLElement | null
              if (fallback) fallback.style.display = 'flex'
            }}
          />
          <div style={{ display: 'none', alignItems: 'center', gap: 10 }}>
            <Truck size={24} style={{ color: C.accent }} />
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: '-0.01em',
              color: C.text1,
            }}>
              USA WRAP CO
            </span>
          </div>
        </div>

        {/* Step indicator */}
        <StepIndicator />

        {/* Step content */}
        {step === 'estimate' && renderEstimate()}
        {step === 'terms' && renderTerms()}
        {step === 'signature' && renderSignature()}
        {step === 'done' && renderDone()}
      </div>
    </div>
  )
}
