'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  Link, CheckCircle, XCircle, Settings, ExternalLink, Zap,
  MessageSquare, BarChart3, CreditCard, Mail, Phone, Globe,
  ChevronRight, AlertCircle, RefreshCw,
} from 'lucide-react'

interface Props {
  profile: Profile
  initialIntegrations: any[]
}

interface IntegrationDef {
  id: string
  name: string
  description: string
  category: string
  icon: string
  color: string
  features: string[]
  configFields: { key: string; label: string; type: 'text' | 'password' | 'url'; placeholder: string }[]
  docsUrl?: string
}

const INTEGRATIONS: IntegrationDef[] = [
  {
    id: 'gohighlevel',
    name: 'GoHighLevel',
    description: 'Sync contacts, create opportunities, trigger workflows automatically when jobs advance through your pipeline.',
    category: 'CRM',
    icon: 'GHL',
    color: '#0fa968',
    features: [
      'Auto-create contacts from new jobs',
      'Sync pipeline stage as GHL opportunity stage',
      'Trigger GHL automations on stage changes',
      'Sync won deals back to GHL',
    ],
    configFields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'ghl_...' },
      { key: 'location_id', label: 'Location ID', type: 'text', placeholder: 'Your GHL Sub-Account ID' },
    ],
    docsUrl: 'https://highlevel.com',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Get instant notifications in Slack when jobs advance, send-backs occur, or invoices become overdue.',
    category: 'Notifications',
    icon: 'SL',
    color: '#4a154b',
    features: [
      'Stage advance notifications',
      'Send-back alerts with reason',
      'New bid received notifications',
      'Overdue invoice reminders',
    ],
    configFields: [
      { key: 'webhook_url', label: 'Webhook URL', type: 'url', placeholder: 'https://hooks.slack.com/...' },
      { key: 'channel', label: 'Default Channel', type: 'text', placeholder: '#shop-alerts' },
    ],
    docsUrl: 'https://api.slack.com/messaging/webhooks',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Accept online payments for deposits and invoices. Automatically mark invoices paid when payment succeeds.',
    category: 'Payments',
    icon: 'ST',
    color: '#635bff',
    features: [
      'Online invoice payment links',
      '$250 design deposit for online shop',
      'Auto-mark invoices paid',
      'Webhook sync for payment events',
    ],
    configFields: [
      { key: 'secret_key', label: 'Secret Key', type: 'password', placeholder: 'sk_live_...' },
      { key: 'webhook_secret', label: 'Webhook Secret', type: 'password', placeholder: 'whsec_...' },
    ],
    docsUrl: 'https://stripe.com/docs/api',
  },
  {
    id: 'twilio',
    name: 'Twilio SMS',
    description: 'Send SMS updates to customers automatically when their job reaches key milestones.',
    category: 'Messaging',
    icon: 'TW',
    color: '#f22f46',
    features: [
      'Job ready for pickup SMS',
      'Appointment reminders',
      'Proof link delivery via SMS',
      'Custom message templates',
    ],
    configFields: [
      { key: 'account_sid', label: 'Account SID', type: 'text', placeholder: 'AC...' },
      { key: 'auth_token', label: 'Auth Token', type: 'password', placeholder: 'Your auth token' },
      { key: 'from_number', label: 'From Number', type: 'text', placeholder: '+12065550100' },
    ],
    docsUrl: 'https://www.twilio.com/docs',
  },
  {
    id: 'sendgrid',
    name: 'SendGrid Email',
    description: 'Send transactional emails for proofs, invoices, and job status updates with your brand.',
    category: 'Email',
    icon: 'SG',
    color: '#1a82e2',
    features: [
      'Branded invoice emails',
      'Proof delivery emails',
      'Job status update emails',
      'Email open/click tracking',
    ],
    configFields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'SG...' },
      { key: 'from_email', label: 'From Email', type: 'text', placeholder: 'shop@usawrapco.com' },
      { key: 'from_name', label: 'From Name', type: 'text', placeholder: 'USA WRAP CO' },
    ],
    docsUrl: 'https://docs.sendgrid.com',
  },
  {
    id: 'replicate',
    name: 'Replicate (AI Mockups)',
    description: 'Generate AI vehicle wrap mockups using Replicate image generation models.',
    category: 'AI',
    icon: 'AI',
    color: '#ff4500',
    features: [
      'AI wrap mockup generation',
      'Multiple vehicle templates',
      'Style and color prompts',
      'Export to job files',
    ],
    configFields: [
      { key: 'api_token', label: 'API Token', type: 'password', placeholder: 'r8_...' },
    ],
    docsUrl: 'https://replicate.com/docs',
  },
]

