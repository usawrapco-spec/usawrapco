'use client'

import DepartmentNav from '@/components/pipeline/DepartmentNav'

interface DashboardWrapperProps {
  orgId: string
  profileId: string
  role: string
  children: React.ReactNode
}

// XP awarding is handled by XPAwarder component — do not duplicate here
export default function DashboardWrapper({ orgId, profileId, role, children }: DashboardWrapperProps) {
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
