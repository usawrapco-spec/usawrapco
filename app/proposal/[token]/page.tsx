import { getSupabaseAdmin } from '@/lib/supabase/service'
import ProposalFlow from './ProposalFlow'
import { notFound } from 'next/navigation'

export default async function ProposalPage({ params }: { params: { token: string } }) {
  const supabase = getSupabaseAdmin()

  // Fetch proposal by public_token
  const { data: proposal } = await supabase
    .from('proposals')
    .select('*')
    .eq('public_token', params.token)
    .single()

  if (!proposal) notFound()

  // Check expiration
  if (proposal.expiration_date && new Date(proposal.expiration_date) < new Date() && proposal.status !== 'accepted') {
    notFound()
  }

  // Track view
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

  // Fetch estimate info
  let customer: any = null
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
        customer = c
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
      token={params.token}
      proposal={proposal}
      packages={packages || []}
      upsells={upsells || []}
      customer={customer}
      salesRep={salesRep}
      vehicleInfo={vehicleInfo}
    />
  )
}
