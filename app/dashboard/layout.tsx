import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { normalizeProfile } from '@/lib/supabase/profile'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let { data: raw } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!raw) {
    const { data: created } = await supabase.from('profiles').insert({
      id:          user.id,
      org_id:      ORG_ID,
      role:        'admin',
      name:        user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      email:       user.email || '',
      phone:       null,
      active:      true,
      permissions: {},
    }).select().single()
    raw = created
  }

  if (!raw) redirect('/login')
  const profile = normalizeProfile(raw)

  const { data: teammates } = await supabase
    .from('profiles')
    .select('id, name, full_name, role, email')
    .eq('org_id', profile.org_id)
    .eq('active', true)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar profile={profile} teammates={teammates || []} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar profile={profile} />
        <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
