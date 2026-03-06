import { getSupabaseAdmin } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import PortalProposalsList from './PortalProposalsList'

export const dynamic = 'force-dynamic'

export default async function PortalProposalsPage({
  params,
}: {
  params: { token: string }
}) {
  const supabase = getSupabaseAdmin()

  // Resolve customer from portal token
  const { data: customer } = await supabase
    .from('customers')
    .select('id, name')
    .eq('portal_token', params.token)
    .single()

  if (!customer) return notFound()

  // Fetch proposals for this customer (via estimate → customer_id OR direct customer_id)
  const { data: proposals } = await supabase
    .from('proposals')
    .select(`
      id, title, status, public_token, deposit_amount, created_at,
      sent_at, viewed_at, accepted_at, declined_at, expiration_date,
      estimate:estimate_id(
        id, estimate_number, total, form_data,
        customer:customer_id(id, name)
      )
    `)
    .or(`customer_id.eq.${customer.id}`)
    .order('created_at', { ascending: false })

  // Also fetch proposals linked via estimates owned by this customer
  const { data: estProposals } = await supabase
    .from('estimates')
    .select('id')
    .eq('customer_id', customer.id)

  const estimateIds = (estProposals || []).map((e: any) => e.id)

  let allProposals = proposals || []

  if (estimateIds.length > 0) {
    const { data: estLinked } = await supabase
      .from('proposals')
      .select(`
        id, title, status, public_token, deposit_amount, created_at,
        sent_at, viewed_at, accepted_at, declined_at, expiration_date,
        estimate:estimate_id(
          id, estimate_number, total, form_data,
          customer:customer_id(id, name)
        )
      `)
      .in('estimate_id', estimateIds)
      .order('created_at', { ascending: false })

    // Merge and deduplicate
    const seen = new Set(allProposals.map((p: any) => p.id))
    for (const p of estLinked || []) {
      if (!seen.has(p.id)) allProposals.push(p)
    }
  }

  // Filter out drafts (customer shouldn't see unsent proposals)
  allProposals = allProposals.filter((p: any) => p.status !== 'draft')

  return (
    <PortalProposalsList
      proposals={allProposals}
      portalToken={params.token}
    />
  )
}
