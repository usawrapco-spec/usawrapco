'use client'

import { useState } from 'react'
import { Gift, Copy, CheckCircle, MessageSquare, Share2, DollarSign, Clock, Users } from 'lucide-react'
import { C } from '@/lib/portal-theme'

interface Referral {
  id: string
  customer_name: string | null
  vehicle_desc: string | null
  status: string
  commission_amount: number | null
  created_at: string
}

interface Props {
  dealerName: string
  commissionPct: number
  shareUrl: string
  referrals: Referral[]
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  lead:        { label: 'New Lead',        color: C.text2 },
  estimate:    { label: 'Estimating',      color: C.accent },
  deposit:     { label: 'Deposit In',      color: C.cyan },
  production:  { label: 'In Production',   color: C.purple },
  complete:    { label: 'Complete',        color: C.green },
  paid:        { label: 'Commission Paid', color: C.green },
}

export default function DealerReferralsClient({ dealerName, commissionPct, shareUrl, referrals }: Props) {
  const [copied, setCopied] = useState(false)

  const totalEarned = referrals
    .filter(r => ['complete', 'paid'].includes(r.status))
    .reduce((s, r) => s + (r.commission_amount ?? 0), 0)
  const pending = referrals.filter(r => !['complete', 'paid'].includes(r.status)).length
  const completed = referrals.filter(r => ['complete', 'paid'].includes(r.status)).length

  function copyLink() {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function shareViaSMS() {
    const msg = encodeURIComponent(`Get a free vehicle wrap mockup and instant estimate from ${dealerName}! ${shareUrl}`)
    window.open(`sms:?body=${msg}`, '_self')
  }

  return (
    <div style={{ padding: '24px 16px 40px', maxWidth: 600, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: `${C.green}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px',
        }}>
          <Gift size={26} color={C.green} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text1, margin: '0 0 6px', fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)' }}>
          Referrals
        </h1>
        <p style={{ fontSize: 14, color: C.text2, margin: 0 }}>
          Share your link and earn {commissionPct}% commission on every wrap
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 24 }}>
        {[
          { label: 'Referred', value: referrals.length, icon: Users, color: C.accent },
          { label: 'Active', value: pending, icon: Clock, color: C.amber },
          { label: 'Earned', value: `$${totalEarned.toLocaleString()}`, icon: DollarSign, color: C.green },
        ].map(s => (
          <div key={s.label} style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: '14px 10px', textAlign: 'center',
          }}>
            <s.icon size={16} color={s.color} strokeWidth={1.6} style={{ marginBottom: 4 }} />
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text1, fontFamily: 'JetBrains Mono, monospace' }}>
              {s.value}
            </div>
            <div style={{ fontSize: 10, color: C.text3, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Share Link */}
      <div style={{
        padding: '16px 18px', borderRadius: 12,
        background: C.surface2, border: `1px solid ${C.border}`, marginBottom: 24,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>
          Your Referral Link
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', borderRadius: 8,
          background: C.bg, border: `1px solid ${C.border}`, marginBottom: 12,
        }}>
          <span style={{ flex: 1, fontSize: 12, color: C.accent, fontFamily: 'JetBrains Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {shareUrl}
          </span>
          <button onClick={copyLink} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '6px 12px', borderRadius: 6,
            background: copied ? `${C.green}20` : `${C.accent}15`,
            border: `1px solid ${copied ? C.green : C.accent}30`,
            color: copied ? C.green : C.accent,
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            {copied ? <CheckCircle size={13} /> : <Copy size={13} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={shareViaSMS} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '10px 0', borderRadius: 8,
            background: `${C.green}15`, border: `1px solid ${C.green}30`,
            color: C.green, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            <MessageSquare size={14} /> Text
          </button>
          <button onClick={() => {
            if (navigator.share) navigator.share({ url: shareUrl, title: `Get a wrap from ${dealerName}` })
          }} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '10px 0', borderRadius: 8,
            background: `${C.accent}15`, border: `1px solid ${C.accent}30`,
            color: C.accent, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            <Share2 size={14} /> Share
          </button>
        </div>
      </div>

      {/* Referral History */}
      {referrals.length > 0 && (
        <>
          <h2 style={{ fontSize: 11, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>
            Referral History
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {referrals.map(r => {
              const meta = STATUS_META[r.status] ?? STATUS_META.lead
              return (
                <div key={r.id} style={{
                  background: C.surface, border: `1px solid ${C.border}`,
                  borderRadius: 12, padding: '14px 16px',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: meta.color, flexShrink: 0,
                    boxShadow: `0 0 6px ${meta.color}60`,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text1 }}>
                      {r.customer_name || 'Unnamed'}
                    </div>
                    {r.vehicle_desc && (
                      <div style={{ fontSize: 12, color: C.text2, marginTop: 1 }}>{r.vehicle_desc}</div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: meta.color }}>{meta.label}</div>
                    {r.commission_amount != null && (
                      <div style={{ fontSize: 11, color: C.text3, marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                        ${r.commission_amount.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {referrals.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 20px', color: C.text3 }}>
          <Gift size={32} strokeWidth={1} style={{ marginBottom: 10, opacity: 0.3 }} />
          <div style={{ fontSize: 14, color: C.text2, marginBottom: 4 }}>No referrals yet</div>
          <div style={{ fontSize: 12 }}>Share your link to start earning {commissionPct}% commission</div>
        </div>
      )}
    </div>
  )
}
