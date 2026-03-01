'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Profile, UserRole } from '@/types'
import { Printer, Users, Eye, RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import { PortalPreviewModal } from './PortalPreviewModal'

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

const ROLE_COLORS: Record<string, string> = {
  owner: '#f59e0b', admin: '#8b5cf6', sales_agent: '#4f7fff',
  designer: '#22c07a', production: '#22d3ee', installer: '#f25a5a', viewer: '#9299b5',
}
const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner', admin: 'Admin', sales_agent: 'Sales Agent',
  designer: 'Designer', production: 'Production', installer: 'Installer', viewer: 'Viewer',
}

const ROLE_ORDER: UserRole[] = ['owner', 'admin', 'sales_agent', 'production', 'designer', 'installer', 'viewer']

export default function EmployeePortalsClient({ currentProfile }: { currentProfile: Profile }) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [previewMember, setPreviewMember] = useState<TeamMember | null>(null)

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

  // Group by role
  const byRole: Record<string, TeamMember[]> = {}
  for (const m of members) {
    if (!byRole[m.role]) byRole[m.role] = []
    byRole[m.role].push(m)
  }

  const activeCount = members.filter(m => m.active).length

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Printer size={20} color="var(--text2)" />
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text1)' }}>Employee Portals</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>
            {members.length} total &nbsp;&bull;&nbsp; {activeCount} active
          </div>
        </div>
        <button
          onClick={load}
          style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 12px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)',
            background: 'var(--surface2)', cursor: 'pointer', fontSize: 12, color: 'var(--text2)',
          }}
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
        {ROLE_ORDER.filter(r => byRole[r]?.length > 0).map(role => (
          <div key={role} style={{
            background: 'var(--surface2)', borderRadius: 10, padding: '12px 16px',
            border: `1px solid ${ROLE_COLORS[role]}30`,
            minWidth: 110,
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: ROLE_COLORS[role] }}>
              {byRole[role].length}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
              {ROLE_LABELS[role]}
            </div>
          </div>
        ))}
      </div>

      {/* Members grouped by role */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)', fontSize: 13 }}>
          Loading team portals...
        </div>
      ) : (
        ROLE_ORDER.filter(r => byRole[r]?.length > 0).map(role => (
          <div key={role} style={{ marginBottom: 28 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 10,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: ROLE_COLORS[role], flexShrink: 0,
              }} />
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                textTransform: 'uppercase', color: ROLE_COLORS[role],
              }}>
                {ROLE_LABELS[role]}
              </div>
              <div style={{
                fontSize: 10, color: 'var(--text3)',
                background: 'var(--surface2)', padding: '1px 7px', borderRadius: 10,
              }}>
                {byRole[role].length}
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 10,
            }}>
              {byRole[role].map(m => (
                <div
                  key={m.id}
                  style={{
                    background: 'var(--surface2)', borderRadius: 10,
                    padding: '14px 16px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', flexDirection: 'column', gap: 10,
                  }}
                >
                  {/* Member row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%',
                      background: ROLE_COLORS[m.role],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0, overflow: 'hidden',
                    }}>
                      {m.avatar_url
                        ? <img src={m.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : (m.name || '?').charAt(0).toUpperCase()
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: 'var(--text1)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {m.name || m.email}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
                        {m.email}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      {m.active
                        ? <CheckCircle size={13} color="#22c07a" />
                        : <XCircle size={13} color="#f25a5a" />
                      }
                      <span style={{ fontSize: 10, color: m.active ? '#22c07a' : '#f25a5a' }}>
                        {m.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {/* Portal access info */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 10px', borderRadius: 6,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <Users size={11} color="var(--text3)" />
                    <span style={{ fontSize: 11, color: 'var(--text3)', flex: 1 }}>
                      {Object.values(m.feature_permissions ?? {}).filter(Boolean).length} features enabled
                    </span>
                    {m.id !== currentProfile.id && (
                      <button
                        onClick={() => setPreviewMember(m)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '4px 9px', borderRadius: 5,
                          border: '1px solid rgba(255,255,255,0.1)',
                          background: 'transparent', cursor: 'pointer',
                          fontSize: 11, color: 'var(--text2)',
                        }}
                      >
                        <Eye size={11} />
                        Preview
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Preview modal */}
      {previewMember && (
        <PortalPreviewModal
          member={previewMember}
          previewRole={previewMember.role}
          onClose={() => setPreviewMember(null)}
        />
      )}
    </div>
  )
}
