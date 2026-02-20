'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface VisibilitySettingsProps {
  orgId: string
}

export default function VisibilitySettings({ orgId }: VisibilitySettingsProps) {
  const [settings, setSettings] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('visibility_settings')
        .select('*')
        .eq('org_id', orgId)
        .single()

      if (data) {
        setSettings(data)
      } else {
        // Create defaults
        const { data: newRow } = await supabase
          .from('visibility_settings')
          .insert({ org_id: orgId })
          .select()
          .single()
        if (newRow) setSettings(newRow)
      }
    }
    load()
  }, [orgId])

  const update = (key: string, val: any) => {
    setSettings((s: any) => ({ ...s, [key]: val }))
    setSaved(false)
  }

  const save = async () => {
    if (!settings) return
    setSaving(true)
    await supabase.from('visibility_settings').update({
      sales_sees_production: settings.sales_sees_production,
      sales_sees_install: settings.sales_sees_install,
      production_sees_install: settings.production_sees_install,
      install_sees_production: settings.install_sees_production,
      assigned_only_sales: settings.assigned_only_sales,
      assigned_only_install: settings.assigned_only_install,
      assigned_only_production: settings.assigned_only_production,
      divisions_enabled: settings.divisions_enabled,
      division_list: settings.division_list,
      updated_at: new Date().toISOString(),
    }).eq('org_id', orgId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!settings) return <div style={{ padding: 20, color: 'var(--text3)' }}>Loading...</div>

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text1)', marginBottom: 4 }}>Pipeline Visibility</div>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>Control who sees what across departments.</div>

      {/* Hierarchy */}
      <SectionLabel label="Department Hierarchy" />
      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12 }}>
        Sales → Production → Install. Higher departments can see lower ones.
      </div>

      <Toggle label="Sales can see Production pipeline" checked={settings.sales_sees_production} onChange={v => update('sales_sees_production', v)} />
      <Toggle label="Sales can see Install pipeline" checked={settings.sales_sees_install} onChange={v => update('sales_sees_install', v)} />
      <Toggle label="Production can see Install pipeline" checked={settings.production_sees_install} onChange={v => update('production_sees_install', v)} />
      <Toggle label="Install can see Production pipeline" checked={settings.install_sees_production} onChange={v => update('install_sees_production', v)} />

      {/* Assignment-only */}
      <SectionLabel label="Assignment-Only Mode" />
      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12 }}>
        When enabled, team members only see jobs assigned to them (admins always see all).
      </div>

      <Toggle label="Sales: only see assigned jobs" checked={settings.assigned_only_sales} onChange={v => update('assigned_only_sales', v)} />
      <Toggle label="Production: only see assigned jobs" checked={settings.assigned_only_production} onChange={v => update('assigned_only_production', v)} />
      <Toggle label="Installers: only see assigned jobs" checked={settings.assigned_only_install} onChange={v => update('assigned_only_install', v)} />

      {/* Divisions */}
      <SectionLabel label="Business Divisions" />
      <Toggle label="Enable division separation (Wrap vs Decking)" checked={settings.divisions_enabled} onChange={v => update('divisions_enabled', v)} />

      {settings.divisions_enabled && (
        <div style={{ marginTop: 10, padding: 12, background: 'var(--surface2)', borderRadius: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8 }}>Active Divisions</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(settings.division_list || ['wrap', 'decking']).map((d: string) => (
              <span key={d} style={{
                padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                background: d === 'wrap' ? 'rgba(79,127,255,0.1)' : 'rgba(139,92,246,0.1)',
                color: d === 'wrap' ? '#4f7fff' : '#8b5cf6',
                textTransform: 'capitalize',
              }}>
                {d}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 8 }}>
            Each division gets its own sales pipeline. Agents can cross-refer between divisions.
          </div>
        </div>
      )}

      {/* Save */}
      <div style={{ marginTop: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
        <button onClick={save} disabled={saving} style={{
          padding: '12px 32px', borderRadius: 10, fontWeight: 800, fontSize: 13,
          cursor: 'pointer', border: 'none', background: 'var(--accent)', color: '#fff',
        }}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        {saved && <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>✓ Saved</span>}
      </div>
    </div>
  )
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 900, color: 'var(--text1)', textTransform: 'uppercase',
      letterSpacing: '.08em', paddingTop: 16, paddingBottom: 8,
      marginTop: 16, borderTop: '1px solid var(--border)',
    }}>
      {label}
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', cursor: 'pointer',
    }}>
      <div onClick={() => onChange(!checked)} style={{
        width: 40, height: 22, borderRadius: 11, padding: 2,
        background: checked ? 'var(--accent)' : 'var(--surface2)',
        border: `1px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
        transition: 'all 0.2s', cursor: 'pointer',
      }}>
        <div style={{
          width: 18, height: 18, borderRadius: 9, background: '#fff',
          transform: checked ? 'translateX(18px)' : 'translateX(0)',
          transition: 'transform 0.2s',
        }} />
      </div>
      <span style={{ fontSize: 13, color: 'var(--text1)', fontWeight: 600 }}>{label}</span>
    </label>
  )
}
