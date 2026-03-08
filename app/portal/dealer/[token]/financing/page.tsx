'use client'

import { useState } from 'react'
import { Rocket, CheckCircle, Shield, Copy, MessageSquare, Share2 } from 'lucide-react'
import { C } from '@/lib/portal-theme'

const PLANS = [
  { months: 3,  apr: 0,    label: '3 months',  tag: '0% APR' },
  { months: 6,  apr: 0.10, label: '6 months',  tag: 'Low rate' },
  { months: 12, apr: 0.15, label: '12 months', tag: 'Popular' },
  { months: 24, apr: 0.18, label: '24 months', tag: 'Low monthly' },
  { months: 36, apr: 0.20, label: '36 months', tag: 'Lowest payment' },
]

const PREAPPROVE_URL = 'https://app.usawrapco.com/preapprove'

export default function DealerFinancingPage() {
  const [copied, setCopied] = useState(false)

  function copyLink() {
    navigator.clipboard.writeText(PREAPPROVE_URL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function shareViaSMS() {
    const msg = encodeURIComponent(`Check if you qualify for financing on your wrap project — no credit impact! ${PREAPPROVE_URL}`)
    window.open(`sms:?body=${msg}`, '_self')
  }

  return (
    <div style={{ padding: '24px 16px 40px', maxWidth: 600, margin: '0 auto' }}>

      {/* Hero */}
      <div style={{
        textAlign: 'center', padding: '28px 20px', borderRadius: 16,
        background: `linear-gradient(135deg, ${C.accent}18, ${C.purple}18)`,
        border: `1px solid ${C.accent}30`, marginBottom: 24,
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
        }}>
          <Rocket size={26} color="#fff" />
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: C.accent, textTransform: 'uppercase', marginBottom: 6 }}>
          LaunchPay
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text1, margin: '0 0 8px', fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)' }}>
          Offer Financing to Your Customers
        </h1>
        <p style={{ fontSize: 14, color: C.text2, margin: 0, lineHeight: 1.5 }}>
          Send your customers the pre-approval link below. They check their rate in 30 seconds with no credit impact.
        </p>
      </div>

      {/* Shareable Link */}
      <div style={{
        padding: '16px 18px', borderRadius: 12,
        background: C.surface2, border: `1px solid ${C.border}`, marginBottom: 24,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>
          Pre-Approval Link
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', borderRadius: 8,
          background: C.bg, border: `1px solid ${C.border}`,
          marginBottom: 12,
        }}>
          <span style={{ flex: 1, fontSize: 13, color: C.accent, fontFamily: 'JetBrains Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {PREAPPROVE_URL}
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
            <MessageSquare size={14} /> Text to Customer
          </button>
          <button onClick={() => {
            if (navigator.share) navigator.share({ url: PREAPPROVE_URL, title: 'Check Your Financing Rate' })
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

      {/* Available Plans */}
      <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: C.text3, textTransform: 'uppercase', marginBottom: 10 }}>
        Available Plans
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
        {PLANS.map(plan => (
          <div key={plan.months} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', background: C.surface2, borderRadius: 10, border: `1px solid ${C.border}`,
          }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.text1 }}>{plan.label}</span>
              <span style={{ fontSize: 12, color: C.text3, marginLeft: 8 }}>
                {plan.apr === 0 ? '0% APR' : `${(plan.apr * 100).toFixed(0)}% APR`}
              </span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.accent, background: `${C.accent}15`, padding: '3px 10px', borderRadius: 20 }}>
              {plan.tag}
            </span>
          </div>
        ))}
      </div>

      {/* How to Use */}
      <div style={{
        padding: '16px 18px', borderRadius: 12,
        background: `${C.green}08`, border: `1px solid ${C.green}20`, marginBottom: 20,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text1, marginBottom: 8 }}>How to use</div>
        {['Copy the pre-approval link above', 'Text or email it to your customer', 'They check their rate in 30 seconds', 'Approved customers select Affirm at checkout'].map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.green, fontFamily: 'JetBrains Mono, monospace', width: 16, flexShrink: 0 }}>{i + 1}.</span>
            <span style={{ fontSize: 13, color: C.text2 }}>{step}</span>
          </div>
        ))}
      </div>

      {/* Disclosure */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '12px 14px', background: `${C.surface2}80`, borderRadius: 10, border: `1px solid ${C.border}` }}>
        <Shield size={13} color={C.text3} style={{ flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 10, color: C.text3, margin: 0, lineHeight: 1.5 }}>
          LaunchPay is a financing service powered by Affirm, Inc. All loans are issued by Affirm&rsquo;s lending partners.
          Subject to credit approval. See <a href="https://www.affirm.com/licenses" target="_blank" rel="noopener noreferrer" style={{ color: C.accent }}>affirm.com/licenses</a>.
        </p>
      </div>
    </div>
  )
}
