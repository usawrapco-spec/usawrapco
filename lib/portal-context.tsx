'use client'

import { createContext, useContext } from 'react'

export interface PortalCustomer {
  id: string
  name: string
  email: string | null
  phone: string | null
  portal_token: string
  company_name?: string | null
}

export interface PortalProject {
  id: string
  title: string
  vehicle_desc: string | null
  pipe_stage: string
  install_date: string | null
  created_at: string
  revenue: number | null
  type: string | null
  customer_id: string | null
}

export interface PortalContextValue {
  customer: PortalCustomer
  token: string
  orgName: string
  projects: PortalProject[]
  hasFleet?: boolean
}

const PortalCtx = createContext<PortalContextValue | null>(null)

export function PortalProvider({
  value,
  children,
}: {
  value: PortalContextValue
  children: React.ReactNode
}) {
  return <PortalCtx.Provider value={value}>{children}</PortalCtx.Provider>
}

export function usePortal(): PortalContextValue {
  const ctx = useContext(PortalCtx)
  if (!ctx) throw new Error('usePortal must be used within PortalProvider')
  return ctx
}
