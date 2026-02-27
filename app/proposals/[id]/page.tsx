import { getSupabaseAdmin } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ProposalBuilder from './ProposalBuilder'

export const metadata = { title: 'Proposal Builder — USA Wrap Co' }

export default async function ProposalBuilderPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()

  const { data: proposal } = await admin
    .from('proposals')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!proposal) notFound()

  const [packagesResult, upsellsResult] = await Promise.all([
    admin.from('proposal_packages').select('*').eq('proposal_id', params.id).order('sort_order'),
    admin.from('proposal_upsells').select('*').eq('proposal_id', params.id).order('sort_order'),
  ])

  // Try to resolve customer
  let customer: { id: string; name: string; email: string; phone: string | null } | null = null
  if (proposal.customer_id) {
    const { data: c } = await admin
      .from('customers')
      .select('id, name, email, phone')
      .eq('id', proposal.customer_id)
      .single()
    customer = c
  } else if (proposal.estimate_id) {
    const { data: est } = await admin
      .from('estimates')
      .select('customer_id')
      .eq('id', proposal.estimate_id)
      .single()
    if (est?.customer_id) {
      const { data: c } = await admin
        .from('customers')
        .select('id, name, email, phone')
        .eq('id', est.customer_id)
        .single()
      customer = c
    }
  }

  return (
    <ProposalBuilder
      proposal={proposal}
      packages={packagesResult.data || []}
      upsells={upsellsResult.data || []}
      initialCustomer={customer}
    />
  )
}
