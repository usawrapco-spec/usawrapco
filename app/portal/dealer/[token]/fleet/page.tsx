import { getSupabaseAdmin } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import DealerFleetClient from '@/components/portal/DealerFleetClient'

export const dynamic = 'force-dynamic'

export default async function DealerFleetPage({ params }: { params: { token: string } }) {
  const supabase = getSupabaseAdmin()

  const { data: dealer } = await supabase
    .from('dealers')
    .select('id, name')
    .eq('portal_token', params.token)
    .eq('active', true)
    .single()

  if (!dealer) notFound()

  return <DealerFleetClient entityId={dealer.id} />
}
