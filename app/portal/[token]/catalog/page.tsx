import { getSupabaseAdmin } from '@/lib/supabase/service'
import PortalCatalog from '@/components/portal/PortalCatalog'

export const dynamic = 'force-dynamic'

export default async function PortalCatalogPage({
  params,
}: {
  params: { token: string }
}) {
  const { token } = params
  const supabase = getSupabaseAdmin()

  // Validate customer token
  const { data: customer } = await supabase
    .from('customers')
    .select('id, org_id')
    .eq('portal_token', token)
    .single()

  if (!customer) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#8a8fa8' }}>Invalid portal link.</div>
  }

  // Fetch active products (org-specific + global defaults)
  const { data: products } = await supabase
    .from('catalog_products')
    .select('*')
    .eq('active', true)
    .or(`org_id.eq.${customer.org_id},org_id.is.null`)
    .order('sort_order', { ascending: true })

  return (
    <PortalCatalog
      token={token}
      products={(products || []) as any[]}
    />
  )
}
