import { getSupabaseAdmin } from '@/lib/supabase/service'
import ProposalClient from './ProposalClient'
import { notFound } from 'next/navigation'

export default async function ProposalPage({ params }: { params: { token: string } }) {
  const supabase = getSupabaseAdmin()

  const { data: proposal } = await supabase
    .from('proposals')
    .select('*')
    .eq('token', params.token)
    .single()

  if (!proposal) notFound()

  // Track view
  if (!proposal.viewed_at) {
    await supabase
      .from('proposals')
      .update({ viewed_at: new Date().toISOString() })
      .eq('token', params.token)
  }

  // Fetch brand portfolio for this proposal (by project or customer)
  let brandPortfolio = null
  if (proposal.project_id || proposal.customer_id) {
    let bpQuery = supabase
      .from('brand_portfolios')
      .select('*')
      .order('created_at', { ascending: false })
    if (proposal.project_id) bpQuery = bpQuery.eq('project_id', proposal.project_id)
    else if (proposal.customer_id) bpQuery = bpQuery.eq('customer_id', proposal.customer_id)
    const { data: bpData } = await bpQuery.limit(1).single()
    brandPortfolio = bpData || null
  }

  return <ProposalClient proposal={proposal} initialPortfolio={brandPortfolio} />
}