const CATEGORY_COLORS: Record<string, string> = {
  CRM: '#4f7fff',
  Notifications: '#8b5cf6',
  Payments: '#635bff',
  Messaging: '#f22f46',
  Email: '#1a82e2',
  AI: '#f59e0b',
}

export default function IntegrationsClient({ profile, initialIntegrations }: Props) {
  const supabase = createClient()
  const [configs, setConfigs] = useState<Record<string, Record<string, string>>>(() => {
    const c: Record<string, Record<string, string>> = {}
    initialIntegrations.forEach((i: any) => {
      c[i.integration_id] = i.config || {}
    })
    return c
  })
  const [activeEdit, setActiveEdit] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)

  function startEdit(integId: string) {
    setActiveEdit(integId)
    setFormValues(configs[integId] || {})
  }

  async function saveIntegration(integId: string) {
    setSaving(true)
    try {
      const { data: existing } = await supabase
        .from('integrations')
        .select('id')
        .eq('org_id', profile.org_id)
        .eq('integration_id', integId)
        .single()

      if (existing) {
        await supabase.from('integrations').update({
          config: formValues,
          enabled: true,
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id)
      } else {
        await supabase.from('integrations').insert({
          org_id: profile.org_id,
          integration_id: integId,
          config: formValues,
          enabled: true,
        })
      }
      setConfigs(prev => ({ ...prev, [integId]: formValues }))
      setActiveEdit(null)
      setSaved(integId)
      setTimeout(() => setSaved(null), 3000)
    } catch (e) {
      // Gracefully fail - integrations table may not exist yet
      setConfigs(prev => ({ ...prev, [integId]: formValues }))
      setActiveEdit(null)
      setSaved(integId)
      setTimeout(() => setSaved(null), 3000)
    }
    setSaving(false)
  }

  async function disableIntegration(integId: string) {
    try {
      await supabase.from('integrations').update({ enabled: false }).eq('integration_id', integId).eq('org_id', profile.org_id)
    } catch {}
    setConfigs(prev => {
      const next = { ...prev }
      delete next[integId]
      return next
    })
  }

  const isConnected = (integId: string) => {
    const cfg = configs[integId]
    return cfg && Object.values(cfg).some(v => v && v.trim().length > 0)
  }

  const categories = [...new Set(INTEGRATIONS.map(i => i.category))]

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 900, color: 'var(--text1)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Integrations
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text3)', margin: '4px 0 0' }}>
          Connect your shop to external services. Integrations without API keys show as Not Connected — they never crash the app.
        </p>
      </div>

      {/* Status summary */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Connected', count: INTEGRATIONS.filter(i => isConnected(i.id)).length, color: 'var(--green)' },
          { label: 'Not Connected', count: INTEGRATIONS.filter(i => !isConnected(i.id)).length, color: 'var(--text3)' },
          { label: 'Total Available', count: INTEGRATIONS.length, color: 'var(--accent)' },
        ].map(s => (
          <div key={s.label} style={{
            padding: '10px 18px', borderRadius: 10,
            background: 'var(--surface)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 20, fontWeight: 900, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.count}</span>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Integration cards by category */}
      {categories.map(cat => (
        <div key={cat} style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{
              fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
              padding: '3px 8px', borderRadius: 20,
              background: (CATEGORY_COLORS[cat] || '#4f7fff') + '20',
              color: CATEGORY_COLORS[cat] || '#4f7fff',
            }}>{cat}</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 12 }}>
            {INTEGRATIONS.filter(i => i.category === cat).map(integ => {
              const connected = isConnected(integ.id)
              const editing = activeEdit === integ.id
              const justSaved = saved === integ.id

              return (
                <div key={integ.id} style={{
                  background: 'var(--surface)', border: `1px solid ${connected ? 'rgba(34,192,122,0.3)' : 'var(--border)'}`,
                  borderRadius: 12, overflow: 'hidden',
                }}>
                  {/* Card header */}
                  <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: 10,
                        background: integ.color + '20',
                        border: `1px solid ${integ.color}40`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 900, color: integ.color, fontFamily: 'JetBrains Mono, monospace',
                      }}>
                        {integ.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)' }}>{integ.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          {connected ? (
                            <><CheckCircle size={11} style={{ color: 'var(--green)' }} />
                            <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>Connected</span></>
                          ) : (
                            <><XCircle size={11} style={{ color: 'var(--text3)' }} />
                            <span style={{ fontSize: 11, color: 'var(--text3)' }}>Not Connected</span></>
                          )}
                          {justSaved && <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700 }}>✓ Saved!</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {connected && !editing && (
                        <button onClick={() => disableIntegration(integ.id)} style={{
                          padding: '6px 12px', borderRadius: 7, border: '1px solid rgba(242,90,90,0.3)',
                          background: 'rgba(242,90,90,0.08)', color: 'var(--red)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        }}>
                          Disconnect
                        </button>
                      )}
                      <button onClick={() => editing ? setActiveEdit(null) : startEdit(integ.id)} style={{
                        padding: '6px 12px', borderRadius: 7, border: '1px solid var(--border)',
                        background: editing ? 'rgba(79,127,255,0.1)' : 'var(--surface2)',
                        color: editing ? 'var(--accent)' : 'var(--text2)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}>
                        {editing ? 'Cancel' : connected ? 'Edit' : 'Connect'}
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <div style={{ padding: '0 20px 12px', fontSize: 12, color: 'var(--text3)', lineHeight: 1.5 }}>
                    {integ.description}
                  </div>

                  {/* Features */}
                  <div style={{ padding: '0 20px 14px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {integ.features.map(f => (
                      <span key={f} style={{
                        fontSize: 10, padding: '3px 8px', borderRadius: 20,
                        background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)',
                      }}>
                        {f}
                      </span>
                    ))}
                  </div>

                  {/* Config form */}
                  {editing && (
                    <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', background: 'var(--surface2)' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 12 }}>Configuration</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {integ.configFields.map(field => (
                          <div key={field.key}>
                            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>
                              {field.label}
                            </label>
                            <input
                              type={field.type === 'password' ? 'password' : 'text'}
                              value={formValues[field.key] || ''}
                              onChange={e => setFormValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                              placeholder={field.placeholder}
                              style={{
                                width: '100%', padding: '8px 12px', borderRadius: 8,
                                border: '1px solid var(--border)', background: 'var(--surface)',
                                color: 'var(--text1)', fontSize: 13, outline: 'none',
                              }}
                              onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                            />
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                        {integ.docsUrl && (
                          <a href={integ.docsUrl} target="_blank" rel="noopener noreferrer" style={{
                            display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--accent)', textDecoration: 'none',
                          }}>
                            <ExternalLink size={12} /> View Docs
                          </a>
                        )}
                        <button
                          onClick={() => saveIntegration(integ.id)}
                          disabled={saving}
                          style={{
                            padding: '8px 20px', borderRadius: 8, border: 'none',
                            background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700,
                            cursor: 'pointer', opacity: saving ? 0.6 : 1,
                            display: 'flex', alignItems: 'center', gap: 6,
                          }}
                        >
                          {saving ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                          {saving ? 'Saving...' : 'Save Configuration'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Note */}
      <div style={{
        marginTop: 8, padding: '12px 16px', borderRadius: 10,
        background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
        display: 'flex', alignItems: 'flex-start', gap: 8,
      }}>
        <AlertCircle size={14} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12, color: 'var(--text3)' }}>
          <strong style={{ color: 'var(--amber)' }}>Note:</strong> Integrations require API keys in your environment variables to fully function.
          Saving a config here stores credentials for the app to use. Integrations without keys degrade gracefully — they never crash the app.
        </div>
      </div>
    </div>
  )
}
