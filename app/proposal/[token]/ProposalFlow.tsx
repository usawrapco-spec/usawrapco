'use client'

import { useState, useMemo } from 'react'
import PackageStep from './steps/PackageStep'
import UpsellStep from './steps/UpsellStep'
import ReviewStep from './steps/ReviewStep'
import PaymentStep from './steps/PaymentStep'
import SuccessStep from './steps/SuccessStep'
import {
  ChevronRight, Phone, Mail, User, Car, Clock, X,
} from 'lucide-react'

const C = {
  bg: '#0A0A0A', surface: '#1A1A1A', surface2: '#222', border: '#2a2a2a',
  accent: '#f59e0b', green: '#22c07a', red: '#f25a5a',
  text1: '#f5f5f5', text2: '#a0a0a0', text3: '#666',
}

interface ProposalFlowProps {
  token: string
  proposal: any
  packages: any[]
  upsells: any[]
  customer: any
  salesRep: any
  vehicleInfo: any
}

type Step = 'landing' | 'packages' | 'upsells' | 'review' | 'payment' | 'success'
const STEP_ORDER: Step[] = ['landing', 'packages', 'upsells', 'review', 'payment', 'success']

export default function ProposalFlow({
  token, proposal, packages, upsells, customer, salesRep, vehicleInfo,
}: ProposalFlowProps) {
  const [step, setStep] = useState<Step>('landing')
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null)
  const [selectedUpsellIds, setSelectedUpsellIds] = useState<string[]>([])
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [showDeclineModal, setShowDeclineModal] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [declining, setDeclining] = useState(false)
  const [declined, setDeclined] = useState(false)

  const stepIdx = STEP_ORDER.indexOf(step)
  const hasUpsells = upsells.length > 0

  const selectedPkg = useMemo(
    () => packages.find((p: any) => p.id === selectedPackageId),
    [packages, selectedPackageId]
  )

  const upsellTotal = useMemo(
    () => upsells
      .filter((u: any) => selectedUpsellIds.includes(u.id))
      .reduce((sum: number, u: any) => sum + Number(u.price), 0),
    [upsells, selectedUpsellIds]
  )

  const total = (Number(selectedPkg?.price) || 0) + upsellTotal
  const depositAmount = proposal.deposit_amount || 250

  const daysLeft = proposal.expiration_date
    ? Math.max(0, Math.ceil((new Date(proposal.expiration_date).getTime() - Date.now()) / 86400000))
    : null

  const customerName = customer?.name?.split(' ')[0] || 'there'
  const vehicleStr = vehicleInfo
    ? [vehicleInfo.year, vehicleInfo.make, vehicleInfo.model].filter(Boolean).join(' ')
    : null

  async function handleDecline() {
    setDeclining(true)
    try {
      await fetch(`/api/proposals/public/${token}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: declineReason }),
      })
      setDeclined(true)
      setShowDeclineModal(false)
    } catch {
      // silent
    } finally {
      setDeclining(false)
    }
  }

  const goNext = () => {
    const nextIdx = stepIdx + 1
    // Skip upsells step if no upsells
    if (STEP_ORDER[nextIdx] === 'upsells' && !hasUpsells) {
      setStep(STEP_ORDER[nextIdx + 1])
    } else {
      setStep(STEP_ORDER[nextIdx])
    }
  }

  const goBack = () => {
    const prevIdx = stepIdx - 1
    if (STEP_ORDER[prevIdx] === 'upsells' && !hasUpsells) {
      setStep(STEP_ORDER[prevIdx - 1])
    } else {
      setStep(STEP_ORDER[prevIdx])
    }
  }

  // ─── Progress bar ──────────────────────────────────────────────
  const totalSteps = hasUpsells ? 5 : 4
  const displayStepIdx = (() => {
    if (step === 'landing') return 0
    if (step === 'packages') return 1
    if (step === 'upsells') return 2
    if (step === 'review') return hasUpsells ? 3 : 2
    if (step === 'payment') return hasUpsells ? 4 : 3
    if (step === 'success') return totalSteps
    return 0
  })()

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text1, fontFamily: 'system-ui, sans-serif' }}>
      {/* Progress bar */}
      {step !== 'landing' && step !== 'success' && (
        <div style={{ position: 'sticky', top: 0, zIndex: 100, background: C.bg, borderBottom: `1px solid ${C.border}`, padding: '12px 20px' }}>
          <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < displayStepIdx ? C.accent : C.border, transition: 'background 0.3s' }} />
            ))}
          </div>
        </div>
      )}

      {/* ── Landing Step ──────────────────────────────────────── */}
      {step === 'landing' && (
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 20px 80px' }}>
          {/* Logo */}
          <div style={{
            fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em',
            fontFamily: 'Barlow Condensed, sans-serif', color: C.text1,
            marginBottom: 40, textAlign: 'center',
          }}>
            USA WRAP CO
          </div>

          {/* Greeting */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              fontSize: 32, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif',
              lineHeight: 1.2, marginBottom: 8,
            }}>
              Hello {customerName}!
            </div>
            <div style={{ fontSize: 15, color: C.text2, lineHeight: 1.6 }}>
              We&apos;ve prepared a custom proposal just for you.
            </div>
          </div>

          {/* Vehicle info */}
          {vehicleStr && (
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14,
              padding: '18px 20px', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Car size={22} style={{ color: C.accent }} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.text3, marginBottom: 2 }}>Your Vehicle</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.text1 }}>{vehicleStr}</div>
                {vehicleInfo?.color && <div style={{ fontSize: 13, color: C.text2 }}>{vehicleInfo.color}</div>}
              </div>
            </div>
          )}

          {/* Sales rep */}
          {salesRep && (
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14,
              padding: '18px 20px', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%', background: 'rgba(245,158,11,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
              }}>
                {salesRep.avatar_url ? (
                  <img src={salesRep.avatar_url} alt="" style={{ width: 44, height: 44, objectFit: 'cover' }} />
                ) : (
                  <User size={20} style={{ color: C.accent }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.text3, marginBottom: 2 }}>Your Rep</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text1 }}>{salesRep.name}</div>
                <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                  {salesRep.phone && (
                    <a href={`tel:${salesRep.phone}`} style={{ fontSize: 13, color: C.accent, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Phone size={12} /> {salesRep.phone}
                    </a>
                  )}
                  {salesRep.email && (
                    <a href={`mailto:${salesRep.email}`} style={{ fontSize: 13, color: C.accent, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Mail size={12} /> Email
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Personal message */}
          {proposal.message && (
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14,
              padding: '18px 20px', marginBottom: 16, fontSize: 14, color: C.text2, lineHeight: 1.7,
              fontStyle: 'italic',
            }}>
              &ldquo;{proposal.message}&rdquo;
            </div>
          )}

          {/* Expiration */}
          {daysLeft !== null && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '10px 0', marginBottom: 24,
              fontSize: 13, color: daysLeft <= 3 ? C.red : C.text3,
            }}>
              <Clock size={14} />
              {daysLeft > 0 ? `This proposal expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}` : 'This proposal expires today'}
            </div>
          )}

          {/* CTA */}
          {declined ? (
            <div style={{ textAlign: 'center', padding: '20px', background: C.surface, borderRadius: 14, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text1, marginBottom: 6 }}>Proposal Declined</div>
              <div style={{ fontSize: 13, color: C.text2 }}>Thank you for letting us know. Feel free to reach out if you have any questions.</div>
            </div>
          ) : (
            <>
              <button
                onClick={goNext}
                style={{
                  width: '100%', padding: '18px', border: 'none', borderRadius: 14,
                  background: `linear-gradient(135deg, ${C.accent}, #d97706)`,
                  color: '#000', fontSize: 17, fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                }}
              >
                View Your Packages
                <ChevronRight size={20} />
              </button>
              <button
                onClick={() => setShowDeclineModal(true)}
                style={{
                  width: '100%', marginTop: 10, padding: '13px', border: `1px solid ${C.border}`,
                  borderRadius: 14, background: 'transparent', color: C.text3,
                  fontSize: 14, fontWeight: 500, cursor: 'pointer',
                }}
              >
                No thanks, decline this proposal
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Decline Modal ────────────────────────────────────── */}
      {showDeclineModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20,
        }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '28px 24px', width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: C.text1 }}>Decline Proposal</div>
              <button onClick={() => setShowDeclineModal(false)} style={{ background: 'none', border: 'none', color: C.text3, cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: 14, color: C.text2, marginBottom: 16, lineHeight: 1.6 }}>
              We&apos;re sorry to hear that. Would you like to share a reason? (Optional)
            </p>
            <textarea
              value={declineReason}
              onChange={e => setDeclineReason(e.target.value)}
              placeholder="Price, timing, went with someone else…"
              rows={3}
              style={{
                width: '100%', padding: '10px 14px', background: C.bg,
                border: `1px solid ${C.border}`, borderRadius: 8, color: C.text1,
                fontSize: 13, resize: 'vertical', marginBottom: 16, boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowDeclineModal(false)}
                style={{ flex: 1, padding: '11px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, color: C.text2, fontSize: 13, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDecline}
                disabled={declining}
                style={{ flex: 1, padding: '11px', background: C.red, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: declining ? 0.6 : 1 }}
              >
                {declining ? 'Declining…' : 'Decline Proposal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Package Selection ─────────────────────────────────── */}
      {step === 'packages' && (
        <PackageStep
          packages={packages}
          selectedId={selectedPackageId}
          onSelect={setSelectedPackageId}
          onContinue={goNext}
          onBack={goBack}
          colors={C}
        />
      )}

      {/* ── Upsells ───────────────────────────────────────────── */}
      {step === 'upsells' && (
        <UpsellStep
          upsells={upsells}
          selectedIds={selectedUpsellIds}
          onToggle={(id: string) =>
            setSelectedUpsellIds(prev =>
              prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
            )
          }
          packagePrice={Number(selectedPkg?.price) || 0}
          total={total}
          onContinue={goNext}
          onBack={goBack}
          colors={C}
        />
      )}

      {/* ── Review & Sign ─────────────────────────────────────── */}
      {step === 'review' && (
        <ReviewStep
          selectedPkg={selectedPkg}
          upsells={upsells.filter((u: any) => selectedUpsellIds.includes(u.id))}
          total={total}
          depositAmount={depositAmount}
          onSign={async (sig: string) => {
            setSignatureData(sig)
            // Create payment intent
            try {
              const res = await fetch(`/api/proposals/public/${token}/select`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  package_id: selectedPackageId,
                  upsell_ids: selectedUpsellIds,
                  signature_base64: sig,
                }),
              })
              const json = await res.json()
              if (json.client_secret) {
                setClientSecret(json.client_secret)
                setPaymentIntentId(json.payment_intent_id)
                setIsDemo(!!json.demo)
                goNext()
              }
            } catch (err) {
              console.error('[Proposal] select error:', err)
            }
          }}
          onBack={goBack}
          colors={C}
        />
      )}

      {/* ── Payment ───────────────────────────────────────────── */}
      {step === 'payment' && (
        <PaymentStep
          clientSecret={clientSecret}
          depositAmount={depositAmount}
          customerName={customer?.name || ''}
          customerEmail={customer?.email || ''}
          isDemo={isDemo}
          onSuccess={async () => {
            // Confirm payment on backend
            try {
              await fetch(`/api/proposals/public/${token}/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  package_id: selectedPackageId,
                  package_name: selectedPkg?.name,
                  upsell_ids: selectedUpsellIds,
                  stripe_payment_intent_id: paymentIntentId,
                  total_amount: total,
                  deposit_amount: depositAmount,
                }),
              })
            } catch {}
            goNext()
          }}
          onBack={goBack}
          colors={C}
        />
      )}

      {/* ── Success ───────────────────────────────────────────── */}
      {step === 'success' && (
        <SuccessStep
          packageName={selectedPkg?.name || ''}
          total={total}
          depositAmount={depositAmount}
          colors={C}
        />
      )}
    </div>
  )
}
