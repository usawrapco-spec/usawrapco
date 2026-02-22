'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import PinGate from './PinGate'
import { Settings, DollarSign, Percent, Palette, Factory, Save, Check, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ShopSetting {
  id: string
  org_id: string
  key: string
  value: string
  category: string
  is_sensitive: boolean
  description?: string
}

interface Props {
  profile: Profile
  initialSettings: ShopSetting[]
}

interface DefaultGroup {
  category: string
  label: string
  icon: typeof DollarSign
  items: DefaultItem[]
}

interface DefaultItem {
  key: string
  label: string
  type: 'number' | 'percentage' | 'currency'
  defaultValue: string
  description?: string
}

const DEFAULT_GROUPS: DefaultGroup[] = [
  {
    category: 'pricing',
    label: 'Pricing Defaults',
    icon: DollarSign,
    items: [
      { key: 'design_fee', label: 'Design Fee', type: 'currency', defaultValue: '150', description: 'Base design fee per project' },
      { key: 'material_rate_sqft', label: 'Material Rate (per sqft)', type: 'currency', defaultValue: '2.10', description: 'Default material cost per square foot' },
      { key: 'tax_rate', label: 'Tax Rate', type: 'percentage', defaultValue: '10', description: 'Applied to taxable line items' },
      { key: 'installer_billing_rate', label: 'Installer Billing Rate (per hr)', type: 'currency', defaultValue: '35', description: 'Default hourly rate for installer billing' },
      { key: 'design_canvas_payment', label: 'Design Canvas Payment', type: 'currency', defaultValue: '250', description: 'Customer payment for design canvas access' },
      { key: 'rush_fee_5day', label: 'Rush Fee (5-day)', type: 'currency', defaultValue: '150', description: '5-day turnaround rush surcharge' },
      { key: 'rush_fee_3day', label: 'Rush Fee (3-day)', type: 'currency', defaultValue: '300', description: '3-day turnaround rush surcharge' },
      { key: 'rush_fee_48hr', label: 'Rush Fee (48hr)', type: 'currency', defaultValue: '500', description: '48-hour turnaround rush surcharge' },
      { key: 'rush_fee_24hr', label: 'Rush Fee (24hr)', type: 'currency', defaultValue: '750', description: '24-hour turnaround rush surcharge' },
    ],
  },
  {
    category: 'commission',
    label: 'Commission Defaults',
    icon: Percent,
    items: [
      { key: 'commission_inbound', label: 'Inbound Rate', type: 'percentage', defaultValue: '4.5', description: 'Commission on inbound leads (% of GP)' },
      { key: 'commission_outbound', label: 'Outbound Rate', type: 'percentage', defaultValue: '6', description: 'Commission on outbound leads (% of GP)' },
      { key: 'commission_referral', label: 'Referral Rate', type: 'percentage', defaultValue: '5', description: 'Commission on referred leads (% of GP)' },
      { key: 'commission_walkin', label: 'Walk-In Rate', type: 'percentage', defaultValue: '4.5', description: 'Commission on walk-in leads (% of GP)' },
      { key: 'commission_repeat', label: 'Repeat Rate', type: 'percentage', defaultValue: '4', description: 'Commission on repeat customers (% of GP)' },
      { key: 'commission_cross_referral', label: 'Cross-Referral Rate', type: 'percentage', defaultValue: '2.5', description: 'Cross-division referral bonus (% of net profit)' },
      { key: 'production_bonus_rate', label: 'Production Bonus Rate', type: 'percentage', defaultValue: '5', description: 'Production manager bonus (% of profit minus design fee)' },
    ],
  },
  {
    category: 'design',
    label: 'Design Defaults',
    icon: Palette,
    items: [
      { key: 'max_revisions', label: 'Max Revisions', type: 'number', defaultValue: '2', description: 'Maximum free design revisions per project' },
      { key: 'onboarding_link_expiry_days', label: 'Onboarding Link Expiry (days)', type: 'number', defaultValue: '30', description: 'Days before onboarding links expire' },
    ],
  },
  {
    category: 'production',
    label: 'Production Defaults',
    icon: Factory,
    items: [
      { key: 'default_drying_time_min', label: 'Default Drying Time (min)', type: 'number', defaultValue: '30', description: 'Default vinyl drying time in minutes' },
      { key: 'printer_maintenance_interval_hrs', label: 'Printer Maintenance Interval (hrs)', type: 'number', defaultValue: '100', description: 'Hours between required printer maintenance' },
    ],
  },
]

export default function DefaultsClient({ profile, initialSettings }: Props) {
  const router = useRouter()
  const supabase = createClient()

  // Build a settings map from DB values
  const settingsMap: Record<string, string> = {}
  initialSettings.forEach(s => { settingsMap[s.key] = s.value })

  // Initialize form with DB values or defaults
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {}
    DEFAULT_GROUPS.forEach(g => {
      g.items.forEach(item => {
        v[item.key] = settingsMap[item.key] ?? item.defaultValue
      })
    })
    return v
  })

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expandedGroup, setExpandedGroup] = useState<string>('pricing')

  const handleChange = (key: string, val: string) => {
    setValues(prev => ({ ...prev, [key]: val }))
    setSaved(false)
  }

  const saveAll = async () => {
    setSaving(true)
    const orgId = profile.org_id

    // Upsert each setting
    for (const group of DEFAULT_GROUPS) {
      for (const item of group.items) {
        const val = values[item.key]
        if (val === undefined) continue

        // Check if exists
        const existing = initialSettings.find(s => s.key === item.key)
        if (existing) {
          await supabase.from('shop_settings').update({ value: val }).eq('id', existing.id)
        } else {
          await supabase.from('shop_settings').insert({
            org_id: orgId,
            key: item.key,
            value: val,
            category: group.category,
            is_sensitive: group.category === 'commission',
            description: item.description || null,
          })
        }
      }
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <PinGate orgId={profile.org_id} sectionKey="defaults" sectionLabel="Settings Defaults">
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
              <Settings size={22} style={{ color: 'var(--accent)' }} />
              Settings Defaults
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>
              Configure default rates, fees, and thresholds for the entire organization.
            </p>
          </div>
        </div>

        {/* Groups */}
        {DEFAULT_GROUPS.map(group => {
          const isExpanded = expandedGroup === group.category
          return (
            <div key={group.category} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, marginBottom: 12, overflow: 'hidden',
            }}>
              <button
                onClick={() => setExpandedGroup(isExpanded ? '' : group.category)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '14px 16px', border: 'none', background: 'transparent',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <group.icon size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text1)', flex: 1 }}>{group.label}</span>
                <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>
                  {group.items.length} settings
                </span>
                <span style={{
                  fontSize: 14, color: 'var(--text3)', transition: 'transform 0.2s',
                  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)',
                }}>
                  &#9654;
                </span>
              </button>

              {isExpanded && (
                <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {group.items.map(item => (
                    <div key={item.key} style={{
                      display: 'grid', gridTemplateColumns: '1fr 160px', gap: 12, alignItems: 'center',
                      padding: '10px 12px', background: 'var(--surface2)', borderRadius: 8,
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>{item.label}</div>
                        {item.description && (
                          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{item.description}</div>
                        )}
                      </div>
                      <div style={{ position: 'relative' }}>
                        {item.type === 'currency' && (
                          <span style={{
                            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                            fontSize: 13, color: 'var(--text3)', fontWeight: 700, pointerEvents: 'none',
                          }}>$</span>
                        )}
                        <input
                          type="number"
                          step={item.type === 'percentage' ? '0.1' : item.type === 'currency' ? '0.01' : '1'}
                          value={values[item.key] || ''}
                          onChange={e => handleChange(item.key, e.target.value)}
                          style={{
                            width: '100%', padding: item.type === 'currency' ? '8px 30px 8px 24px' : '8px 30px 8px 10px',
                            background: 'var(--surface)', border: '1px solid var(--border)',
                            borderRadius: 6, color: 'var(--text1)', fontSize: 13,
                            fontFamily: 'JetBrains Mono, monospace', outline: 'none',
                            textAlign: 'right', boxSizing: 'border-box',
                          }}
                        />
                        {item.type === 'percentage' && (
                          <span style={{
                            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                            fontSize: 13, color: 'var(--text3)', fontWeight: 700, pointerEvents: 'none',
                          }}>%</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* Save button */}
        <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'flex-end' }}>
          {saved && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--green)', fontSize: 13, fontWeight: 600 }}>
              <Check size={14} /> All settings saved
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
            {saving ? 'Saving...' : 'Save All Defaults'}
          </button>
        </div>
      </div>
    </PinGate>
  )
}
