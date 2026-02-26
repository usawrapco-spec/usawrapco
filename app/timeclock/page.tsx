import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import TimeclockClient from '@/components/payroll/TimeclockClient'
import EnhancedTimeclockClient from '@/components/payroll/EnhancedTimeclockClient'
import type { Profile } from '@/types'

export default async function TimeclockPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  // Fetch today's time entries (legacy table)
  const today = new Date().toISOString().split('T')[0]
  const { data: todayEntries } = await admin
    .from('time_entries')
    .select('*')
    .eq('employee_id', user.id)
    .gte('clock_in', today + 'T00:00:00')
    .order('clock_in', { ascending: false })

  // Fetch this week's entries for timesheet (legacy)
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1) // Monday
  const weekStartStr = weekStart.toISOString().split('T')[0]
  const { data: weekEntries } = await admin
    .from('time_entries')
    .select('*')
    .eq('employee_id', user.id)
    .gte('clock_in', weekStartStr + 'T00:00:00')
    .order('clock_in', { ascending: true })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 80 }}>
        <EnhancedTimeclockClient
          profile={profile as Profile}
          todayEntries={todayEntries || []}
          weekEntries={weekEntries || []}
        />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
