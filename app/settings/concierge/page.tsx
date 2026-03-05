'use client'

import { useState } from 'react'
import { Bot, Save, Check, Zap, Bell, MessageSquare, Clock } from 'lucide-react'

const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', background: 'var(--surface2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'var(--text1)', fontSize: 13, boxSizing: 'border-box' }
const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, display: 'block', fontFamily: 'Barlow Condensed, sans-serif' }
const cardStyle: React.CSSProperties = { background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20, marginBottom: 16 }

export default function ConciergeSettingsPage() {
  const [enabled, setEnabled] = useState(true)
  const [autoActivate, setAutoActivate] = useState(true)
  const [personaName, setPersonaName] = useState('Wrap AI')
  const [tone, setTone] = useState('professional')
  const [notifyEmail, setNotifyEmail] = useState(false)
  const [notifySms, setNotifySms] = useState(false)
  const [notifyInApp, setNotifyInApp] = useState(true)
  const [saved, setSaved] = useState(false)
  const [triggers, setTriggers] = useState([
    { id: 'design_brief_empty', label: 'Design brief missing after 2 days', active: true },
    { id: 'no_photos', label: 'No vehicle photos uploaded', active: true },
    { id: 'intake_not_sent', label: 'Customer intake link not sent after 1 day', active: false },
    { id: 'timeline_risk', label: 'Timeline milestone overdue', active: true },
    { id: 'no_signoff', label: 'Customer sign-off pending before install', active: true },
  ])

  function toggleTrigger(id: string) {
    setTriggers(prev => prev.map(t => t.id === id ? { ...t, active: !t.active } : t))
  }

  function save() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #4f7fff, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(79,127,255,0.4)' }}>
          <Bot size={22} style={{ color: '#fff' }} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text1)', fontFamily: 'Barlow Condensed, sans-serif' }}>Project Concierge</h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text3)' }}>AI job manager that activates when a job is created and helps your team stay on track</p>
        </div>
      </div>

      {/* Master toggle */}
      <div style={{ ...cardStyle, border: `1px solid ${enabled ? 'rgba(79,127,255,0.3)' : 'rgba(255,255,255,0.08)'}`, background: enabled ? 'rgba(79,127,255,0.04)' : 'var(--surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 3 }}>Enable Project Concierge</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>When enabled, the AI Concierge tab appears on every job and monitors progress.</div>
          </div>
          <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              onClick={() => setEnabled(e => !e)}
              style={{ width: 44, height: 24, borderRadius: 12, background: enabled ? 'var(--accent)' : 'var(--surface2)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <div style={{ position: 'absolute', top: 3, left: enabled ? 22 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
            </div>
          </label>
        </div>
      </div>

      {/* Persona */}
      <div style={cardStyle}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text2)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <MessageSquare size={13} /> Persona
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Assistant Name</label>
            <input value={personaName} onChange={e => setPersonaName(e.target.value)} placeholder="e.g. Wrap AI" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Tone</label>
            <select value={tone} onChange={e => setTone(e.target.value)} style={inputStyle}>
              <option value="professional">Professional</option>
              <option value="friendly">Friendly & Casual</option>
              <option value="concise">Concise / Direct</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={labelStyle}>Auto-activate on job creation</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={autoActivate} onChange={e => setAutoActivate(e.target.checked)} style={{ width: 15, height: 15, accentColor: 'var(--accent)', cursor: 'pointer' }} />
            <span style={{ fontSize: 13, color: 'var(--text2)' }}>Automatically enable Concierge when a new job is created</span>
          </label>
        </div>
      </div>

      {/* Auto-triggers */}
      <div style={cardStyle}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text2)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <Zap size={13} /> Auto-Triggers
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>The Concierge will proactively flag these issues on affected jobs.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {triggers.map(t => (
            <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 10px', borderRadius: 8, background: t.active ? 'rgba(79,127,255,0.06)' : 'var(--surface2)', border: `1px solid ${t.active ? 'rgba(79,127,255,0.2)' : 'transparent'}` }}>
              <input type="checkbox" checked={t.active} onChange={() => toggleTrigger(t.id)} style={{ width: 15, height: 15, accentColor: 'var(--accent)', cursor: 'pointer', flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: t.active ? 'var(--text1)' : 'var(--text3)' }}>{t.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div style={cardStyle}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text2)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <Bell size={13} /> Notification Channels
        </div>
        {[
          { key: 'in_app', label: 'In-app notifications', value: notifyInApp, set: setNotifyInApp },
          { key: 'email', label: 'Email digest', value: notifyEmail, set: setNotifyEmail },
          { key: 'sms', label: 'SMS alerts', value: notifySms, set: setNotifySms },
        ].map(n => (
          <label key={n.key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '7px 0' }}>
            <input type="checkbox" checked={n.value} onChange={e => n.set(e.target.checked)} style={{ width: 15, height: 15, accentColor: 'var(--accent)', cursor: 'pointer' }} />
            <span style={{ fontSize: 13, color: 'var(--text2)' }}>{n.label}</span>
          </label>
        ))}
      </div>

      {/* Save */}
      <button
        onClick={save}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px', borderRadius: 8, border: 'none', background: saved ? 'rgba(34,192,122,0.15)' : 'var(--accent)', color: saved ? 'var(--green)' : '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}
      >
        {saved ? <Check size={15} /> : <Save size={15} />}
        {saved ? 'Saved!' : 'Save Settings'}
      </button>
    </div>
  )
}
