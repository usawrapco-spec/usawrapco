import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import type { Profile, Invoice } from '@/types'
import InvoicesClient from '@/components/invoices/InvoicesClient'

export default async function InvoicesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id || ORG_ID
  let invoices: Invoice[] = []
  try {
    const { data, error } = await admin
      .from('invoices')
      .select(`*, customer:customer_id(id, name, email), sales_order:so_id(id, so_number)`)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) throw error
    invoices = (data as Invoice[]) || []
  } catch (err) {
    console.error('[invoices] fetch error:', err)
  }

  return <InvoicesClient profile={profile as Profile} initialInvoices={invoices} />
}
