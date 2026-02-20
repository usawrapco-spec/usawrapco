'use client'

import { useState } from 'react'
import SalesPipeline from '@/components/pipeline/SalesPipeline'
import ProductionPipeline from '@/components/pipeline/ProductionPipeline'
import InstallPipeline from '@/components/pipeline/InstallPipeline'

interface DepartmentNavProps {
  orgId: string
  profileId: string
  role: string
  defaultView?: string
  children?: React.ReactNode  // passes through the original dashboard as "All Jobs"
}

const DEPARTMENTS = [
  { key: 'all', label: 'All Jobs', icon: '📊', color: 'var(--text1)' },
  { key: 'sales', label: 'Sales', icon: '💼', color: '#4f7fff' },
  { key: 'production', label: 'Production / Design', icon: '🖨', color: '#22c07a' },
  { key: 'install', label: 'Install', icon: '🔧', color: '#22d3ee' },
]

export default function DepartmentNav({ orgId, profileId, role, defaultView, children }: DepartmentNavProps) {
  const [active, setActive] = useState(defaultView || getDefaultForRole(role))

  return (
    <div>
      {/* Department tabs */}
      <div style={{
        display: 'flex',
        gap: 4,
        marginBottom: 16,
        padding: 4,
        background: 'var(--surface)',
        borderRadius: 12,
        border: '1px solid var(--border)',
      }}>
        {DEPARTMENTS.map(dept => {
          // Only show relevant tabs based on role
          if (!shouldShowTab(dept.key, role)) return null

          return (
            <button
              key={dept.key}
              onClick={() => setActive(dept.key)}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 9,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: 13,
                fontWeight: active === dept.key ? 800 : 600,
                background: active === dept.key ? `${dept.color}15` : 'transparent',
                color: active === dept.key ? dept.color : 'var(--text3)',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: 15 }}>{dept.icon}</span>
              {dept.label}
            </button>
          )
        })}
      </div>

      {/* Pipeline content */}
      <div>
        {active === 'all' && children}

        {active === 'sales' && (
          <SalesPipeline
            orgId={orgId}
            profileId={profileId}
            role={role}
          />
        )}

        {active === 'production' && (
          <ProductionPipeline
            orgId={orgId}
            profileId={profileId}
            role={role}
          />
        )}

        {active === 'install' && (
          <InstallPipeline
            orgId={orgId}
            profileId={profileId}
            role={role}
          />
        )}
      </div>
    </div>
  )
}

function getDefaultForRole(role: string): string {
  switch (role) {
    case 'sales': return 'sales'
    case 'installer': return 'install'
    case 'production':
    case 'designer': return 'production'
    default: return 'all'  // admin, owner
  }
}

function shouldShowTab(tab: string, role: string): boolean {
  // Admin/owner sees everything
  if (['admin', 'owner'].includes(role)) return true

  // Everyone sees their own dept + all jobs
  if (tab === 'all') return true
  if (tab === 'sales' && ['sales'].includes(role)) return true
  if (tab === 'production' && ['production', 'designer'].includes(role)) return true
  if (tab === 'install' && ['installer'].includes(role)) return true

  // Production can see install
  if (tab === 'install' && role === 'production') return true

  return false
}
