import { getSupabaseAdmin } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import DealerExplorerClient from '@/components/portal/DealerExplorerClient'

export const dynamic = 'force-dynamic'

export default async function DealerExplorerPage({ params }: { params: { token: string } }) {
  const supabase = getSupabaseAdmin()

  const { data: dealer } = await supabase
    .from('dealers')
    .select('id, name')
    .eq('portal_token', params.token)
    .eq('active', true)
    .single()

  if (!dealer) notFound()

  return <DealerExplorerClient dealerId={dealer.id} dealerName={dealer.name} />
}
