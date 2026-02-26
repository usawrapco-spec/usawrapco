'use client'
import { ORG_ID } from '@/lib/org'


import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Plus, DollarSign, TrendingUp, CheckCircle2, Clock, X, ArrowRight } from 'lucide-react'
import type { Profile } from '@/types'

const DEFAULT_RATE = 0.025 // 2.5% cross-department referral rate

const REFERRAL_TYPES = [
  { key: 'cross_dept', label: 'Cross-Department', rate: 0.025, desc: '2.5% of GP' },
  { key: 'customer_referral', label: 'Customer Referral', rate: 0.05, desc: '5% of GP' },
  { key: 'external', label: 'External Partner', rate: 0.03, desc: '3% of GP' },
  { key: 'custom', label: 'Custom Split', rate: 0, desc: 'Set your own rate' },
]

const DIVISION_COLORS: Record<string, string> = {
  wraps: '#4f7fff',
  decking: '#22c07a',
}

interface Props {
  profile: Profile
  referrals: any[]
  team: any[]
  projects: any[]
}

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
const fmtPct = (n: number) => `${Math.round(n * 100)}%`

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    pending:  { label: 'Pending',  color: '#f59e0b', bg: 'rgba(245,158,11,.12)' },
    approved: { label: 'Approved', color: '#22c07a', bg: 'rgba(34,192,122,.12)' },
    paid:     { label: 'Paid',     color: '#8b5cf6', bg: 'rgba(139,92,246,.12)' },
    denied:   { label: 'Denied',   color: '#f25a5a', bg: 'rgba(242,90,90,.12)' },
  }
  const s = map[status] || map.pending
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700, color: s.color, background: s.bg }}>
      {s.label}
    </span>
  )
}

