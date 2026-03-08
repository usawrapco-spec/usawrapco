'use client'

import { Rocket, CheckCircle, Shield, Clock, DollarSign, ArrowRight } from 'lucide-react'
import { C } from '@/lib/portal-theme'

const PLANS = [
  { months: 3,  apr: 0,    label: '3 months',  tag: '0% APR' },
  { months: 6,  apr: 0.10, label: '6 months',  tag: 'Low rate' },
  { months: 12, apr: 0.15, label: '12 months', tag: 'Popular' },
  { months: 24, apr: 0.18, label: '24 months', tag: 'Low monthly' },
  { months: 36, apr: 0.20, label: '36 months', tag: 'Lowest payment' },
]

const STEPS = [
  { icon: CheckCircle, title: 'Check your rate', desc: 'Quick pre-qualification with no impact to your credit score.' },
  { icon: Clock,       title: 'Pick your plan',  desc: 'Choose a payment schedule that fits your budget — 3 to 36 months.' },
  { icon: DollarSign,  title: 'Pay over time',   desc: 'Fixed monthly payments with no hidden fees. You pay Affirm monthly.' },
]

const PERKS = [
  'No hard credit pull to check your rate',
  'Decisions in seconds',
  'No prepayment penalties',
  'Fixed rates — no surprises',
  'Finance projects from $50 to $30,000',
]

export default function PortalFinancingPage() {
  return (
    <div style={{ padding: '24px 16px 40px', maxWidth: 600, margin: '0 auto' }}>
      {/* Hero */}
      <div style={{
        textAlign: 'center',
        padding: '32px 20px',
        borderRadius: 16,
        background: `linear-gradient(135deg, ${C.accent}18, ${C.purple}18)`,
        border: `1px solid ${C.accent}30`,
        marginBottom: 28,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <Rocket size={28} color="#fff" />
        </div>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: 3,
          color: C.accent, textTransform: 'uppercase',
          fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)',
          marginBottom: 8,
        }}>
          LaunchPay
        </div>
        <h1 style={{
          fontSize: 26, fontWeight: 700, color: C.text1, margin: '0 0 8px',
          fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)',
        }}>
          Finance Your Wrap Project
        </h1>
        <p style={{ fontSize: 15, color: C.text2, margin: 0, lineHeight: 1.5 }}>
          Get pre-qualified in seconds with no impact to your credit score.
          Split your project into easy monthly payments.
        </p>
      </div>

      {/* How it works */}
      <h2 style={{
        fontSize: 13, fontWeight: 700, letterSpacing: 2, color: C.text3,
        textTransform: 'uppercase', marginBottom: 16,
        fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)',
      }}>
        How It Works
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
        {STEPS.map((step, i) => {
          const Icon = step.icon
          return (
            <div key={i} style={{
              display: 'flex', gap: 14, padding: '16px 14px',
              background: C.surface2, borderRadius: 12,
              border: `1px solid ${C.border}`,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: `${C.accent}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon size={20} color={C.accent} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.text1, marginBottom: 2 }}>
                  {i + 1}. {step.title}
                </div>
                <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.4 }}>
                  {step.desc}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Available plans */}
      <h2 style={{
        fontSize: 13, fontWeight: 700, letterSpacing: 2, color: C.text3,
        textTransform: 'uppercase', marginBottom: 16,
        fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)',
      }}>
        Available Plans
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
        {PLANS.map((plan) => (
          <div key={plan.months} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px',
            background: C.surface2, borderRadius: 10,
            border: `1px solid ${C.border}`,
          }}>
            <div>
              <span style={{ fontSize: 15, fontWeight: 600, color: C.text1 }}>{plan.label}</span>
              <span style={{ fontSize: 12, color: C.text3, marginLeft: 8 }}>
                {plan.apr === 0 ? '0% APR' : `${(plan.apr * 100).toFixed(0)}% APR`}
              </span>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700, color: C.accent,
              background: `${C.accent}15`, padding: '3px 10px', borderRadius: 20,
            }}>
              {plan.tag}
            </span>
          </div>
        ))}
      </div>

      {/* Perks */}
      <h2 style={{
        fontSize: 13, fontWeight: 700, letterSpacing: 2, color: C.text3,
        textTransform: 'uppercase', marginBottom: 16,
        fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)',
      }}>
        Why LaunchPay
      </h2>
      <div style={{
        padding: '16px 18px',
        background: C.surface2, borderRadius: 12,
        border: `1px solid ${C.border}`,
        marginBottom: 28,
      }}>
        {PERKS.map((perk, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 0',
            borderBottom: i < PERKS.length - 1 ? `1px solid ${C.border}` : 'none',
          }}>
            <CheckCircle size={16} color={C.green} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 14, color: C.text1 }}>{perk}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{
        textAlign: 'center',
        padding: '24px 20px',
        borderRadius: 14,
        background: `linear-gradient(135deg, ${C.green}15, ${C.accent}10)`,
        border: `1px solid ${C.green}30`,
        marginBottom: 20,
      }}>
        <p style={{ fontSize: 15, color: C.text1, margin: '0 0 4px', fontWeight: 600 }}>
          Ready to get started?
        </p>
        <p style={{ fontSize: 13, color: C.text2, margin: '0 0 16px' }}>
          Select <strong>Affirm</strong> as your payment method at checkout to check your rate and choose a plan.
        </p>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 13, color: C.accent, fontWeight: 600,
        }}>
          <ArrowRight size={14} />
          Available on any invoice payment page
        </div>
      </div>

      {/* Disclosure */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 8,
        padding: '12px 14px',
        background: `${C.surface2}80`,
        borderRadius: 10,
        border: `1px solid ${C.border}`,
      }}>
        <Shield size={14} color={C.text3} style={{ flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 11, color: C.text3, margin: 0, lineHeight: 1.5 }}>
          LaunchPay is a financing service powered by Affirm, Inc. All loans are issued by
          Affirm&rsquo;s lending partners. Subject to credit approval. Rates vary by creditworthiness.
          See <a href="https://www.affirm.com/licenses" target="_blank" rel="noopener noreferrer"
            style={{ color: C.accent }}>affirm.com/licenses</a> for details.
        </p>
      </div>
    </div>
  )
}
