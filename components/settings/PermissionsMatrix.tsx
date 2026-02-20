'use client'

import { Check, X } from 'lucide-react'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/permissions'
import { ROLE_PERMISSIONS } from '@/types'
import type { UserRole, Permission } from '@/types'

const ALL_ROLES: UserRole[] = ['owner', 'admin', 'sales_agent', 'designer', 'production', 'installer', 'viewer']

const PERMISSION_GROUPS: { group: string; items: { key: Permission; label: string; desc: string }[] }[] = [
  {
    group: 'Dashboard & Analytics',
    items: [
      { key: 'view_analytics',    label: 'View Analytics',    desc: 'Revenue charts, KPIs, forecasts' },
      { key: 'view_financials',   label: 'View Financials',   desc: 'Job costs, GP, commission amounts' },
      { key: 'view_master_mode',  label: 'Master Mode',       desc: 'Full financial overview, all agents' },
    ],
  },
  {
    group: 'Jobs & Projects',
    items: [
      { key: 'view_all_projects', label: 'View All Projects', desc: 'See every job regardless of assignment' },
      { key: 'edit_projects',     label: 'Edit Projects',     desc: 'Update job fields, status, financials' },
      { key: 'delete_projects',   label: 'Delete Projects',   desc: 'Permanently remove jobs' },
    ],
  },
  {
    group: 'Sales',
    items: [
      { key: 'view_all_agents',   label: 'View All Agents',   desc: "See other reps' leads and pipeline" },
      { key: 'sign_off_sales',    label: 'Sales Sign-Off',    desc: 'Close deals, mark as won/lost' },
    ],
  },
  {
    group: 'Design Studio',
    items: [
      { key: 'access_design_studio', label: 'Design Studio', desc: 'Create and edit designs on the canvas' },
    ],
  },
  {
    group: 'Production',
    items: [
      { key: 'sign_off_production', label: 'Production Sign-Off', desc: 'Approve production briefs, start print' },
      { key: 'view_inventory',      label: 'Vinyl Inventory',     desc: 'View material rolls and remnants' },
      { key: 'manage_bids',         label: 'Manage Bids',         desc: 'Accept/reject installer bids' },
    ],
  },
  {
    group: 'Installation',
    items: [
      { key: 'sign_off_install', label: 'Install Sign-Off', desc: 'Log install, sign liability, mark done' },
    ],
  },
  {
    group: 'Admin',
    items: [
      { key: 'manage_users',    label: 'Manage Team',     desc: 'Invite, edit roles, disable accounts' },
      { key: 'manage_settings', label: 'Settings Access', desc: 'Commission rules, defaults, integrations' },
      { key: 'manage_workflows',label: 'Manage Workflows',desc: 'Automation rules, stage configs' },
    ],
  },
]

export function PermissionsMatrix() {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
        <thead>
          <tr>
            {/* Permission column */}
            <th style={{
              padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700,
              color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em',
              fontFamily: 'Barlow Condensed, sans-serif', borderBottom: '2px solid #1a1d27',
              background: '#0d0f14', position: 'sticky', left: 0, minWidth: 220,
            }}>
              Permission
            </th>
            {/* Role columns */}
            {ALL_ROLES.map(role => {
              const color = ROLE_COLORS[role]
              return (
                <th key={role} style={{
                  padding: '12px 16px', textAlign: 'center', borderBottom: '2px solid #1a1d27',
                  background: '#0d0f14',
                }}>
                  <span style={{
                    display: 'inline-block', padding: '4px 10px', borderRadius: 6,
                    fontSize: 11, fontWeight: 800, background: `${color}18`, color,
                  }}>
                    {ROLE_LABELS[role]}
                  </span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {PERMISSION_GROUPS.map(group => (
            <>
              {/* Group header row */}
              <tr key={`group-${group.group}`}>
                <td
                  colSpan={ALL_ROLES.length + 1}
                  style={{
                    padding: '8px 16px', fontSize: 11, fontWeight: 800,
                    color: '#4f7fff', textTransform: 'uppercase', letterSpacing: '0.08em',
                    fontFamily: 'Barlow Condensed, sans-serif',
                    background: 'rgba(79,127,255,0.04)', borderBottom: '1px solid #1a1d27',
                    borderTop: '1px solid #1a1d27',
                  }}
                >
                  {group.group}
                </td>
              </tr>

              {/* Permission rows */}
              {group.items.map((item, idx) => (
                <tr
                  key={item.key}
                  style={{ borderBottom: '1px solid rgba(26,29,39,0.5)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(79,127,255,0.02)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  {/* Permission name + desc */}
                  <td style={{
                    padding: '10px 16px', background: 'inherit',
                    position: 'sticky', left: 0,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e8eaed' }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: '#5a6080', marginTop: 2 }}>{item.desc}</div>
                  </td>

                  {/* Check marks per role */}
                  {ALL_ROLES.map(role => {
                    const has = (ROLE_PERMISSIONS[role] ?? []).includes(item.key)
                    return (
                      <td key={role} style={{ padding: '10px 16px', textAlign: 'center' }}>
                        {has ? (
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 22, height: 22, borderRadius: '50%',
                            background: 'rgba(34,192,122,0.15)',
                          }}>
                            <Check size={13} style={{ color: '#22c07a' }} />
                          </div>
                        ) : (
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 22, height: 22, borderRadius: '50%',
                          }}>
                            <X size={13} style={{ color: '#2a2d3a' }} />
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}
