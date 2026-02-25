'use client'

import { useState } from 'react'
import {
  CreditCard, CheckCircle2, XCircle, Copy, Check,
  ExternalLink, AlertTriangle, Zap, DollarSign,
} from 'lucide-react'

interface Props {
  stripeConfigured: boolean
  publishableKey: string | null
  webhookConfigured: boolean
  webhookUrl: string
}

function StatusChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700,
      color: ok ? 'var(--green)' : 'var(--red)',
      background: ok ? 'rgba(34,192,122,0.1)' : 'rgba(242,90,90,0.1)',
    }}>
      {ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
      {label}
    </span>
  )
}

function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 700,
        color: 'var(--text3)', marginBottom: 6,
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>{label}</label>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--surface2)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '8px 10px',
      }}>
        <span style={{
          flex: 1, fontSize: 12, color: 'var(--text2)',
          fontFamily: 'JetBrains Mono, monospace', wordBreak: 'break-all',
        }}>
          {value}
        </span>
        <button
          onClick={copy}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 6, border: 'none',
            background: copied ? 'var(--green)' : 'var(--surface)',
            color: copied ? '#fff' : 'var(--text2)',
            fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
            transition: 'background 0.15s',
          }}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}

export default function PaymentSettings({ stripeConfigured, publishableKey, webhookConfigured, webhookUrl }: Props) {
  const allGood = stripeConfigured && webhookConfigured
  const pubKeyMasked = publishableKey
    ? publishableKey.slice(0, 12) + '···' + publishableKey.slice(-4)
    : null

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: 'Barlow Condensed, sans-serif',
          fontSize: 28, fontWeight: 900, color: 'var(--text1)', margin: 0,
        }}>
          Payment Settings
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
          Stripe integration for online invoice payments and deposits.
        </p>
      </div>

      {/* Status overview */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '20px 24px', marginBottom: 20,
      }}>
        <div style={{
          fontFamily: 'Barlow Condensed, sans-serif',
          fontSize: 17, fontWeight: 900, color: 'var(--text1)', marginBottom: 16,
        }}>
          Connection Status
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ background: 'rgba(79,127,255,0.1)', padding: 8, borderRadius: 8 }}>
                <CreditCard size={16} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>Stripe Secret Key</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>STRIPE_SECRET_KEY env var</div>
              </div>
            </div>
            <StatusChip ok={stripeConfigured} label={stripeConfigured ? 'Connected' : 'Missing'} />
          </div>

          <div style={{ borderTop: '1px solid var(--border)' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ background: 'rgba(139,92,246,0.1)', padding: 8, borderRadius: 8 }}>
                <Zap size={16} style={{ color: 'var(--purple)' }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>Webhook Secret</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>STRIPE_WEBHOOK_SECRET env var</div>
              </div>
            </div>
            <StatusChip ok={webhookConfigured} label={webhookConfigured ? 'Configured' : 'Missing'} />
          </div>

          {publishableKey && (
            <>
              <div style={{ borderTop: '1px solid var(--border)' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ background: 'rgba(34,211,238,0.1)', padding: 8, borderRadius: 8 }}>
                    <DollarSign size={16} style={{ color: 'var(--cyan)' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>Publishable Key</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {pubKeyMasked}
                    </div>
                  </div>
                </div>
                <StatusChip
                  ok={true}
                  label={publishableKey.startsWith('pk_live') ? 'Live Mode' : 'Test Mode'}
                />
              </div>
            </>
          )}
        </div>

        {allGood && (
          <div style={{
            marginTop: 16, padding: '10px 14px',
            background: 'rgba(34,192,122,0.06)', border: '1px solid rgba(34,192,122,0.2)',
            borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 13, color: 'var(--green)',
          }}>
            <CheckCircle2 size={14} />
            Stripe is fully configured. Online payments are live.
          </div>
        )}
      </div>

      {/* Webhook URL */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '20px 24px', marginBottom: 20,
      }}>
        <div style={{
          fontFamily: 'Barlow Condensed, sans-serif',
          fontSize: 17, fontWeight: 900, color: 'var(--text1)', marginBottom: 4,
        }}>
          Webhook Endpoint
        </div>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 0, marginBottom: 16 }}>
          Add this URL in your Stripe Dashboard under Developers → Webhooks.
          Select the <code style={{ background: 'var(--surface2)', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>
            checkout.session.completed
          </code> event.
        </p>
        <CopyField value={webhookUrl} label="Webhook URL" />
        <a
          href="https://dashboard.stripe.com/webhooks/create"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            marginTop: 12, fontSize: 13, color: 'var(--accent)',
            textDecoration: 'none',
          }}
        >
          <ExternalLink size={13} /> Open Stripe Webhook Settings
        </a>
      </div>

      {/* Setup guide */}
      {!allGood && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '20px 24px', marginBottom: 20,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 17, fontWeight: 900, color: 'var(--amber)',
          }}>
            <AlertTriangle size={16} /> Setup Required
          </div>
          <ol style={{ margin: 0, padding: '0 0 0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              'Go to dashboard.stripe.com → Developers → API keys',
              'Copy your Secret key (sk_live_... or sk_test_...)',
              'Copy your Publishable key (pk_live_... or pk_test_...)',
              'Add to Vercel: Project Settings → Environment Variables:',
              '  STRIPE_SECRET_KEY = sk_live_...',
              '  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_live_...',
              'Go to Developers → Webhooks → Add endpoint',
              '  URL: ' + webhookUrl,
              '  Event: checkout.session.completed',
              'Copy the Webhook signing secret (whsec_...)',
              '  STRIPE_WEBHOOK_SECRET = whsec_...',
              'Redeploy, then test with a $1 payment',
            ].map((step, i) => (
              <li key={i} style={{
                fontSize: 12, color: step.startsWith('  ') ? 'var(--accent)' : 'var(--text2)',
                lineHeight: 1.5, fontFamily: step.startsWith('  ') ? 'JetBrains Mono, monospace' : 'inherit',
                listStyleType: step.startsWith('  ') ? 'none' : undefined,
                marginLeft: step.startsWith('  ') ? -20 : undefined,
              }}>
                {step.startsWith('  ') ? step.trim() : step}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* How it works */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '20px 24px',
      }}>
        <div style={{
          fontFamily: 'Barlow Condensed, sans-serif',
          fontSize: 17, fontWeight: 900, color: 'var(--text1)', marginBottom: 16,
        }}>
          How It Works
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { step: '1', title: 'Generate payment link', desc: 'From any invoice, copy the payment link and send it to your customer.' },
            { step: '2', title: 'Customer pays online', desc: 'Customer visits the link, sees the invoice amount, and pays securely via Stripe Checkout.' },
            { step: '3', title: 'Auto-recorded', desc: 'Stripe sends a webhook. The payment is automatically recorded on the invoice and the status updates to Paid.' },
          ].map(({ step, title, desc }) => (
            <div key={step} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{
                flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
                background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Barlow Condensed, sans-serif', fontSize: 14, fontWeight: 900, color: '#fff',
              }}>
                {step}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