export default function ReferralsClient({ profile, referrals: initial, team, projects }: Props) {
  const supabase = createClient()
  const [referrals, setReferrals] = useState(initial)
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    referrer_id: profile.id,
    referee_id: '',
    project_id: '',
    division_from: 'wraps',
    division_to: 'decking',
    referral_type: 'cross_dept',
    custom_rate: 2.5,
    notes: '',
  })

  // Stats
  const totalEarned = referrals
    .filter(r => r.referrer_id === profile.id && r.status === 'paid')
    .reduce((s, r) => s + (r.commission_amount || 0), 0)

  const totalPending = referrals
    .filter(r => r.referrer_id === profile.id && r.status === 'pending')
    .reduce((s, r) => s + (r.commission_amount || 0), 0)

  const myReferrals = referrals.filter(r => r.referrer_id === profile.id)

  const selectedProject = projects.find(p => p.id === form.project_id)
  const activeType = REFERRAL_TYPES.find(t => t.key === form.referral_type) || REFERRAL_TYPES[0]
  const activeRate = form.referral_type === 'custom' ? (form.custom_rate / 100) : activeType.rate
  const estimatedCommission = selectedProject
    ? Math.max(0, (selectedProject.revenue || 0) * ((selectedProject.gpm || 0) / 100) * activeRate)
    : 0

  async function handleCreate() {
    if (!form.referee_id || !form.project_id) return
    setSaving(true)
    try {
      const { data } = await supabase.from('sales_referrals').insert({
        org_id: profile.org_id || ORG_ID,
        referrer_id: form.referrer_id,
        referee_id: form.referee_id,
        project_id: form.project_id,
        division_from: form.division_from,
        division_to: form.division_to,
        referral_type: form.referral_type,
        commission_rate: activeRate,
        commission_amount: estimatedCommission,
        status: 'pending',
        notes: form.notes || null,
      }).select('*, referrer:referrer_id(name, role), referee:referee_id(name, role), project:project_id(title, revenue, gpm)').single()
      if (data) {
        setReferrals(prev => [data, ...prev])
        setShowCreate(false)
        setForm({ referrer_id: profile.id, referee_id: '', project_id: '', division_from: 'wraps', division_to: 'decking', referral_type: 'cross_dept', custom_rate: 2.5, notes: '' })
      }
    } catch {}
    setSaving(false)
  }

  async function handleStatusChange(refId: string, newStatus: string) {
    await supabase.from('sales_referrals').update({ status: newStatus }).eq('id', refId)
    setReferrals(prev => prev.map(r => r.id === refId ? { ...r, status: newStatus } : r))
  }

  const isAdmin = profile.role === 'owner' || profile.role === 'admin'

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Create Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 20, fontWeight: 900, color: 'var(--text1)' }}>Log Cross-Referral</div>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Referrer → Referee */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase' }}>Referring Agent</label>
                  <select value={form.referrer_id} onChange={e => setForm(p => ({ ...p, referrer_id: e.target.value }))} style={{ width: '100%', padding: '9px 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 12, outline: 'none' }}>
                    {team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <ArrowRight size={16} style={{ color: 'var(--text3)', marginTop: 20 }} />
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase' }}>Receiving Agent</label>
                  <select value={form.referee_id} onChange={e => setForm(p => ({ ...p, referee_id: e.target.value }))} style={{ width: '100%', padding: '9px 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 12, outline: 'none' }}>
                    <option value="">Select agent...</option>
                    {team.filter(m => m.id !== form.referrer_id).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Division */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase' }}>From Division</label>
                  <select value={form.division_from} onChange={e => setForm(p => ({ ...p, division_from: e.target.value }))} style={{ width: '100%', padding: '9px 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 12, outline: 'none' }}>
                    <option value="wraps">Wraps</option>
                    <option value="decking">Decking</option>
                  </select>
                </div>
                <ArrowRight size={16} style={{ color: 'var(--text3)', marginTop: 20 }} />
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase' }}>To Division</label>
                  <select value={form.division_to} onChange={e => setForm(p => ({ ...p, division_to: e.target.value }))} style={{ width: '100%', padding: '9px 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 12, outline: 'none' }}>
                    <option value="wraps">Wraps</option>
                    <option value="decking">Decking</option>
                  </select>
                </div>
              </div>

              {/* Referral Type */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase' }}>Referral Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                  {REFERRAL_TYPES.map(t => (
                    <button key={t.key} onClick={() => setForm(p => ({ ...p, referral_type: t.key }))} style={{
                      padding: '8px 12px', borderRadius: 8, border: `1px solid ${form.referral_type === t.key ? 'var(--accent)' : 'var(--border)'}`,
                      background: form.referral_type === t.key ? 'rgba(79,127,255,0.1)' : 'var(--surface2)',
                      color: form.referral_type === t.key ? 'var(--accent)' : 'var(--text2)',
                      cursor: 'pointer', textAlign: 'left',
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{t.label}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>{t.desc}</div>
                    </button>
                  ))}
                </div>
                {form.referral_type === 'custom' && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700 }}>Rate:</label>
                    <input type="number" value={form.custom_rate} onChange={e => setForm(p => ({ ...p, custom_rate: Number(e.target.value) }))}
                      min={0} max={20} step={0.5}
                      style={{ width: 70, padding: '6px 8px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text1)', fontSize: 13, outline: 'none', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace' }} />
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>% of GP</span>
                  </div>
                )}
              </div>

              {/* Project */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase' }}>Associated Job</label>
                <select value={form.project_id} onChange={e => setForm(p => ({ ...p, project_id: e.target.value }))} style={{ width: '100%', padding: '9px 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 12, outline: 'none' }}>
                  <option value="">Select a job...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.title} — {p.revenue ? fmt(p.revenue) : '$0'}</option>)}
                </select>
              </div>

              {/* Estimated commission */}
              {estimatedCommission > 0 && (
                <div style={{ padding: '10px 14px', background: 'rgba(34,192,122,.08)', border: '1px solid rgba(34,192,122,.2)', borderRadius: 8, fontSize: 13 }}>
                  <span style={{ color: 'var(--text3)' }}>Estimated referral commission: </span>
                  <span style={{ color: '#22c07a', fontWeight: 800 }}>{fmt(estimatedCommission)}</span>
                  <span style={{ color: 'var(--text3)', fontSize: 11, marginLeft: 6 }}>({fmtPct(activeRate)} of GP)</span>
                </div>
              )}

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase' }}>Notes</label>
                <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional context..." style={{ width: '100%', padding: '9px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 13, outline: 'none' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCreate(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleCreate} disabled={saving || !form.referee_id || !form.project_id} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: (saving || !form.referee_id || !form.project_id) ? 0.5 : 1 }}>
                {saving ? 'Saving...' : 'Log Referral'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 26, fontWeight: 900, color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={22} /> Cross-Referral Tracker
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>2.5% of gross profit — wraps division referrals to decking, and vice versa</div>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          <Plus size={14} /> Log Referral
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Earned (Paid)', value: fmt(totalEarned), icon: CheckCircle2, color: '#22c07a', bg: 'rgba(34,192,122,.08)' },
          { label: 'Pending Approval', value: fmt(totalPending), icon: Clock, color: '#f59e0b', bg: 'rgba(245,158,11,.08)' },
          { label: 'Total Referrals', value: String(myReferrals.length), icon: TrendingUp, color: '#4f7fff', bg: 'rgba(79,127,255,.08)' },
        ].map(stat => (
          <div key={stat.label} style={{ background: stat.bg, border: `1px solid ${stat.color}22`, borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <stat.icon size={14} style={{ color: stat.color }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>{stat.label}</span>
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 800, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Referral list */}
      {referrals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text3)' }}>
          <Users size={32} style={{ margin: '0 auto 10px' }} />
          <div style={{ fontSize: 14, fontWeight: 700 }}>No cross-referrals yet.</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>When you refer a client to another division, log it here to earn your 2.5% commission.</div>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Referrer', 'Receiving Agent', 'Division', 'Job', 'Commission', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {referrals.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: i < referrals.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text1)', fontWeight: 600 }}>{r.referrer?.name || '—'}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text1)' }}>{r.referee?.name || '—'}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                      <span style={{ color: DIVISION_COLORS[r.division_from] || '#4f7fff', fontWeight: 700 }}>{r.division_from}</span>
                      <ArrowRight size={10} style={{ color: 'var(--text3)' }} />
                      <span style={{ color: DIVISION_COLORS[r.division_to] || '#22c07a', fontWeight: 700 }}>{r.division_to}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text2)', maxWidth: 180 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.project?.title || '—'}</div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: '#22c07a' }}>
                      {r.commission_amount ? fmt(r.commission_amount) : '—'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}><StatusBadge status={r.status} /></td>
                  <td style={{ padding: '12px 14px' }}>
                    {isAdmin && r.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => handleStatusChange(r.id, 'approved')} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(34,192,122,.3)', background: 'rgba(34,192,122,.08)', color: '#22c07a', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Approve</button>
                        <button onClick={() => handleStatusChange(r.id, 'paid')} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(139,92,246,.3)', background: 'rgba(139,92,246,.08)', color: '#8b5cf6', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Mark Paid</button>
                      </div>
                    )}
                    {isAdmin && r.status === 'approved' && (
                      <button onClick={() => handleStatusChange(r.id, 'paid')} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(139,92,246,.3)', background: 'rgba(139,92,246,.08)', color: '#8b5cf6', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Mark Paid</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Rate info */}
      <div style={{ marginTop: 20, padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, color: 'var(--text3)' }}>
        <DollarSign size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
        Referral rates: <strong style={{ color: 'var(--text2)' }}>Cross-Dept 2.5%</strong> · <strong style={{ color: 'var(--text2)' }}>Customer Referral 5%</strong> · <strong style={{ color: 'var(--text2)' }}>External Partner 3%</strong> of gross profit. Custom splits also available. Configurable in Settings.
      </div>
    </div>
  )
}
