import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Customer Portal | USA Wrap Co',
  description: 'Track your wrap projects, approve designs, and manage invoices.',
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
