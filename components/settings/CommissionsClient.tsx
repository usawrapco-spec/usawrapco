'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/types'
import PinGate from './PinGate'
import { Percent, Save, Check, ArrowLeft, Users, DollarSign } from 'lucide-react'

interface Props {
  profile: Profile
  settings: any[]
  agents: any[]
}

interface CommissionRate {
  key: string
  label: string
  description: string
  defaultValue: string
}

const SOURCE_RATES: CommissionRate[] = [
  { key: 'commission_inbound', label: 'Inbound', description: 'Leads from website, calls, walk-ins', defaultValue: '4.5' },
  { key: 'commission_outbound', label: 'Outbound', description: 'Cold calls, door knocking, outreach', defaultValue: '6' },
  { key: 'commission_referral', label: 'Referral', description: 'Customer/partner referrals', defaultValue: '5' },
  { key: 'commission_walkin', label: 'Walk-In', description: 'Walk-in customers', defaultValue: '4.5' },
  { key: 'commission_repeat', label: 'Repeat', description: 'Returning customers', defaultValue: '4' },
]

const BONUS_RATES: CommissionRate[] = [
  { key: 'commission_cross_referral', label: 'Cross-Referral', description: 'Cross-division referral bonus (wraps ↔ decking)', defaultValue: '2.5' },
  { key: 'production_bonus_rate', label: 'Production Bonus', description: 'Production manager bonus (% of profit minus design fee)', defaultValue: '5' },
  { key: 'torq_bonus', label: 'Torq Bonus', description: 'Additional bonus for using Torq system', defaultValue: '1' },
  { key: 'gpm_bonus', label: 'High GPM Bonus', description: 'Bonus when gross profit margin exceeds 73%', defaultValue: '2' },
]

export default function CommissionsClient({ profile, settings, agents }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const settingsMap: Record<string, string> = {}
  settings.forEach((s: any) => { settingsMap[s.key] = s.value })

  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {}
    ;[...SOURCE_RATES, ...BONUS_RATES].forEach(r => {
      v[r.key] = settingsMap[r.key] ?? r.defaultValue
    })
    return v
  })

  const [overrides, setOverrides] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {}
    agents.forEach((a: any) => {
      o[a.id] = a.commission_rate_override != null ? String(a.commission_rate_override) : ''
    })
    return o
  })

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleChange = (key: string, val: string) => {
    setValues(prev => ({ ...prev, [key]: val }))
    setSaved(false)
  }

  const salesAgents = agents.filter((a: any) => ['sales_agent', 'admin', 'owner'].includes(a.role))

  const saveAll = async () => {
    setSaving(true)
    const orgId = profile.org_id

    // Save rate settings
    for (const rate of [...SOURCE_RATES, ...BONUS_RATES]) {
      const existing = settings.find((s: any) => s.key === rate.key)
      if (existing) {
        await supabase.from('shop_settings').update({ value: values[rate.key] }).eq('id', existing.id)
      } else {
        await supabase.from('shop_settings').insert({
          org_id: orgId,
          key: rate.key,
          value: values[rate.key],
          category: 'commission',
          is_sensitive: true,
        })
      }
    }

    // Save per-agent overrides
    for (const agent of salesAgents) {
      const val = overrides[agent.id]
      const override = val && val.trim() !== '' ? parseFloat(val) : null
      await supabase.from('profiles').update({ commission_rate_override: override }).eq('id', agent.id)
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <PinGate orgId={profile.org_id} sectionKey="commissions" sectionLabel="Commission Settings">
      <div style={{ maxWidth: 800 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => router.push('/settings')} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 8, borderRadius: 8, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text3)', cursor: 'pointer',
          }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Percent size={22} style={{ color: 'var(--green)' }} />
              Commission Settings
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>
              Configure commission rates by source and per-agent overrides.
            </p>
          </div>
        </div>

        {/* Source Commission Rates */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 16, marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <DollarSign size={16} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text1)' }}>Source Commission Rates (% of Gross Profit)</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {SOURCE_RATES.map(rate => (
              <div key={rate.key} style={{
                display: 'grid', gridTemplateColumns: '1fr 120px', gap: 12, alignItems: 'center',
                padding: '10px 12px', background: 'var(--surface2)', borderRadius: 8,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{rate.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{rate.description}</div>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="0.1"
                    value={values[rate.key] || ''}
                    onChange={e => handleChange(rate.key, e.target.value)}
                    style={{
                      width: '100%', padding: '8px 28px 8px 10px',
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 6, color: 'var(--text1)', fontSize: 13,
                      fontFamily: 'JetBrains Mono, monospace', outline: 'none',
                      textAlign: 'right', boxSizing: 'border-box',
                    }}
                  />
                  <span style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 13, color: 'var(--text3)', fontWeight: 700, pointerEvents: 'none',
                  }}>%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bonus Rates */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 16, marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Percent size={16} style={{ color: 'var(--purple)' }} />
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text1)' }}>Bonus Rates</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {BONUS_RATES.map(rate => (
              <div key={rate.key} style={{
                display: 'grid', gridTemplateColumns: '1fr 120px', gap: 12, alignItems: 'center',
                padding: '10px 12px', background: 'var(--surface2)', borderRadius: 8,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{rate.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{rate.description}</div>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="0.1"
                    value={values[rate.key] || ''}
                    onChange={e => handleChange(rate.key, e.target.value)}
                    style={{
                      width: '100%', padding: '8px 28px 8px 10px',
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 6, color: 'var(--text1)', fontSize: 13,
                      fontFamily: 'JetBrains Mono, monospace', outline: 'none',
                      textAlign: 'right', boxSizing: 'border-box',
                    }}
                  />
                  <span style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 13, color: 'var(--text3)', fontWeight: 700, pointerEvents: 'none',
                  }}>%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Per-Agent Overrides */}
        {salesAgents.length > 0 && (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 16, marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Users size={16} style={{ color: 'var(--cyan)' }} />
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text1)' }}>Per-Agent Override (optional)</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>
              Set a custom rate for specific agents. Leave blank to use the source-based default.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {salesAgents.map((agent: any) => (
                <div key={agent.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr 120px', gap: 12, alignItems: 'center',
                  padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8,
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{agent.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{agent.role}</div>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="—"
                      value={overrides[agent.id] || ''}
                      onChange={e => setOverrides(prev => ({ ...prev, [agent.id]: e.target.value }))}
                      style={{
                        width: '100%', padding: '8px 28px 8px 10px',
                        background: 'var(--surface)', border: '1px solid var(--border)',
                        borderRadius: 6, color: 'var(--text1)', fontSize: 13,
                        fontFamily: 'JetBrains Mono, monospace', outline: 'none',
                        textAlign: 'right', boxSizing: 'border-box',
                      }}
                    />
                    <span style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      fontSize: 13, color: 'var(--text3)', fontWeight: 700, pointerEvents: 'none',
                    }}>%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          {saved && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--green)', fontSize: 13, fontWeight: 600 }}>
              <Check size={14} /> Commission settings saved
            </div>
          )}
          <button
            onClick={saveAll}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 24px', borderRadius: 8, border: 'none',
              background: 'var(--accent)', color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            <Save size={14} />
            {saving ? 'Saving...' : 'Save Commission Settings'}
          </button>
        </div>
      </div>
    </PinGate>
  )
}
