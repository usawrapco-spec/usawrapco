export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase/service'
import MockupPaywall from '@/components/portal/MockupPaywall'
import DesignMockupWizard from '@/components/portal/DesignMockupWizard'

export const metadata = {
  title: 'AI Wrap Design — USA WRAP CO',
  description:
    'See your vehicle wrap before you commit. AI-powered mockup generator with professional designer refinement.',
}

export default async function PortalDesignPage({
  searchParams,
}: {
  searchParams: { mockup?: string }
}) {
  // If a mockup ID is provided, show the paywall
  if (searchParams.mockup) {
    const admin = getSupabaseAdmin()
    const { data: mockup } = await admin
      .from('design_mockups')
      .select('id, business_name, vehicle_type, mockup_urls, payment_status')
      .eq('id', searchParams.mockup)
      .maybeSingle()

    return (
      <MockupPaywall
        mockup={
          mockup as {
            id: string
            business_name: string | null
            vehicle_type: string | null
            mockup_urls: string[] | null
            payment_status: string
          } | null
        }
        mockupId={searchParams.mockup}
      />
    )
  }

  // No mockup param — show the design wizard (existing behavior)
  return <DesignMockupWizard />
}
