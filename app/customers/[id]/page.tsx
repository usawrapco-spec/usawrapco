import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect, notFound } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import CustomerDetailClient from '@/components/customers/CustomerDetailClient'

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()

  const [profileRes, customerRes, projectsRes] = await Promise.all([
    admin.from('profiles').select('*').eq('id', user.id).single(),
    admin.from('customers').select('*').eq('id', params.id).single(),
    admin.from('projects')
      .select('id, title, vehicle_desc, status, pipe_stage, revenue, created_at, updated_at, type, priority')
      .eq('customer_id', params.id)
      .order('created_at', { ascending: false }),
  ])

  if (!profileRes.data) redirect('/login')
  if (!customerRes.data) notFound()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profileRes.data as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
          <CustomerDetailClient
            profile={profileRes.data as Profile}
            customer={customerRes.data}
            projects={projectsRes.data || []}
          />
        </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
