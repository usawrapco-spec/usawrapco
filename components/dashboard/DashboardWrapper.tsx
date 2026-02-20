'use client'

import { useEffect } from 'react'
import DepartmentNav from '@/components/pipeline/DepartmentNav'

interface DashboardWrapperProps {
  orgId: string
  profileId: string
  role: string
  children: React.ReactNode  // existing DashboardClient goes here
}

export default function DashboardWrapper({ orgId, profileId, role, children }: DashboardWrapperProps) {
  // Award daily login XP once per day
  useEffect(() => {
    const key = `usawrap_login_xp_${new Date().toISOString().split('T')[0]}`
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1')
      fetch('/api/xp/daily-login', { method: 'POST' }).catch(() => {})
    }
  }, [])

  return (
    <DepartmentNav
      orgId={orgId}
      profileId={profileId}
      role={role}
    >
      {children}
    </DepartmentNav>
  )
}
