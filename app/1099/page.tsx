import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import type { Profile } from '@/types'
import { isAdminRole } from '@/types'
import TaxCalculatorPageClient from '@/components/financial/TaxCalculatorPage'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export default async function TaxCalcPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <Sidebar profile={profile as Profile} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar profile={profile as Profile} />
        <main className="flex-1 overflow-y-auto p-6">
          <TaxCalculatorPageClient profile={profile as Profile} />
        </main>
      </div>
    </div>
  )
}
