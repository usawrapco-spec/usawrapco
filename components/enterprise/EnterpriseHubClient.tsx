'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  Building2, Globe, Key, Shield, BarChart3, Download, Upload,
  Settings, Users, Zap, Bell, Lock, CheckCircle2, AlertTriangle,
  ChevronRight, Copy, RefreshCw, Plug, Code2, Webhook,
  FileDown, Database, Activity, Clock, Star, ArrowUpRight,
} from 'lucide-react'

interface Props {
  profile: Profile
  orgStats: {
    totalJobs: number
    totalRevenue: number
    totalCustomers: number
    teamSize: number
    joinedDate: string
  }
}

const TABS = [
  { id: 'overview',    label: 'Overview',       icon: Building2 },
  { id: 'api',         label: 'API Access',     icon: Key },
  { id: 'white_label', label: 'White Label',    icon: Globe },
  { id: 'audit',       label: 'Audit Log',      icon: Activity },
  { id: 'data',        label: 'Data & Export',  icon: Database },
  { id: 'billing',     label: 'Plan & Billing', icon: Star },
]

const PLAN_FEATURES = {
  starter: ['Up to 3 users', '50 jobs/month', 'Basic analytics', 'Email support'],
  pro: ['Up to 10 users', 'Unlimited jobs', 'Full analytics', 'Priority support', 'API access', 'Custom domain'],
  enterprise: ['Unlimited users', 'Unlimited jobs', 'Advanced analytics', 'Dedicated support', 'Full API', 'White label', 'Multi-location', 'Audit logs', 'SSO/SAML', 'Custom integrations'],
}

const AUDIT_LOG_SAMPLE = [
  { id: 1, action: 'Job created', user: 'Tyler Reid', resource: 'Ford F-150 Full Wrap', time: '2 min ago', type: 'create' },
  { id: 2, action: 'Stage advanced', user: 'Amanda Cross', resource: 'Tesla Model 3 → Production', time: '14 min ago', type: 'update' },
  { id: 3, action: 'Invoice sent', user: 'Tyler Reid', resource: 'INV-2024-041 · $4,200', time: '1 hr ago', type: 'send' },
  { id: 4, action: 'Settings changed', user: 'Admin', resource: 'Commission rates updated', time: '3 hr ago', type: 'settings' },
  { id: 5, action: 'User invited', user: 'Admin', resource: 'jake@usawrapco.com · installer', time: '1 day ago', type: 'create' },
  { id: 6, action: 'Job completed', user: 'Jake Martinez', resource: 'BMW M4 Green Wrap → Done', time: '1 day ago', type: 'complete' },
  { id: 7, action: 'Estimate sent', user: 'Tyler Reid', resource: 'Sprinter Fleet · $18,400', time: '2 days ago', type: 'send' },
  { id: 8, action: 'Customer added', user: 'Amanda Cross', resource: 'Pacific Fleet Services LLC', time: '2 days ago', type: 'create' },
]

const WEBHOOK_EVENTS = [
  'job.created', 'job.stage_changed', 'job.completed',
  'estimate.sent', 'estimate.accepted', 'invoice.paid',
  'customer.created', 'installer.bid_accepted',
]

