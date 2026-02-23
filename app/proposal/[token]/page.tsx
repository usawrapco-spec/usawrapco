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

  return <ProposalClient proposal={proposal} />
}
