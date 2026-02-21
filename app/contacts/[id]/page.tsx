import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect, notFound } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import ContactDetailClient from '@/components/contacts/ContactDetailClient'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export default async function ContactDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()

  // Fetch profile
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Fetch customer by ID
  let customer = null
  try {
    const { data } = await admin
      .from('customers')
      .select('*')
      .eq('id', params.id)
      .single()
    customer = data
  } catch {
    // fallback to null
  }

  if (!customer) notFound()

  // Fetch activities from activity_log
  let activities: any[] = []
  try {
    const { data } = await admin
      .from('activity_log')
      .select('*')
      .eq('customer_id', params.id)
      .order('created_at', { ascending: false })
      .limit(100)
    activities = data || []
  } catch {
    activities = []
  }

  // Fetch jobs (projects where customer_id = id)
  let jobs: any[] = []
  try {
    const { data } = await admin
      .from('projects')
      .select('id, title, vehicle_desc, status, pipe_stage, revenue, created_at, updated_at, type, priority')
      .eq('customer_id', params.id)
      .order('created_at', { ascending: false })
    jobs = data || []
  } catch {
    jobs = []
  }

  // Fetch estimates
  let estimates: any[] = []
  try {
    const { data } = await admin
      .from('estimates')
      .select('*')
      .eq('customer_id', params.id)
      .order('created_at', { ascending: false })
    estimates = data || []
  } catch {
    estimates = []
  }

  // Fetch invoices
  let invoices: any[] = []
  try {
    const { data } = await admin
      .from('invoices')
      .select('*')
      .eq('customer_id', params.id)
      .order('created_at', { ascending: false })
    invoices = data || []
  } catch {
    invoices = []
  }

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <div className="hidden md:flex">
        <Sidebar profile={profile as Profile} />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar profile={profile as Profile} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          <ContactDetailClient
            profile={profile as Profile}
            contact={customer}
            activities={activities}
            jobs={jobs}
            estimates={estimates}
            invoices={invoices}
          />
        </main>
      </div>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