export default function EnterpriseHubClient({ profile, orgStats }: Props) {
  const [activeTab, setActiveTab] = useState('overview')
  const [apiKey, setApiKey] = useState('usa_sk_live_••••••••••••••••••••••••••••••••')
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['job.created', 'job.stage_changed'])
  const [whiteLabelDomain, setWhiteLabelDomain] = useState('')
  const [whiteLabelCompany, setWhiteLabelCompany] = useState('USA Wrap Co')
  const [whiteLabelColor, setWhiteLabelColor] = useState('#4f7fff')
  const [saving, setSaving] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  const supabase = createClient()

  function copyKey() {
    navigator.clipboard.writeText('usa_sk_live_demo_key_replace_in_prod')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function regenerateKey() {
    if (!confirm('Regenerate API key? Your old key will stop working immediately.')) return
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const rand = Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    setApiKey(`usa_sk_live_${rand}`)
    setShowKey(true)
  }

  async function handleExport(type: 'jobs' | 'customers' | 'invoices' | 'full') {
    setExportLoading(true)
    try {
      let data: any[] = []
      if (type === 'jobs' || type === 'full') {
        const { data: jobs } = await supabase.from('projects').select('*').eq('org_id', profile.org_id)
        if (type === 'jobs') data = jobs || []
        else data = [...(jobs || [])]
      }
      if (type === 'customers' || type === 'full') {
        const { data: customers } = await supabase.from('customers').select('*').eq('org_id', profile.org_id)
        if (type === 'customers') data = customers || []
        else data.push(...(customers || []))
      }
      if (type === 'invoices') {
        const { data: inv } = await supabase.from('invoices').select('*').eq('org_id', profile.org_id)
        data = inv || []
      }

      const csv = [
        Object.keys(data[0] || {}).join(','),
        ...data.map(r => Object.values(r).map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')),
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `usawrapco_${type}_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
    } finally {
      setExportLoading(false)
    }
  }

  async function saveWhiteLabel() {
    setSaving(true)
    await supabase.from('app_state').upsert({
      org_id: profile.org_id,
      key: 'white_label',
      value: { domain: whiteLabelDomain, company: whiteLabelCompany, brand_color: whiteLabelColor },
    }, { onConflict: 'org_id,key' })
    setSaving(false)
  }

  function toggleEvent(ev: string) {
    setSelectedEvents(prev =>
      prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]
    )
  }

  const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 32, fontWeight: 900, color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Building2 size={28} style={{ color: 'var(--purple)' }} /> Enterprise Hub
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
            Advanced tools for scaling your operation — API, white label, audit logs, data export
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ padding: '4px 12px', borderRadius: 20, background: 'var(--purple)', color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: '0.05em' }}>
            ENTERPRISE
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, overflowX: 'auto', borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
              border: 'none', borderRadius: '6px 6px 0 0', cursor: 'pointer',
              fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
              background: activeTab === tab.id ? 'var(--surface)' : 'transparent',
              color: activeTab === tab.id ? 'var(--purple)' : 'var(--text3)',
              borderBottom: activeTab === tab.id ? '2px solid var(--purple)' : '2px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Org stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {[
              { label: 'Total Jobs', value: orgStats.totalJobs.toLocaleString(), icon: BarChart3, color: 'var(--accent)' },
              { label: 'Total Revenue', value: fmtMoney(orgStats.totalRevenue), icon: Star, color: 'var(--green)' },
              { label: 'Customers', value: orgStats.totalCustomers.toLocaleString(), icon: Users, color: 'var(--cyan)' },
              { label: 'Team Size', value: orgStats.teamSize.toString(), icon: Shield, color: 'var(--purple)' },
            ].map(stat => (
              <div key={stat.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <stat.icon size={16} style={{ color: stat.color }} />
                  <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>{stat.label}</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Feature matrix */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={16} style={{ color: 'var(--purple)' }} />
              <span style={{ fontWeight: 800, color: 'var(--text1)', fontSize: 15 }}>Your Enterprise Features</span>
            </div>
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              {[
                { label: 'Full REST API Access', desc: 'Integrate with any system via our API', icon: Code2, active: true },
                { label: 'White Label Domain', desc: 'Custom domain + your branding', icon: Globe, active: true },
                { label: 'Audit Log', desc: 'Full activity trail for compliance', icon: Activity, active: true },
                { label: 'Data Export', desc: 'Export all data as CSV or JSON', icon: Download, active: true },
                { label: 'Webhook Events', desc: 'Real-time push to your endpoints', icon: Webhook, active: true },
                { label: 'SSO / SAML', desc: 'Single sign-on for enterprise teams', icon: Lock, active: false },
                { label: 'Multi-Location', desc: 'Separate orgs under one roof', icon: Building2, active: false },
                { label: 'Custom Integrations', desc: 'Tailored API connectors', icon: Plug, active: false },
              ].map(feat => (
                <div key={feat.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 8, background: feat.active ? 'rgba(139,92,246,0.06)' : 'var(--surface2)', border: `1px solid ${feat.active ? 'rgba(139,92,246,0.2)' : 'var(--border)'}` }}>
                  <feat.icon size={16} style={{ color: feat.active ? 'var(--purple)' : 'var(--text3)', marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: feat.active ? 'var(--text1)' : 'var(--text3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {feat.label}
                      {feat.active
                        ? <CheckCircle2 size={12} style={{ color: 'var(--green)' }} />
                        : <Lock size={12} style={{ color: 'var(--text3)' }} />}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{feat.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {[
              { label: 'API Documentation', desc: 'Explore the REST API', icon: Code2, onClick: () => setActiveTab('api') },
              { label: 'Export All Data', desc: 'Download everything as CSV', icon: FileDown, onClick: () => setActiveTab('data') },
              { label: 'View Audit Log', desc: 'See all recent activity', icon: Activity, onClick: () => setActiveTab('audit') },
              { label: 'Configure White Label', desc: 'Custom domain + branding', icon: Globe, onClick: () => setActiveTab('white_label') },
            ].map(action => (
              <button
                key={action.label}
                onClick={action.onClick}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', width: '100%' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--purple)'; e.currentTarget.style.background = 'rgba(139,92,246,0.05)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)' }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <action.icon size={16} style={{ color: 'var(--purple)' }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{action.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{action.desc}</div>
                </div>
                <ChevronRight size={14} style={{ color: 'var(--text3)', marginLeft: 'auto' }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── API ACCESS TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'api' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 800 }}>
          {/* API Key */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Key size={16} style={{ color: 'var(--accent)' }} />
              <span style={{ fontWeight: 800, color: 'var(--text1)', fontSize: 15 }}>API Key</span>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text3)' }}>
                Use this key to authenticate API requests. Keep it secret — never expose it in client-side code.
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200, fontFamily: 'JetBrains Mono, monospace', fontSize: 13, padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)', color: 'var(--text2)', letterSpacing: showKey ? 'normal' : '0.15em', wordBreak: 'break-all' }}>
                  {showKey ? 'usa_sk_live_demo_key_replace_in_prod_abc123xyz' : '••••••••••••••••••••••••••••••••••••••'}
                </div>
                <button onClick={() => setShowKey(v => !v)} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text2)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                  {showKey ? 'Hide' : 'Reveal'}
                </button>
                <button onClick={copyKey} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: copied ? 'rgba(34,192,122,0.1)' : 'var(--surface2)', color: copied ? 'var(--green)' : 'var(--text2)', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button onClick={regenerateKey} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(242,90,90,0.3)', background: 'rgba(242,90,90,0.08)', color: 'var(--red)', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <RefreshCw size={14} /> Regenerate
                </button>
              </div>
            </div>
          </div>

          {/* Webhook config */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Webhook size={16} style={{ color: 'var(--cyan)' }} />
              <span style={{ fontWeight: 800, color: 'var(--text1)', fontSize: 15 }}>Webhook Endpoint</span>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text3)' }}>
                Send real-time events to your endpoint when things happen in your account.
              </div>
              <input
                value={webhookUrl}
                onChange={e => setWebhookUrl(e.target.value)}
                placeholder="https://your-server.com/webhooks/usawrapco"
                style={{ width: '100%', padding: '10px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 13, fontFamily: 'JetBrains Mono, monospace', outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
              />
              <div style={{ marginBottom: 10, fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Events to Send</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {WEBHOOK_EVENTS.map(ev => (
                  <button
                    key={ev}
                    onClick={() => toggleEvent(ev)}
                    style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${selectedEvents.includes(ev) ? 'var(--cyan)' : 'var(--border)'}`, background: selectedEvents.includes(ev) ? 'rgba(34,211,238,0.1)' : 'var(--surface2)', color: selectedEvents.includes(ev) ? 'var(--cyan)' : 'var(--text3)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', transition: 'all 0.1s' }}
                  >
                    {ev}
                  </button>
                ))}
              </div>
              <button style={{ marginTop: 16, padding: '10px 20px', background: 'var(--cyan)', border: 'none', borderRadius: 8, color: '#000', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                Save Webhook
              </button>
            </div>
          </div>

          {/* API quick reference */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Code2 size={16} style={{ color: 'var(--amber)' }} />
              <span style={{ fontWeight: 800, color: 'var(--text1)', fontSize: 15 }}>Quick Reference</span>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { method: 'GET', path: '/api/v1/projects', desc: 'List all jobs' },
                { method: 'POST', path: '/api/v1/projects', desc: 'Create a new job' },
                { method: 'GET', path: '/api/v1/customers', desc: 'List all customers' },
                { method: 'POST', path: '/api/v1/estimates', desc: 'Create an estimate' },
                { method: 'GET', path: '/api/v1/invoices', desc: 'List all invoices' },
                { method: 'POST', path: '/api/v1/webhooks/test', desc: 'Send a test event' },
              ].map(ep => (
                <div key={ep.path} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8, fontFamily: 'JetBrains Mono, monospace' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: ep.method === 'GET' ? 'rgba(34,192,122,0.15)' : 'rgba(79,127,255,0.15)', color: ep.method === 'GET' ? 'var(--green)' : 'var(--accent)', minWidth: 48, textAlign: 'center' }}>
                    {ep.method}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text2)', flex: 1 }}>{ep.path}</span>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>{ep.desc}</span>
                  <ArrowUpRight size={14} style={{ color: 'var(--text3)' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── WHITE LABEL TAB ──────────────────────────────────────────────────── */}
      {activeTab === 'white_label' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 700 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Globe size={16} style={{ color: 'var(--cyan)' }} />
              <span style={{ fontWeight: 800, color: 'var(--text1)', fontSize: 15 }}>White Label Settings</span>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Custom Domain</label>
                <input
                  value={whiteLabelDomain}
                  onChange={e => setWhiteLabelDomain(e.target.value)}
                  placeholder="crm.yourbrand.com"
                  style={{ width: '100%', padding: '10px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>Add a CNAME record pointing to app.usawrapco.com</div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company Name</label>
                <input
                  value={whiteLabelCompany}
                  onChange={e => setWhiteLabelCompany(e.target.value)}
                  placeholder="Your Company Name"
                  style={{ width: '100%', padding: '10px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Brand Color</label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    type="color"
                    value={whiteLabelColor}
                    onChange={e => setWhiteLabelColor(e.target.value)}
                    style={{ width: 44, height: 44, borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', background: 'var(--surface2)', padding: 4 }}
                  />
                  <input
                    value={whiteLabelColor}
                    onChange={e => setWhiteLabelColor(e.target.value)}
                    placeholder="#4f7fff"
                    style={{ padding: '10px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 13, outline: 'none', fontFamily: 'JetBrains Mono, monospace', width: 120 }}
                  />
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>Applied to buttons, accents, and nav</div>
                </div>
              </div>

              {/* Preview */}
              <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: 16, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Preview</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: whiteLabelColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={14} color="#fff" />
                  </div>
                  <span style={{ fontWeight: 800, color: 'var(--text1)', fontSize: 15 }}>{whiteLabelCompany || 'Your Company'}</span>
                </div>
                {whiteLabelDomain && (
                  <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
                    https://{whiteLabelDomain}
                  </div>
                )}
                <button style={{ marginTop: 10, padding: '7px 16px', borderRadius: 6, border: 'none', background: whiteLabelColor, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Sample Button
                </button>
              </div>

              <button
                onClick={saveWhiteLabel}
                disabled={saving}
                style={{ alignSelf: 'flex-start', padding: '10px 24px', background: 'var(--accent)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Saving…' : 'Save White Label Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AUDIT LOG TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>Full activity trail for your organization — every action, every user.</div>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text2)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              <Download size={13} /> Export Log
            </button>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
              {['All Actions', 'Job Events', 'Settings', 'Users'].map(f => (
                <button key={f} style={{ fontSize: 12, fontWeight: 600, color: f === 'All Actions' ? 'var(--accent)' : 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}>
                  {f}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {AUDIT_LOG_SAMPLE.map((entry, i) => {
                const typeColor = {
                  create: 'var(--green)', update: 'var(--cyan)', send: 'var(--accent)',
                  settings: 'var(--amber)', complete: 'var(--purple)',
                }[entry.type] || 'var(--text3)'
                return (
                  <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < AUDIT_LOG_SAMPLE.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.1s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: typeColor, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{entry.action}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{entry.resource}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>{entry.user}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{entry.time}</div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
              <button style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                Load More Events
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DATA & EXPORT TAB ────────────────────────────────────────────────── */}
      {activeTab === 'data' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 700 }}>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>
            Download a full copy of your data at any time. Files export as CSV and open in Excel, Google Sheets, or any data tool.
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Download size={16} style={{ color: 'var(--green)' }} />
              <span style={{ fontWeight: 800, color: 'var(--text1)', fontSize: 15 }}>Export Data</span>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { key: 'jobs' as const, label: 'All Jobs', desc: 'Complete job history with stages, revenue, profit', icon: BarChart3, color: 'var(--accent)' },
                { key: 'customers' as const, label: 'Customers', desc: 'Contact info, lifetime spend, referral source', icon: Users, color: 'var(--cyan)' },
                { key: 'invoices' as const, label: 'Invoices', desc: 'All invoices with line items and payment status', icon: FileDown, color: 'var(--green)' },
                { key: 'full' as const, label: 'Full Export', desc: 'Everything — jobs, customers, invoices combined', icon: Database, color: 'var(--purple)' },
              ].map(exp => (
                <div key={exp.key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: `${exp.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <exp.icon size={18} style={{ color: exp.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>{exp.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{exp.desc}</div>
                  </div>
                  <button
                    onClick={() => handleExport(exp.key)}
                    disabled={exportLoading}
                    style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${exp.color}40`, background: `${exp.color}10`, color: exp.color, fontSize: 12, fontWeight: 700, cursor: exportLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: exportLoading ? 0.6 : 1, whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    <Download size={13} /> Download CSV
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Import */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Upload size={16} style={{ color: 'var(--amber)' }} />
              <span style={{ fontWeight: 800, color: 'var(--text1)', fontSize: 15 }}>Import Data</span>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ padding: 24, border: '2px dashed var(--border)', borderRadius: 10, textAlign: 'center', color: 'var(--text3)' }}>
                <Upload size={24} style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)', marginBottom: 4 }}>Drag & Drop CSV File</div>
                <div style={{ fontSize: 12 }}>or click to browse — Jobs, Customers, or Inventory</div>
                <button style={{ marginTop: 14, padding: '8px 20px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text2)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Choose File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── BILLING TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'billing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 800 }}>
          {/* Current plan */}
          <div style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(79,127,255,0.08))', border: '1px solid rgba(139,92,246,0.4)', borderRadius: 12, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Star size={18} style={{ color: 'var(--purple)' }} />
                  <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--text1)' }}>Enterprise Plan</span>
                  <span style={{ padding: '2px 10px', borderRadius: 20, background: 'var(--purple)', color: '#fff', fontSize: 11, fontWeight: 800 }}>ACTIVE</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>
                  Next billing: March 1, 2026 · Renews automatically
                </div>
                <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>
                  $299<span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text3)' }}>/month</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text2)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Manage Billing
                </button>
                <button style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid rgba(242,90,90,0.3)', background: 'rgba(242,90,90,0.05)', color: 'var(--red)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Cancel Plan
                </button>
              </div>
            </div>
          </div>

          {/* Plan comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {Object.entries(PLAN_FEATURES).map(([plan, features]) => (
              <div key={plan} style={{ background: plan === 'enterprise' ? 'rgba(139,92,246,0.06)' : 'var(--surface)', border: `1px solid ${plan === 'enterprise' ? 'rgba(139,92,246,0.4)' : 'var(--border)'}`, borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text1)', textTransform: 'capitalize' }}>{plan}</span>
                  {plan === 'enterprise' && <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--purple)' }}>CURRENT</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {features.map(feat => (
                    <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle2 size={13} style={{ color: 'var(--green)', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--text2)' }}>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
