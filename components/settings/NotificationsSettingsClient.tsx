'use client'

import { useState } from 'react'
import { Bell, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface NotificationPref {
  key: string
  label: string
  description: string
  enabled: boolean
}

const DEFAULT_PREFS: NotificationPref[] = [
  { key: 'new_job', label: 'New job assigned', description: 'When a job is assigned to you or your team', enabled: true },
  { key: 'stage_change', label: 'Pipeline stage changes', description: 'When a job moves to the next stage', enabled: true },
  { key: 'job_comment', label: 'Job comments', description: 'When someone comments on a job you follow', enabled: true },
  { key: 'send_back', label: 'Send-backs', description: 'When a job is sent back to a previous stage', enabled: true },
  { key: 'approval_needed', label: 'Approvals needed', description: 'When a job needs your sign-off to advance', enabled: true },
  { key: 'install_scheduled', label: 'Install scheduled', description: 'When an install date is set or changed', enabled: false },
  { key: 'payment_received', label: 'Payment received', description: 'When a customer payment is processed', enabled: true },
  { key: 'daily_summary', label: 'Daily summary', description: 'A daily digest of pipeline activity', enabled: false },
]

export default function NotificationsSettingsClient() {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS)
  const [saved, setSaved] = useState(false)

  function toggle(key: string) {
    setPrefs(prev => prev.map(p => p.key === key ? { ...p, enabled: !p.enabled } : p))
    setSaved(false)
  }

  function save() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link href="/settings" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, borderRadius: 8,
          background: 'var(--surface)', border: '1px solid rgba(90,96,128,.2)',
          color: 'var(--text2)', textDecoration: 'none',
        }}>
          <ArrowLeft size={16} />
        </Link>
        <div style={{ flex: 1 }}>
          <h1 style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 24, fontWeight: 900,
            color: 'var(--text1)', margin: 0,
          }}>
            Notification Preferences
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text3)', margin: '2px 0 0' }}>
            Choose which notifications you receive
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {saved && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>Saved</span>}
          <button onClick={save} style={{
            padding: '10px 24px', borderRadius: 10, fontWeight: 800, fontSize: 13,
            cursor: 'pointer', background: 'var(--accent)', border: 'none', color: '#fff',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Bell size={14} />
            Save Preferences
          </button>
        </div>
      </div>

      <div style={{
        background: 'var(--surface)',
        border: '1px solid rgba(90,96,128,.2)',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        {prefs.map((pref, i) => (
          <div key={pref.key} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: i < prefs.length - 1 ? '1px solid rgba(90,96,128,.12)' : 'none',
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 2 }}>
                {pref.label}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                {pref.description}
              </div>
            </div>
            <div
              onClick={() => toggle(pref.key)}
              style={{
                width: 44, height: 24, borderRadius: 12, padding: 2,
                background: pref.enabled ? 'var(--accent)' : 'var(--surface2)',
                border: `1px solid ${pref.enabled ? 'var(--accent)' : 'rgba(90,96,128,.3)'}`,
                cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: 10, background: '#fff',
                transform: pref.enabled ? 'translateX(20px)' : 'translateX(0)',
                transition: 'transform 0.2s',
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
