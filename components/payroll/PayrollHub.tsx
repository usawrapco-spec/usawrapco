'use client'

import { useState } from 'react'
import type { Profile } from '@/types'
import {
  DollarSign, Car, Receipt, Play, Truck, Users, Settings, Wrench
} from 'lucide-react'
import dynamic from 'next/dynamic'

const EnhancedPayrollClient = dynamic(() => import('./EnhancedPayrollClient'), { ssr: false })
const PayrollRunsClient = dynamic(() => import('./PayrollRunsClient'), { ssr: false })
const InstallerPayClient = dynamic(() => import('./InstallerPayClient'), { ssr: false })

type HubTab = 'runs' | 'legacy' | 'installer'

export default function PayrollHub({
  profile,
  employees,
  projects,
}: {
  profile: Profile
  employees: any[]
  projects: any[]
}) {
  const [tab, setTab] = useState<HubTab>('runs')

  const tabs: { id: HubTab; label: string; icon: typeof DollarSign; desc: string }[] = [
    { id: 'runs', label: 'Payroll Runs', icon: Play, desc: 'Process pay periods with mileage + expenses' },
    { id: 'installer', label: 'Installer Pay Calculator', icon: Wrench, desc: 'Flat rate + speed bonus CAGE pay calculator' },
    { id: 'legacy', label: 'Pay Settings & Commissions', icon: Settings, desc: 'Employee pay types, rates, and commission history' },
  ]

  return (
    <div style={{ minHeight: '100%' }}>
      {/* Hub tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {tabs.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 10,
              border: `1px solid ${active ? 'var(--accent)' : '#2a2d3a'}`,
              background: active ? 'var(--accent)22' : 'var(--surface)',
              color: active ? 'var(--accent)' : 'var(--text2)', cursor: 'pointer', transition: 'all 0.15s'
            }}>
              <Icon size={16} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: active ? 'var(--accent)' : 'var(--text1)' }}>{t.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>{t.desc}</div>
              </div>
            </button>
          )
        })}
      </div>

      {tab === 'runs' && (
        <PayrollRunsClient profile={profile} employees={employees} projects={projects} />
      )}
      {tab === 'installer' && (
        <InstallerPayClient profile={profile} />
      )}
      {tab === 'legacy' && (
        <EnhancedPayrollClient profile={profile} employees={employees} projects={projects} />
      )}
    </div>
  )
}
