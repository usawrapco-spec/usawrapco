'use client'

import { useState } from 'react'
import { Shield, Check, X, Info } from 'lucide-react'
import type { Profile, UserRole, Permission } from '@/types'
import { ROLE_PERMISSIONS, ALL_PERMISSIONS, isAdminRole } from '@/types'

const headingFont = 'Barlow Condensed, sans-serif'

interface Props {
  profile: Profile
}

const ROLES: { key: UserRole; label: string; color: string }[] = [
  { key: 'owner', label: 'Owner', color: '#f59e0b' },
  { key: 'admin', label: 'Admin', color: '#4f7fff' },
  { key: 'sales_agent', label: 'Sales Agent', color: '#22c07a' },
  { key: 'designer', label: 'Designer', color: '#8b5cf6' },
  { key: 'production', label: 'Production', color: '#22d3ee' },
  { key: 'installer', label: 'Installer', color: '#f25a5a' },
  { key: 'viewer', label: 'Viewer', color: '#5a6080' },
]

export default function PermissionsManager({ profile }: Props) {
  const [selectedRole, setSelectedRole] = useState<UserRole>('sales_agent')

  const groups = Array.from(new Set(ALL_PERMISSIONS.map(p => p.group)))

  const rolePerms = ROLE_PERMISSIONS[selectedRole] || []

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Shield size={20} style={{ color: 'var(--accent)' }} />
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text1)', fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Permissions
          </h1>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text3)' }}>
          View role-based permissions for your team. Owner and Admin roles have full access.
        </p>
      </div>

      {/* Role tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
        {ROLES.map(r => (
          <button
            key={r.key}
            onClick={() => setSelectedRole(r.key)}
            style={{
              padding: '8px 16px', borderRadius: 8, whiteSpace: 'nowrap',
              border: `2px solid ${selectedRole === r.key ? r.color : 'var(--border)'}`,
              background: selectedRole === r.key ? `${r.color}15` : 'var(--surface)',
              color: selectedRole === r.key ? r.color : 'var(--text3)',
              fontSize: 13, fontWeight: 800, cursor: 'pointer',
              fontFamily: headingFont, textTransform: 'uppercase', letterSpacing: '0.04em',
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Info banner for owner/admin */}
      {isAdminRole(selectedRole) && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
          padding: '12px 16px', background: 'rgba(79,127,255,0.08)', border: '1px solid rgba(79,127,255,0.2)',
          borderRadius: 10,
        }}>
          <Info size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: 'var(--accent)' }}>
            {selectedRole === 'owner' ? 'Owner' : 'Admin'} role has full access to all features and cannot be restricted.
          </span>
        </div>
      )}

      {/* Permissions grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {groups.map(group => {
          const perms = ALL_PERMISSIONS.filter(p => p.group === group)
          return (
            <div key={group} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{
                padding: '12px 16px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)',
                fontSize: 11, fontWeight: 900, color: 'var(--text3)',
                textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: headingFont,
              }}>
                {group}
              </div>
              <div>
                {perms.map((perm, i) => {
                  const hasAccess = rolePerms.includes(perm.key)
                  return (
                    <div
                      key={perm.key}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 16px',
                        borderBottom: i < perms.length - 1 ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      <span style={{ fontSize: 13, color: 'var(--text1)', fontWeight: 500 }}>{perm.label}</span>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '3px 10px', borderRadius: 20,
                        background: hasAccess ? 'rgba(34,192,122,0.1)' : 'rgba(90,96,128,0.1)',
                        color: hasAccess ? 'var(--green)' : 'var(--text3)',
                        fontSize: 11, fontWeight: 700,
                      }}>
                        {hasAccess ? <><Check size={12} /> Allowed</> : <><X size={12} /> Denied</>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Role comparison matrix */}
      <div style={{ marginTop: 32 }}>
        <div style={{
          fontSize: 16, fontWeight: 900, color: 'var(--text1)', fontFamily: headingFont,
          textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 16,
        }}>
          Role Comparison Matrix
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--surface)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
            <thead>
              <tr>
                <th style={{
                  padding: '10px 14px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)',
                  textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--text3)',
                  textTransform: 'uppercase', letterSpacing: '0.06em', position: 'sticky', left: 0,
                }}>Permission</th>
                {ROLES.map(r => (
                  <th key={r.key} style={{
                    padding: '10px 8px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)',
                    textAlign: 'center', fontSize: 10, fontWeight: 800, color: r.color,
                    textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap',
                  }}>{r.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_PERMISSIONS.map((perm, i) => (
                <tr key={perm.key}>
                  <td style={{
                    padding: '8px 14px', fontSize: 12, color: 'var(--text2)',
                    borderBottom: i < ALL_PERMISSIONS.length - 1 ? '1px solid var(--border)' : 'none',
                    position: 'sticky', left: 0, background: 'var(--surface)',
                  }}>{perm.label}</td>
                  {ROLES.map(r => {
                    const has = (ROLE_PERMISSIONS[r.key] || []).includes(perm.key)
                    return (
                      <td key={r.key} style={{
                        textAlign: 'center', padding: '8px',
                        borderBottom: i < ALL_PERMISSIONS.length - 1 ? '1px solid var(--border)' : 'none',
                      }}>
                        {has ? (
                          <Check size={14} style={{ color: 'var(--green)' }} />
                        ) : (
                          <X size={14} style={{ color: 'var(--text3)', opacity: 0.3 }} />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
