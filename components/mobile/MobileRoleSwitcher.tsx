'use client'

import type { DemoRole } from './mobileConstants'

const ROLES: { key: DemoRole; label: string }[] = [
  { key: 'owner',       label: 'Owner' },
  { key: 'admin',       label: 'Admin' },
  { key: 'sales_agent', label: 'Sales' },
  { key: 'designer',    label: 'Designer' },
  { key: 'production',  label: 'Production' },
  { key: 'installer',   label: 'Installer' },
  { key: 'qc',          label: 'QC' },
]

export default function MobileRoleSwitcher({
  role,
  onSwitch,
}: {
  role: DemoRole
  onSwitch: (r: DemoRole) => void
}) {
  return (
    <div style={{
      display: 'flex',
      gap: 6,
      padding: '8px 12px',
      overflowX: 'auto',
      flexShrink: 0,
    }}>
      {ROLES.map(r => (
        <button
          key={r.key}
          onClick={() => onSwitch(r.key)}
          style={{
            padding: '4px 10px',
            borderRadius: 99,
            border: r.key === role ? '1px solid var(--purple)' : '1px solid var(--border)',
            background: r.key === role ? 'rgba(139,92,246,0.15)' : 'transparent',
            color: r.key === role ? 'var(--purple)' : 'var(--text2)',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}
