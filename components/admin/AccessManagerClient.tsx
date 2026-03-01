'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Profile, UserRole } from '@/types'
import { isAdminRole } from '@/types'
import {
  Users, Search, ChevronRight, X, Save, Eye,
  CheckSquare, Square, Shield, AlertCircle,
} from 'lucide-react'
import { PortalPreviewModal } from './PortalPreviewModal'

// ── Types ─────────────────────────────────────────────────────────────────────
interface TeamMember {
  id: string
  name: string
  email: string
  role: UserRole
  avatar_url: string | null
  active: boolean
  division: string | null
  feature_permissions: Record<string, boolean> | null
  created_at: string
}

const ROLES: { value: UserRole; label: string; color: string }[] = [
  { value: 'owner',       label: 'Owner',       color: '#f59e0b' },
  { value: 'admin',       label: 'Admin',       color: '#8b5cf6' },
  { value: 'sales_agent', label: 'Sales Agent', color: '#4f7fff' },
  { value: 'designer',    label: 'Designer',    color: '#22c07a' },
  { value: 'production',  label: 'Production',  color: '#22d3ee' },
  { value: 'installer',   label: 'Installer',   color: '#f25a5a' },
  { value: 'viewer',      label: 'Viewer',      color: '#9299b5' },
]

interface FeatureToggle {
  key: string
  label: string
  description: string
}

const FEATURE_TOGGLES: FeatureToggle[] = [
  { key: 'financials',       label: 'Financial Data',      description: 'Can view revenue, margins, and cost breakdowns' },
  { key: 'commission_data',  label: 'Commission Data',     description: 'Can see commission rates and earnings' },
  { key: 'all_jobs',         label: 'All Jobs',            description: 'Can view all jobs (not just assigned ones)' },
  { key: 'customer_pii',     label: 'Customer PII',        description: 'Can see full customer contact info (phone, email, address)' },
  { key: 'payroll',          label: 'Payroll Data',        description: 'Can access payroll records and reports' },
  { key: 'admin_controls',   label: 'Admin Controls',      description: 'Can access admin settings and controls' },
]

function getDefaultPermissions(role: UserRole): Record<string, boolean> {
  const isAdmin = isAdminRole(role)
  return {
    financials:      isAdmin || role === 'sales_agent',
    commission_data: isAdmin || role === 'sales_agent',
    all_jobs:        isAdmin || role === 'sales_agent' || role === 'production' || role === 'designer' || role === 'installer',
    customer_pii:    isAdmin || role === 'sales_agent',
    payroll:         isAdmin || role === 'installer',
    admin_controls:  isAdmin,
  }
}

function getRoleColor(role: string): string {
  return ROLES.find(r => r.value === role)?.color ?? '#9299b5'
}

function getRoleLabel(role: string): string {
  return ROLES.find(r => r.value === role)?.label ?? role
}

