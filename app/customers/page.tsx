import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import CustomersClient from '@/components/customers/CustomersClient'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export default async function CustomersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  // Load customers — try new customers table, fallback to profiles with customer role
  const { data: customers } = await admin
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
          <CustomersClient
            profile={profile as Profile}
            initialCustomers={customers || []}
          />
        </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
