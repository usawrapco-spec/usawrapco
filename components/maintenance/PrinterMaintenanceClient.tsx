'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Wrench, AlertTriangle, CheckCircle, Clock, X, ChevronRight } from 'lucide-react'
import type { Profile } from '@/types'
import { useToast } from '@/components/shared/Toast'

interface MaintenanceLog {
  id: string
  printer_name: string
  maintenance_type: string
  description: string
  performed_by: string
  print_hours_at_service: number
  next_service_hours: number
  resolved: boolean
  created_at: string
}

interface Props { profile: Profile }

const PRINTERS = ['HP Latex 570', 'Roland BN-20', 'Mutoh ValueJet 1626', 'Epson S80600']
const MAINT_TYPES = ['scheduled', 'cleaning', 'repair', 'calibration', 'head_replacement', 'nozzle_check']

const INK_MOCK = {
  'HP Latex 570': { C: 85, M: 72, Y: 90, K: 45, operational: true, print_hours: 342 },
  'Roland BN-20': { C: 60, M: 55, Y: 70, K: 80, operational: true, print_hours: 178 },
}

export default function PrinterMaintenanceClient({ profile }: Props) {
  const { xpToast } = useToast()
  const [logs, setLogs]     = useState<MaintenanceLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm]     = useState({
    printer_name: PRINTERS[0], maintenance_type: 'scheduled',
    description: '', print_hours_at_service: '', next_service_hours: '50',
  })
  const supabase = createClient()

  useEffect(() => { loadLogs() }, [])

  async function loadLogs() {
    setLoading(true)
    const { data } = await supabase
      .from('printer_maintenance_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    setLogs(data || [])
    setLoading(false)
  }

  async function save() {
    if (!form.description.trim()) return
    setSaving(true)
    await supabase.from('printer_maintenance_logs').insert({
      printer_name: form.printer_name,
      maintenance_type: form.maintenance_type,
      description: form.description,
      performed_by: profile.name || profile.email,
      print_hours_at_service: parseFloat(form.print_hours_at_service) || 0,
      next_service_hours: parseFloat(form.next_service_hours) || 50,
      resolved: true,
    })
    await loadLogs()
    // Award maintenance_logged XP
    fetch('/api/xp/award', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'maintenance_logged', sourceType: 'maintenance' }),
    })
      .then(r => r.ok ? r.json() : null)
      .then((res: { amount?: number; leveledUp?: boolean; newLevel?: number } | null) => {
        if (res?.amount) xpToast(res.amount, 'Maintenance logged', res.leveledUp, res.newLevel)
      })
      .catch(() => {})
    setShowAdd(false)
    setForm({ printer_name: PRINTERS[0], maintenance_type: 'scheduled', description: '', print_hours_at_service: '', next_service_hours: '50' })
    setSaving(false)
  }

  const maintTypeColor: Record<string, string> = {
    scheduled: '#22c07a', cleaning: '#4f7fff', repair: '#f25a5a',
    calibration: '#22d3ee', head_replacement: '#f59e0b', nozzle_check: '#8b5cf6',
  }

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, fontFamily: 'Barlow Condensed, sans-serif', color: 'var(--text1)', marginBottom: 4 }}>
            Printer Maintenance
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>Track printer health, ink levels, and maintenance logs</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          <Plus size={14} /> Log Maintenance
        </button>
      </div>

      {/* Printer status cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14, marginBottom: 28 }}>
        {Object.entries(INK_MOCK).map(([name, data]) => (
          <div key={name} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>{name}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                  {data.print_hours} print hours
                </div>
              </div>
              <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: data.operational ? 'rgba(34,192,122,0.12)' : 'rgba(242,90,90,0.12)', color: data.operational ? '#22c07a' : '#f25a5a' }}>
                {data.operational ? 'Operational' : 'Down'}
              </span>
            </div>
            {/* Ink bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(['C', 'M', 'Y', 'K'] as const).map(channel => {
                const level = (data as Record<string, number>)[channel]
                const color = channel === 'C' ? '#22d3ee' : channel === 'M' ? '#f25a5a' : channel === 'Y' ? '#f59e0b' : '#9299b5'
                return (
                  <div key={channel}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color }}>{channel}</span>
                      <span>{level}%</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${level}%`, background: level < 20 ? '#f25a5a' : level < 40 ? '#f59e0b' : color, borderRadius: 3, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Maintenance logs */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
          Maintenance History
        </div>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)' }}>Loading...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
            No maintenance logs yet. Click "Log Maintenance" to record your first entry.
          </div>
        ) : (
          logs.map(log => (
            <div key={log.id} style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <Wrench size={16} style={{ color: 'var(--text3)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>{log.printer_name}</span>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: `${maintTypeColor[log.maintenance_type] || '#5a6080'}18`, color: maintTypeColor[log.maintenance_type] || '#5a6080', textTransform: 'capitalize' }}>
                    {log.maintenance_type.replace('_', ' ')}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>{log.description}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
                  By {log.performed_by} · {new Date(log.created_at).toLocaleDateString()} · {log.print_hours_at_service}h at service
                </div>
              </div>
              <CheckCircle size={16} style={{ color: '#22c07a', flexShrink: 0 }} />
            </div>
          ))
        )}
      </div>

      {/* Add modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 440, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)' }}>Log Maintenance</div>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { key: 'printer_name', label: 'Printer', type: 'select', options: PRINTERS },
                { key: 'maintenance_type', label: 'Type', type: 'select', options: MAINT_TYPES },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{field.label}</label>
                  <select
                    value={form[field.key as keyof typeof form]}
                    onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 13 }}
                  >
                    {field.options.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Description *</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Describe what was done..."
                  rows={3}
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Hours at Service</label>
                  <input type="number" value={form.print_hours_at_service} onChange={e => setForm(p => ({ ...p, print_hours_at_service: e.target.value }))} style={{ width: '100%', padding: '9px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Next Service (hrs)</label>
                  <input type="number" value={form.next_service_hours} onChange={e => setForm(p => ({ ...p, next_service_hours: e.target.value }))} style={{ width: '100%', padding: '9px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text1)', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={save} disabled={!form.description.trim() || saving} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Saving...' : 'Log Maintenance'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
