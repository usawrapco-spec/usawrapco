import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect, notFound } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
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
    <div className="flex h-screen bg-bg overflow-hidden">
      <Sidebar profile={profileRes.data as Profile} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar profile={profileRes.data as Profile} />
        <main className="flex-1 overflow-y-auto p-6">
          <CustomerDetailClient
            profile={profileRes.data as Profile}
            customer={customerRes.data}
            projects={projectsRes.data || []}
          />
        </main>
      </div>
    </div>
  )
}
