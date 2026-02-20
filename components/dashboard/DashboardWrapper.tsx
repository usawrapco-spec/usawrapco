'use client'

import { useEffect } from 'react'
import DepartmentNav from '@/components/pipeline/DepartmentNav'
import { useToast } from '@/components/shared/Toast'

interface DashboardWrapperProps {
  orgId: string
  profileId: string
  role: string
  children: React.ReactNode  // existing DashboardClient goes here
}

export default function DashboardWrapper({ orgId, profileId, role, children }: DashboardWrapperProps) {
  const { toast } = useToast()

  // Award daily login XP once per day
  useEffect(() => {
    const key = `usawrap_login_xp_${new Date().toISOString().split('T')[0]}`
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1')
      fetch('/api/xp/daily-login', { method: 'POST' })
        .then(r => r.json())
        .then(data => {
          if (data.xpAwarded > 0) {
            toast(`+${data.xpAwarded} XP — Day ${data.streak} streak!`, 'success')
          }
        })
        .catch(() => {})
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
