'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { Lock, LockOpen, X, Shield, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, UserRole } from '@/types'
import { isAdminRole } from '@/types'

const ROLES: { key: UserRole; label: string }[] = [
  { key: 'owner',       label: 'Owner' },
  { key: 'admin',       label: 'Admin' },
  { key: 'sales_agent', label: 'Sales Agent' },
  { key: 'designer',    label: 'Designer' },
  { key: 'production',  label: 'Production' },
  { key: 'installer',   label: 'Installer' },
  { key: 'viewer',      label: 'Viewer' },
]

const PIN = '1099'
const AUTO_LOCK_MS = 2 * 60 * 1000 // 2 minutes

interface Props {
  profile: Profile
}

// Gate — only renders inner component for admin/owner
export function QuickPermissionsWidget({ profile }: Props) {
  if (!isAdminRole(profile.role)) return null
  return <WidgetInner profile={profile} />
}

function WidgetInner({ profile }: Props) {
  const pathname = usePathname()
  const supabase = createClient()

  const [open, setOpen]         = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)

  // Per-role visibility for the current page
  const [visibility, setVisibility] = useState<Record<UserRole, boolean>>({
    owner: true, admin: true, sales_agent: true, designer: true,
    production: true, installer: true, viewer: true,
  })

  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load saved visibility for this page
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('app_state')
        .select('value')
        .eq('key', `page_visibility_${pathname}`)
        .eq('org_id', profile.org_id)
        .maybeSingle()

      if (data?.value) {
        setVisibility(v => ({ ...v, ...(data.value as Record<UserRole, boolean>) }))
      }
    }
    if (open && unlocked) load()
  }, [open, unlocked, pathname])

  // Auto-lock timer
  const resetTimer = useCallback(() => {
    if (lockTimer.current) clearTimeout(lockTimer.current)
    lockTimer.current = setTimeout(() => {
      setUnlocked(false)
      setPinInput('')
      setOpen(false)
    }, AUTO_LOCK_MS)
  }, [])

  useEffect(() => {
    if (unlocked) resetTimer()
    return () => {
      if (lockTimer.current) clearTimeout(lockTimer.current)
    }
  }, [unlocked, resetTimer])

  function handlePinSubmit() {
    if (pinInput === PIN) {
      setUnlocked(true)
      setPinError(false)
      resetTimer()
    } else {
      setPinError(true)
      setPinInput('')
    }
  }

  async function handleSave() {
    setSaving(true)
    await supabase.from('app_state').upsert(
      { key: `page_visibility_${pathname}`, org_id: profile.org_id, value: visibility },
      { onConflict: 'key,org_id' }
    )
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function toggleRole(role: UserRole) {
    // Never hide from owner/admin
    if (role === 'owner' || role === 'admin') return
    setVisibility(v => ({ ...v, [role]: !v[role] }))
    resetTimer()
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 136,
        right: 16,
        zIndex: 200,
      }}
      onMouseMove={unlocked ? resetTimer : undefined}
      onKeyDown={unlocked ? resetTimer : undefined}
    >
      {/* Panel */}
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: 48,
            right: 0,
            width: 280,
            background: 'var(--surface)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              background: 'var(--surface2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={14} color="var(--accent)" />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>
                Quick Permissions
              </span>
            </div>
            <button
              onClick={() => { setOpen(false); setUnlocked(false); setPinInput('') }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text3)', padding: 2,
              }}
            >
              <X size={14} />
            </button>
          </div>

          {!unlocked ? (
            /* PIN entry */
            <div style={{ padding: 16 }}>
              <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
                Enter admin PIN to unlock permissions:
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="password"
                  maxLength={6}
                  value={pinInput}
                  onChange={e => { setPinInput(e.target.value); setPinError(false) }}
                  onKeyDown={e => e.key === 'Enter' && handlePinSubmit()}
                  placeholder="PIN"
                  autoFocus
                  style={{
                    flex: 1,
                    background: 'var(--bg)',
                    border: `1px solid ${pinError ? 'var(--red)' : 'rgba(255,255,255,0.12)'}`,
                    borderRadius: 6,
                    padding: '6px 10px',
                    fontSize: 14,
                    color: 'var(--text1)',
                    outline: 'none',
                    letterSpacing: '0.2em',
                  }}
                />
                <button
                  onClick={handlePinSubmit}
                  style={{
                    background: 'var(--accent)',
                    border: 'none',
                    borderRadius: 6,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  Unlock
                </button>
              </div>
              {pinError && (
                <p style={{ fontSize: 11, color: 'var(--red)', marginTop: 6 }}>
                  Incorrect PIN. Try again.
                </p>
              )}
            </div>
          ) : (
            /* Permissions panel */
            <div style={{ padding: 14 }}>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10 }}>
                Page: <span style={{ color: 'var(--text2)', fontWeight: 600 }}>{pathname}</span>
              </p>
              <p style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 10, fontWeight: 600 }}>
                Which roles can see this page?
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ROLES.map(({ key, label }) => {
                  const locked = key === 'owner' || key === 'admin'
                  const checked = locked ? true : visibility[key]
                  return (
                    <label
                      key={key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        cursor: locked ? 'not-allowed' : 'pointer',
                        opacity: locked ? 0.5 : 1,
                        padding: '4px 0',
                      }}
                    >
                      <div
                        onClick={() => !locked && toggleRole(key)}
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 4,
                          border: `1.5px solid ${checked ? 'var(--accent)' : 'rgba(255,255,255,0.2)'}`,
                          background: checked ? 'var(--accent)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'all 0.15s',
                        }}
                      >
                        {checked && <Check size={10} color="#fff" strokeWidth={3} />}
                      </div>
                      <span style={{ fontSize: 13, color: 'var(--text1)' }}>{label}</span>
                      {locked && (
                        <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 'auto' }}>
                          always
                        </span>
                      )}
                    </label>
                  )
                })}
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  width: '100%',
                  marginTop: 14,
                  background: saved ? 'var(--green)' : 'var(--accent)',
                  border: 'none',
                  borderRadius: 7,
                  padding: '8px 0',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#fff',
                  cursor: saving ? 'wait' : 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Changes'}
              </button>
              <p style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'center', marginTop: 8 }}>
                Auto-locks in 2 min of inactivity
              </p>
            </div>
          )}
        </div>
      )}

      {/* Floating lock button */}
      <button
        onClick={() => setOpen(v => !v)}
        title={unlocked ? 'Permissions panel (unlocked)' : 'Quick Permissions (click to unlock)'}
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: unlocked ? 'var(--accent)' : 'var(--surface)',
          border: `1.5px solid ${unlocked ? 'var(--accent)' : 'rgba(255,255,255,0.15)'}`,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: unlocked ? '#fff' : 'var(--text2)',
          transition: 'all 0.2s',
        }}
      >
        {unlocked ? <LockOpen size={16} /> : <Lock size={16} />}
      </button>
    </div>
  )
}
