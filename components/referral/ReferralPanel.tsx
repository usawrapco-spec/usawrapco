'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users2, X, Check } from 'lucide-react'

interface ReferralPanelProps {
  projectId: string
  orgId: string
  project: any
  teammates: any[]
}

export default function ReferralPanel({ projectId, orgId, project, teammates }: ReferralPanelProps) {
  const [referrals, setReferrals] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    referring_agent_id: '',
    receiving_agent_id: '',
    referral_type: 'percentage' as 'percentage' | 'flat',
    referral_rate: 2.5,
    flat_amount: 100,
    from_division: project.division || 'wrap',
    to_division: 'decking',
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const agents = teammates.filter(t => ['sales_agent', 'admin', 'owner'].includes(t.role))

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('referrals')
        .select('*, referring:referring_agent_id(id, name, full_name), receiving:receiving_agent_id(id, name, full_name)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
      if (data) setReferrals(data)
    }
    load()
  }, [projectId])

  const addReferral = async () => {
    if (!form.referring_agent_id || !form.receiving_agent_id) return
    if (form.referring_agent_id === form.receiving_agent_id) return
    setSaving(true)

    // Calculate estimated commission
    const profit = project.profit || 0
    let estimated = 0
    if (form.referral_type === 'percentage') {
      estimated = profit * (form.referral_rate / 100)
    } else {
      estimated = form.flat_amount
    }

    const { data } = await supabase.from('referrals').insert({
      org_id: orgId,
      project_id: projectId,
      referring_agent_id: form.referring_agent_id,
      receiving_agent_id: form.receiving_agent_id,
      referral_type: form.referral_type,
      referral_rate: form.referral_type === 'percentage' ? form.referral_rate : null,
      flat_amount: form.referral_type === 'flat' ? form.flat_amount : null,
      from_division: form.from_division,
      to_division: form.to_division,
      commission_earned: estimated,
    }).select('*, referring:referring_agent_id(id, name, full_name), receiving:receiving_agent_id(id, name, full_name)')

    if (data) setReferrals(prev => [...data, ...prev])
    setSaving(false)
    setShowAdd(false)
  }

  const removeReferral = async (id: string) => {
    await supabase.from('referrals').delete().eq('id', id)
    setReferrals(prev => prev.filter(r => r.id !== id))
  }

  const profit = project.profit || 0

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--text1)', display:'flex', alignItems:'center', gap:6 }}><Users2 size={14} /> Referrals & Splits</div>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
          background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer',
        }}>
          + Add Referral
        </button>
      </div>

      {/* Existing referrals */}
      {referrals.map(ref => {
        const referring = (ref.referring as any)?.full_name || (ref.referring as any)?.name || 'Unknown'
        const receiving = (ref.receiving as any)?.full_name || (ref.receiving as any)?.name || 'Unknown'
        return (
          <div key={ref.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 12px', background: 'var(--surface2)', borderRadius: 8, marginBottom: 6,
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>
                {referring} → {receiving}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                {ref.from_division} → {ref.to_division} ·
                {ref.referral_type === 'percentage' ? ` ${ref.referral_rate}% of profit` : ` $${ref.flat_amount} flat`}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase' }}>Est. Pay</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>
                  ${Math.round(ref.commission_earned || 0)}
                </div>
              </div>
              {ref.paid && (
                <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: '#22c55e20', color: '#22c55e' }}>PAID</span>
              )}
              <button onClick={() => removeReferral(ref.id)} style={{
                background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4,
              }}><X size={14} /></button>
            </div>
          </div>
        )
      })}

      {referrals.length === 0 && !showAdd && (
        <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>
          No referrals on this job. Add one if another agent referred this lead.
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div style={{ padding: 16, background: 'var(--surface2)', borderRadius: 10, marginTop: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase' }}>Referring Agent</label>
              <select value={form.referring_agent_id} onChange={e => setForm(p => ({ ...p, referring_agent_id: e.target.value }))}
                style={sel}>
                <option value="">Select...</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.full_name || a.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase' }}>Receiving Agent</label>
              <select value={form.receiving_agent_id} onChange={e => setForm(p => ({ ...p, receiving_agent_id: e.target.value }))}
                style={sel}>
                <option value="">Select...</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.full_name || a.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase' }}>Type</label>
              <select value={form.referral_type} onChange={e => setForm(p => ({ ...p, referral_type: e.target.value as any }))}
                style={sel}>
                <option value="percentage">% of Profit</option>
                <option value="flat">Flat $</option>
              </select>
            </div>
            {form.referral_type === 'percentage' ? (
              <div>
                <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase' }}>Rate %</label>
                <input type="number" step="0.5" value={form.referral_rate}
                  onChange={e => setForm(p => ({ ...p, referral_rate: parseFloat(e.target.value) || 0 }))}
                  style={inp} />
                <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 2 }}>
                  Est: ${Math.round(profit * (form.referral_rate / 100))} on ${Math.round(profit)} profit
                </div>
              </div>
            ) : (
              <div>
                <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase' }}>Amount $</label>
                <input type="number" value={form.flat_amount}
                  onChange={e => setForm(p => ({ ...p, flat_amount: parseFloat(e.target.value) || 0 }))}
                  style={inp} />
              </div>
            )}
            <div>
              <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase' }}>Division</label>
              <div style={{ display: 'flex', gap: 4 }}>
                <select value={form.from_division} onChange={e => setForm(p => ({ ...p, from_division: e.target.value }))} style={{ ...sel, flex: 1 }}>
                  <option value="wrap">Wrap</option>
                  <option value="decking">Decking</option>
                </select>
                <span style={{ alignSelf: 'center', color: 'var(--text3)', fontSize: 12 }}>→</span>
                <select value={form.to_division} onChange={e => setForm(p => ({ ...p, to_division: e.target.value }))} style={{ ...sel, flex: 1 }}>
                  <option value="wrap">Wrap</option>
                  <option value="decking">Decking</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addReferral} disabled={saving || !form.referring_agent_id || !form.receiving_agent_id}
              style={{
                padding: '10px 20px', borderRadius: 8, fontWeight: 700, fontSize: 12,
                cursor: 'pointer', border: 'none', background: 'var(--green)', color: '#0d1a10',
                opacity: form.referring_agent_id && form.receiving_agent_id ? 1 : 0.5,
              }}>
              {saving ? 'Saving...' : <><Check size={12} style={{ display:'inline', verticalAlign:'middle', marginRight:4 }} /> Add Referral</>}
            </button>
            <button onClick={() => setShowAdd(false)} style={{
              padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 12,
              cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)',
            }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const sel: React.CSSProperties = {
  width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '8px 10px', fontSize: 12, color: 'var(--text1)',
}
const inp: React.CSSProperties = {
  width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '8px 10px', fontSize: 12, color: 'var(--text1)', outline: 'none',
}