function Avatar({ member }: { member: TeamMember }) {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%',
      background: getRoleColor(member.role),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0, overflow: 'hidden',
    }}>
      {member.avatar_url
        ? <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : (member.name || member.email || '?').charAt(0).toUpperCase()
      }
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AccessManagerClient({ currentProfile }: { currentProfile: Profile }) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<TeamMember | null>(null)
  const [panelRole, setPanelRole] = useState<UserRole>('sales_agent')
  const [panelPerms, setPanelPerms] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/access')
      if (res.ok) setMembers(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openPanel(m: TeamMember) {
    setSelected(m)
    setPanelRole(m.role)
    const perms = m.feature_permissions ?? getDefaultPermissions(m.role)
    setPanelPerms(perms)
    setSaveMsg('')
  }

  function closePanel() {
    setSelected(null)
    setSaveMsg('')
  }

  function handleRoleChange(role: UserRole) {
    setPanelRole(role)
    // Reset perms to defaults for the new role (keep any custom overrides from existing)
    const defaults = getDefaultPermissions(role)
    setPanelPerms(prev => ({ ...defaults, ...prev }))
  }

  function togglePerm(key: string) {
    setPanelPerms(prev => ({ ...prev, [key]: !prev[key] }))
  }

  async function save() {
    if (!selected) return
    setSaving(true)
    setSaveMsg('')
    try {
      const res = await fetch('/api/admin/access', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selected.id,
          role: panelRole,
          feature_permissions: panelPerms,
        }),
      })
      if (res.ok) {
        setSaveMsg('Saved')
        // Update local state
        setMembers(prev => prev.map(m =>
          m.id === selected.id
            ? { ...m, role: panelRole, feature_permissions: panelPerms }
            : m
        ))
        setSelected(prev => prev ? { ...prev, role: panelRole, feature_permissions: panelPerms } : null)
      } else {
        const err = await res.json()
        setSaveMsg(err.error ?? 'Error saving')
      }
    } finally {
      setSaving(false)
    }
  }

  const filtered = members.filter(m =>
    !search ||
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase()) ||
    m.role?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', gap: 0, height: '100%', overflow: 'hidden' }}>

      {/* ── Left: Member list ─────────────────────────────────────────────── */}
      <div style={{
        flex: selected ? '0 0 340px' : '1 1 auto',
        display: 'flex', flexDirection: 'column',
        borderRight: selected ? '1px solid rgba(255,255,255,0.06)' : 'none',
        transition: 'flex 0.2s',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <Shield size={18} color="#8b5cf6" />
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)' }}>Access Manager</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{members.length} team members</div>
          </div>
        </div>

        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--surface2)', borderRadius: 8, padding: '8px 12px',
          marginBottom: 12, flexShrink: 0,
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <Search size={14} color="var(--text3)" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or role..."
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: 13, color: 'var(--text1)',
            }}
          />
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
              Loading team...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
              No members found
            </div>
          ) : (
            filtered.map(m => {
              const isActive = selected?.id === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => openPanel(m)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    width: '100%', padding: '10px 12px',
                    background: isActive ? 'rgba(79,127,255,0.1)' : 'transparent',
                    border: 'none', borderRadius: 8, cursor: 'pointer',
                    borderLeft: isActive ? '2px solid #4f7fff' : '2px solid transparent',
                    marginBottom: 2, textAlign: 'left',
                  }}
                >
                  <Avatar member={m} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 600, color: 'var(--text1)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {m.name || m.email}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600, color: getRoleColor(m.role),
                        background: `${getRoleColor(m.role)}18`,
                        padding: '1px 6px', borderRadius: 4, textTransform: 'capitalize',
                      }}>
                        {getRoleLabel(m.role)}
                      </span>
                      {!m.active && (
                        <span style={{ fontSize: 10, color: '#f25a5a' }}>Inactive</span>
                      )}
                      {m.id === currentProfile.id && (
                        <span style={{ fontSize: 10, color: 'var(--text3)' }}>You</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={14} color="var(--text3)" />
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ── Right: Detail panel ───────────────────────────────────────────── */}
      {selected && (
        <div style={{
          flex: '1 1 auto', display: 'flex', flexDirection: 'column',
          padding: '0 0 0 24px', overflow: 'hidden',
        }}>
          {/* Panel header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            marginBottom: 20, flexShrink: 0,
          }}>
            <Avatar member={selected} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)' }}>
                {selected.name || selected.email}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{selected.email}</div>
            </div>
            <button
              onClick={() => { setPreviewOpen(true) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 12px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)',
                background: 'var(--surface2)', cursor: 'pointer',
                fontSize: 12, color: 'var(--text2)',
              }}
            >
              <Eye size={13} />
              View Portal
            </button>
            <button
              onClick={closePanel}
              style={{
                width: 28, height: 28, borderRadius: 6, border: 'none',
                background: 'var(--surface2)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text3)',
              }}
            >
              <X size={14} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
            {/* Role */}
            <div style={{
              background: 'var(--surface2)', borderRadius: 10, padding: 16,
              border: '1px solid rgba(255,255,255,0.06)', marginBottom: 16,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
                Role
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {ROLES.map(r => (
                  <button
                    key={r.value}
                    onClick={() => handleRoleChange(r.value)}
                    style={{
                      padding: '6px 14px', borderRadius: 7, cursor: 'pointer',
                      border: `1px solid ${panelRole === r.value ? r.color : 'rgba(255,255,255,0.08)'}`,
                      background: panelRole === r.value ? `${r.color}18` : 'transparent',
                      fontSize: 12, fontWeight: 600,
                      color: panelRole === r.value ? r.color : 'var(--text2)',
                      transition: 'all 0.12s',
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Feature toggles */}
            <div style={{
              background: 'var(--surface2)', borderRadius: 10, padding: 16,
              border: '1px solid rgba(255,255,255,0.06)', marginBottom: 16,
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: 'var(--text3)',
                letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12,
              }}>
                Feature Access
              </div>

              {/* Admin/owner note */}
              {isAdminRole(panelRole) && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 7,
                  background: 'rgba(139,92,246,0.1)',
                  border: '1px solid rgba(139,92,246,0.2)',
                  marginBottom: 12,
                }}>
                  <AlertCircle size={13} color="#8b5cf6" />
                  <span style={{ fontSize: 12, color: '#8b5cf6' }}>
                    Admins and owners have all features enabled by default.
                  </span>
                </div>
              )}

              {FEATURE_TOGGLES.map(ft => {
                const enabled = panelPerms[ft.key] ?? false
                return (
                  <button
                    key={ft.key}
                    onClick={() => togglePerm(ft.key)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      width: '100%', padding: '8px 0',
                      background: 'none', border: 'none', cursor: 'pointer',
                      textAlign: 'left',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    <div style={{ marginTop: 1, flexShrink: 0 }}>
                      {enabled
                        ? <CheckSquare size={16} color="#22c07a" />
                        : <Square size={16} color="var(--text3)" />
                      }
                    </div>
                    <div>
                      <div style={{
                        fontSize: 13, fontWeight: 600,
                        color: enabled ? 'var(--text1)' : 'var(--text2)',
                      }}>
                        {ft.label}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
                        {ft.description}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Save */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <button
                onClick={save}
                disabled={saving}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '9px 18px', borderRadius: 8,
                  background: '#4f7fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                  fontSize: 13, fontWeight: 600, color: '#fff',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                <Save size={14} />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              {saveMsg && (
                <span style={{
                  fontSize: 12,
                  color: saveMsg === 'Saved' ? '#22c07a' : '#f25a5a',
                }}>
                  {saveMsg}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Portal Preview Modal ──────────────────────────────────────────── */}
      {previewOpen && selected && (
        <PortalPreviewModal
          member={selected}
          previewRole={panelRole}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  )
}
