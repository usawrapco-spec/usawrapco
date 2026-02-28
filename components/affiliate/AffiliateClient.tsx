'use client'
import { ORG_ID } from '@/lib/org'


import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  Plus, Users, DollarSign, TrendingUp, Link2, Mail, Phone,
  Building2, CheckCircle, Clock, BarChart3, Send, Copy,
  ChevronDown, X, Star, Handshake, Calculator,
} from 'lucide-react'

interface AffiliateClientProps {
  profile: Profile
  affiliates: any[]
  commissions: any[]
}

const APP_URL = typeof window !== 'undefined' ? window.location.origin : 'https://app.usawrapco.com'

const fM = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

type TabKey = 'dashboard' | 'affiliates' | 'commissions' | 'roi-calc' | 'onboarding'

export default function AffiliateClient({ profile, affiliates: initial, commissions }: AffiliateClientProps) {
  const supabase = createClient()
  const [affiliates, setAffiliates] = useState(initial)
  const [tab, setTab] = useState<TabKey>('dashboard')
  const [showNewModal, setShowNewModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [toast, setToast] = useState('')
  const [selectedAffiliate, setSelectedAffiliate] = useState<any>(null)

  // New affiliate form
  const [form, setForm] = useState({
    name: '', company: '', email: '', phone: '',
    type: 'dealer', commission_type: 'percent_gp',
    commission_rate: '10', notes: '',
  })

  // ROI Calculator state
  const [roi, setRoi] = useState({ monthlySales: 100, avgVehiclePrice: 45000, attachRate: 10 })

  function showMsg(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  function generateCode(name: string): string {
    return name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8) + Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  }

  async function createAffiliate() {
    if (!form.name) { showMsg('Name required'); return }
    setSaving(true)
    const code = generateCode(form.name)
    const { data, error } = await supabase.from('affiliates').insert({
      org_id: ORG_ID,
      name: form.name,
      company: form.company,
      email: form.email,
      phone: form.phone,
      type: form.type,
      commission_structure: {
        type: form.commission_type,
        rate: parseFloat(form.commission_rate) || 10,
      },
      status: 'active',
      onboarding_completed: false,
      onboarding_step: 0,
      unique_code: code,
      unique_link: `${APP_URL}/ref/${code}`,
      notes: form.notes,
    }).select().single()

    if (!error && data) {
      setAffiliates(prev => [data, ...prev])
      setShowNewModal(false)
      setShowNotes(false)
      setForm({ name: '', company: '', email: '', phone: '', type: 'dealer', commission_type: 'percent_gp', commission_rate: '10', notes: '' })
      showMsg('Affiliate created!')
    } else {
      showMsg(error?.message || 'Error creating affiliate')
    }
    setSaving(false)
  }

  async function sendOnboardingLink(affiliate: any) {
    if (!affiliate.email) { showMsg('No email on file'); return }
    const link = affiliate.unique_link || `${APP_URL}/ref/${affiliate.unique_code}`
    // In production, send via email API. For now, copy to clipboard.
    await navigator.clipboard.writeText(link)
    showMsg('Onboarding link copied to clipboard!')
  }

  function copyLink(link: string) {
    navigator.clipboard.writeText(link)
    showMsg('Link copied!')
  }

  // Metrics
  const totalCommOwed = commissions.filter(c => c.status === 'pending').reduce((s, c) => s + (c.amount || 0), 0)
  const totalCommPaid = commissions.filter(c => c.status === 'paid').reduce((s, c) => s + (c.amount || 0), 0)
  const totalRevGenerated = commissions.reduce((s, c) => s + (c.project?.revenue || 0), 0)
  const activeAffiliates = affiliates.filter(a => a.status === 'active').length

  // ROI Calc
  const roiMonthly = useMemo(() => {
    const wrapsPerMonth = roi.monthlySales * (roi.attachRate / 100)
    const avgWrapRevenue = 3500 // avg wrap job
    const avgCommission = avgWrapRevenue * 0.10 // 10% of wrap revenue as referral
    return {
      wrapsPerMonth: Math.round(wrapsPerMonth * 10) / 10,
      monthlyComm: Math.round(wrapsPerMonth * avgCommission),
      annualComm: Math.round(wrapsPerMonth * avgCommission * 12),
      revenueGenerated: Math.round(wrapsPerMonth * avgWrapRevenue),
    }
  }, [roi])

  const TABS: { key: TabKey; label: string; Icon: any }[] = [
    { key: 'dashboard', label: 'Dashboard', Icon: BarChart3 },
    { key: 'affiliates', label: 'Affiliates', Icon: Users },
    { key: 'commissions', label: 'Commissions', Icon: DollarSign },
    { key: 'roi-calc', label: 'ROI Calculator', Icon: Calculator },
    { key: 'onboarding', label: 'Onboarding Flow', Icon: CheckCircle },
  ]

  const TYPE_COLORS: Record<string, string> = {
    dealer: '#22d3ee', manufacturer: '#8b5cf6', reseller: '#f59e0b', individual: '#22c07a',
  }

  const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 13, outline: 'none' }
  const sel: React.CSSProperties = { ...inp }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {toast && <div style={{ position: 'fixed', bottom: 20, right: 20, background: '#22c07a', color: '#fff', borderRadius: 10, padding: '12px 20px', fontSize: 13, fontWeight: 700, zIndex: 9999 }}>{toast}</div>}

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 900, color: 'var(--text1)', lineHeight: 1 }}>Affiliate Program</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>Manage dealers, resellers, and referral partners</div>
        </div>
        <button onClick={() => setShowNewModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
          <Plus size={15} />New Affiliate
        </button>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Active Affiliates', value: activeAffiliates, color: 'var(--cyan)', Icon: Users },
          { label: 'Commission Owed', value: fM(totalCommOwed), color: 'var(--amber)', Icon: DollarSign },
          { label: 'Commission Paid', value: fM(totalCommPaid), color: 'var(--green)', Icon: CheckCircle },
          { label: 'Revenue Generated', value: fM(totalRevGenerated), color: 'var(--accent)', Icon: TrendingUp },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Icon size={16} color={color} />
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.07em' }}>{label}</div>
            </div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 22, fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(t => {
          const isActive = tab === t.key
          return (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'none', borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent', color: isActive ? 'var(--accent)' : 'var(--text3)', marginBottom: -1 }}>
              <t.Icon size={14} />{t.label}
            </button>
          )
        })}
      </div>

      {/* ── DASHBOARD TAB ── */}
      {tab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {affiliates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>
              <Handshake size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text2)', marginBottom: 8 }}>No affiliates yet</div>
              <div style={{ fontSize: 13, marginBottom: 20 }}>Add dealers, resellers, and referral partners to start tracking commissions</div>
              <button onClick={() => setShowNewModal(true)} style={{ padding: '10px 24px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>Add First Affiliate</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {affiliates.slice(0, 6).map(a => {
                const aComms = commissions.filter(c => c.affiliate_id === a.id)
                const earned = aComms.reduce((s, c) => s + (c.amount || 0), 0)
                return (
                  <div key={a.id} onClick={() => { setSelectedAffiliate(a); setTab('affiliates') }} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)' }}>{a.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{a.company || a.type}</div>
                      </div>
                      <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: `${TYPE_COLORS[a.type] || '#9299b5'}18`, color: TYPE_COLORS[a.type] || '#9299b5' }}>{a.type}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div style={{ textAlign: 'center', padding: '6px 8px', background: 'var(--surface2)', borderRadius: 8 }}>
                        <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 700 }}>Jobs</div>
                        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 16, fontWeight: 800, color: 'var(--cyan)' }}>{aComms.length}</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '6px 8px', background: 'var(--surface2)', borderRadius: 8 }}>
                        <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 700 }}>Earned</div>
                        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 16, fontWeight: 800, color: 'var(--green)' }}>{fM(earned)}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── AFFILIATES TAB ── */}
      {tab === 'affiliates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {affiliates.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)', fontSize: 13 }}>No affiliates. Add one to get started.</div>
          )}
          {affiliates.map(a => {
            const aComms = commissions.filter(c => c.affiliate_id === a.id)
            const earned = aComms.reduce((s, c) => s + (c.amount || 0), 0)
            const owed = aComms.filter(c => c.status === 'pending').reduce((s, c) => s + (c.amount || 0), 0)
            const link = a.unique_link || `${APP_URL}/ref/${a.unique_code || 'N/A'}`
            const isSelected = selectedAffiliate?.id === a.id
            return (
              <div key={a.id} style={{ background: 'var(--surface)', border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)' }}>{a.name}</div>
                      <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700, background: `${TYPE_COLORS[a.type] || '#9299b5'}18`, color: TYPE_COLORS[a.type] || '#9299b5' }}>{a.type}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700, background: a.status === 'active' ? 'rgba(34,192,122,.15)' : 'rgba(242,90,90,.15)', color: a.status === 'active' ? 'var(--green)' : 'var(--red)' }}>{a.status}</span>
                    </div>
                    {a.company && <div style={{ fontSize: 12, color: 'var(--text3)' }}><Building2 size={11} style={{ display: 'inline', marginRight: 4 }} />{a.company}</div>}
                    <div style={{ display: 'flex', gap: 16, marginTop: 4, fontSize: 11, color: 'var(--text3)' }}>
                      {a.email && <span><Mail size={11} style={{ display: 'inline', marginRight: 4 }} />{a.email}</span>}
                      {a.phone && <span><Phone size={11} style={{ display: 'inline', marginRight: 4 }} />{a.phone}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => sendOnboardingLink(a)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: 'rgba(34,192,122,.12)', color: 'var(--green)', border: '1px solid rgba(34,192,122,.3)', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      <Send size={12} />Send Onboarding
                    </button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
                  {[
                    { label: 'Commission Rate', value: `${(a.commission_structure?.rate || 10)}%`, color: 'var(--cyan)' },
                    { label: 'Jobs Sourced', value: aComms.length, color: 'var(--text1)' },
                    { label: 'Total Earned', value: fM(earned), color: 'var(--green)' },
                    { label: 'Owed', value: fM(owed), color: owed > 0 ? 'var(--amber)' : 'var(--text3)' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ textAlign: 'center', padding: '8px', background: 'var(--surface2)', borderRadius: 8 }}>
                      <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 15, fontWeight: 800, color, marginTop: 2 }}>{value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8, fontSize: 11 }}>
                  <Link2 size={12} color="var(--text3)" />
                  <span style={{ flex: 1, color: 'var(--text3)', fontFamily: 'JetBrains Mono', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link}</span>
                  <button onClick={() => copyLink(link)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'none', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text3)', fontSize: 11 }}>
                    <Copy size={11} />Copy
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── COMMISSIONS TAB ── */}
      {tab === 'commissions' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Affiliate', 'Project', 'Amount', 'Status', 'Date'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', fontFamily: 'Barlow Condensed, sans-serif' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {commissions.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No commissions yet</td></tr>
              )}
              {commissions.map(c => {
                const aff = affiliates.find(a => a.id === c.affiliate_id)
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text1)', fontWeight: 600 }}>{aff?.name || 'Unknown'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text2)' }}>{c.project?.title || c.project_id?.slice(-8)}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 800, color: 'var(--green)' }}>{fM(c.amount || 0)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: c.status === 'paid' ? 'rgba(34,192,122,.15)' : 'rgba(245,158,11,.15)', color: c.status === 'paid' ? 'var(--green)' : 'var(--amber)' }}>{c.status}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 11, color: 'var(--text3)' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── ROI CALCULATOR TAB ── */}
      {tab === 'roi-calc' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--text1)', marginBottom: 6 }}>Affiliate ROI Calculator</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>Show partners their earning potential before they sign up</div>
            {[
              { label: 'Monthly Vehicle Sales', key: 'monthlySales', min: 1, max: 500, step: 1, suffix: 'vehicles/mo' },
              { label: 'Average Vehicle Price', key: 'avgVehiclePrice', min: 10000, max: 200000, step: 1000, suffix: '$' },
              { label: 'Wrap Attach Rate', key: 'attachRate', min: 1, max: 100, step: 1, suffix: '%' },
            ].map(({ label, key, min, max, step, suffix }) => (
              <div key={key} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)' }}>{label}</div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
                    {key === 'avgVehiclePrice' ? fM(roi[key as keyof typeof roi]) : `${roi[key as keyof typeof roi]}${suffix}`}
                  </div>
                </div>
                <input type="range" min={min} max={max} step={step} value={roi[key as keyof typeof roi]}
                  onChange={e => setRoi(r => ({ ...r, [key]: parseInt(e.target.value) }))}
                  style={{ width: '100%', accentColor: 'var(--accent)' }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: 'rgba(79,127,255,.08)', border: '1px solid rgba(79,127,255,.3)', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 16 }}>Projected Earnings</div>
              {[
                { label: 'Wraps/Month', value: `${roiMonthly.wrapsPerMonth} jobs`, color: 'var(--cyan)' },
                { label: 'Monthly Commission', value: fM(roiMonthly.monthlyComm), color: 'var(--accent)' },
                { label: 'Annual Commission', value: fM(roiMonthly.annualComm), color: 'var(--green)' },
                { label: 'Revenue You Drive', value: fM(roiMonthly.revenueGenerated) + '/mo', color: 'var(--text1)' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(79,127,255,.15)' }}>
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>{label}</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: 16, fontWeight: 800, color }}>{value}</span>
                </div>
              ))}
            </div>
            <div style={{ background: 'rgba(34,192,122,.06)', border: '1px solid rgba(34,192,122,.25)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', marginBottom: 8 }}>How It Works</div>
              {[
                'Customer buys a vehicle from you',
                'You show them wrap options on your phone or tablet',
                'They pay $250 design deposit — job is transferred to USA Wrap Co',
                'You earn commission on every completed wrap',
                'Track all jobs and earnings in real-time on your portal',
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 12, color: 'var(--text2)' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(34,192,122,.2)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                  {step}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ONBOARDING FLOW TAB ── */}
      {tab === 'onboarding' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--text1)' }}>Affiliate Onboarding Flow</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 4 }}>When you send an affiliate their onboarding link, they go through this process:</div>
          {[
            { step: 1, title: 'Welcome & Explainer Video', desc: 'Walkthrough of USA Wrap Co, the process, and how the partnership works', icon: Star, color: 'var(--accent)' },
            { step: 2, title: 'ROI Calculator', desc: 'Interactive calculator showing their earnings potential based on their sales volume', icon: Calculator, color: 'var(--cyan)' },
            { step: 3, title: 'Commission Structure', desc: 'Transparent breakdown of commission rates, when they get paid, and payment terms', icon: DollarSign, color: 'var(--green)' },
            { step: 4, title: 'Digital Agreement', desc: 'Sign affiliate agreement electronically — all terms clear and transparent', icon: CheckCircle, color: 'var(--amber)' },
            { step: 5, title: 'Direct Deposit Setup', desc: 'Bank routing/account info for commission payments', icon: Handshake, color: 'var(--purple)' },
            { step: 6, title: 'Portal Access + Unique Link', desc: 'Access to their affiliate portal and unique referral link/code', icon: Link2, color: 'var(--accent)' },
          ].map(({ step, title, desc, icon: Icon, color }) => (
            <div key={step} style={{ display: 'flex', gap: 16, padding: 16, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={20} color={color} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 4 }}>Step {step}: {title}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{desc}</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: 'rgba(34,192,122,.12)', color: 'var(--green)' }}>Active</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── NEW AFFILIATE MODAL ── */}
      {showNewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowNewModal(false)}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, width: 480, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 900, color: 'var(--text1)' }}>New Affiliate</div>
              <button onClick={() => setShowNewModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Full Name *', key: 'name', placeholder: 'John Smith' },
                { label: 'Company', key: 'company', placeholder: 'ABC Auto Dealers' },
                { label: 'Email', key: 'email', placeholder: 'john@abcauto.com' },
                { label: 'Phone', key: 'phone', placeholder: '(555) 123-4567' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{label}</div>
                  <input style={inp} value={form[key as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} />
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Type</div>
                  <select style={sel} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="dealer">Dealer</option>
                    <option value="manufacturer">Manufacturer</option>
                    <option value="reseller">Reseller</option>
                    <option value="individual">Individual</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Commission Rate %</div>
                  <input type="number" style={inp} value={form.commission_rate} onChange={e => setForm(f => ({ ...f, commission_rate: e.target.value }))} placeholder="10" min="1" max="50" />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Commission Type</div>
                <select style={sel} value={form.commission_type} onChange={e => setForm(f => ({ ...f, commission_type: e.target.value }))}>
                  <option value="percent_gp">% of Gross Profit</option>
                  <option value="percent_revenue">% of Revenue</option>
                  <option value="flat">Flat Per Job</option>
                </select>
              </div>
              <div>
                {!showNotes ? (
                  <button onClick={() => setShowNotes(true)} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '4px 0' }}>
                    + Add Notes
                  </button>
                ) : (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Notes</div>
                    <textarea style={{ ...inp, minHeight: 60, resize: 'none' }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="How we met, referral terms, special agreements..." />
                  </>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => setShowNewModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 9, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                <button onClick={createAffiliate} disabled={saving} style={{ flex: 2, padding: '10px', borderRadius: 9, background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: 13, opacity: saving ? 0.7 : 1 }}>{saving ? 'Creating…' : 'Create Affiliate'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
