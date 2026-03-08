export const dynamic = 'force-dynamic'

import PortalLoginClient from '@/components/portal/PortalLoginClient'

export default function PortalLoginPage({
  searchParams,
}: {
  searchParams: { next?: string }
}) {
  return <PortalLoginClient next={searchParams.next} />
}
