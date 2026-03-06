import { getSupabaseAdmin } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import ProposalFlow from '@/app/proposal/[token]/ProposalFlow'

export const dynamic = 'force-dynamic'

export default async function PortalProposalPage({
  params,
}: {
  params: { token: string; proposalId: string }
}) {
  const supabase = getSupabaseAdmin()

  // Verify portal token → customer
  const { data: customer } = await supabase
    .from('customers')
    .select('id, name')
    .eq('portal_token', params.token)
    .single()

  if (!customer) return notFound()

  // Fetch proposal
  const { data: proposal } = await supabase
    .from('proposals')
    .select('*')
    .eq('id', params.proposalId)
    .single()

  if (!proposal) return notFound()

  // Don't show draft proposals to customers
  if (proposal.status === 'draft') return notFound()

  // Track view if not already viewed
  if (!proposal.viewed_at && proposal.status === 'sent') {
    await supabase
      .from('proposals')
      .update({ viewed_at: new Date().toISOString(), status: 'viewed' })
      .eq('id', proposal.id)
  }

  // Fetch packages
  const { data: packages } = await supabase
    .from('proposal_packages')
    .select('*')
    .eq('proposal_id', proposal.id)
    .order('sort_order')

  // Fetch upsells
  const { data: upsells } = await supabase
    .from('proposal_upsells')
    .select('*')
    .eq('proposal_id', proposal.id)
    .order('sort_order')

  // Fetch survey vehicles (for inspection notes)
  let surveyVehicles: any[] = []
  if (proposal.include_inspection !== false && proposal.estimate_id) {
    const { data: vehicles } = await supabase
      .from('estimate_survey_vehicles')
      .select(`*, estimate_survey_photos(*)`)
      .eq('estimate_id', proposal.estimate_id)
      .order('sort_order')
    if (vehicles) {
      surveyVehicles = vehicles.map((v: any) => ({
        ...v,
        photos: v.estimate_survey_photos || [],
      }))
    }
  }

  // Fetch estimate info for vehicle/customer/sales rep
  let customerInfo: any = null
  let salesRep: any = null
  let vehicleInfo: any = null

  if (proposal.estimate_id) {
    const { data: estimate } = await supabase
      .from('estimates')
      .select('id, title, customer_id, sales_rep_id, line_items, form_data')
      .eq('id', proposal.estimate_id)
      .single()

    if (estimate) {
      if (estimate.customer_id) {
        const { data: c } = await supabase
          .from('profiles')
          .select('id, name, email, phone, avatar_url')
          .eq('id', estimate.customer_id)
          .single()
        customerInfo = c
      }
      if (estimate.sales_rep_id) {
        const { data: r } = await supabase
          .from('profiles')
          .select('id, name, email, phone, avatar_url')
          .eq('id', estimate.sales_rep_id)
          .single()
        salesRep = r
      }
      const items = estimate.line_items || []
      if (items.length > 0) {
        const specs = items[0]?.specs || {}
        vehicleInfo = {
          year: specs.vehicleYear,
          make: specs.vehicleMake,
          model: specs.vehicleModel,
          color: specs.vehicleColor,
        }
      }
    }
  }

  return (
    <ProposalFlow
      token={proposal.public_token}
      proposal={proposal}
      packages={packages || []}
      upsells={upsells || []}
      customer={customerInfo}
      salesRep={salesRep}
      vehicleInfo={vehicleInfo}
      surveyVehicles={surveyVehicles}
      portalToken={params.token}
    />
  )
}
