import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import ShopManageClient from '@/components/shop/ShopManageClient'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'

export default async function ShopManagePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: products } = await admin
    .from('shop_products')
    .select('*')
    .eq('org_id', ORG_ID)
    .order('sort_order')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
      <TopNav profile={profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        <ShopManageClient products={products || []} />
      </main>
      <MobileNav />
    </div>
  )
}
