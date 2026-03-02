import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import PortalExplorerClient from '@/components/portal/PortalExplorerClient'

export const dynamic = 'force-dynamic'

export default async function ExplorerPage({ params }: { params: { token: string } }) {
  const { token } = params
  const supabase = getSupabaseAdmin()

  // Verify token
  const { data: customer } = await supabase
    .from('customers')
    .select('id, name')
    .eq('portal_token', token)
    .single()

  if (!customer) redirect('/portal/login')

  return <PortalExplorerClient />
}
