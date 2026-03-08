import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SalesPortalShell from '@/components/sales-portal/SalesPortalShell'

export const dynamic = 'force-dynamic'

export default async function SalesPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, email, phone, role, org_id, avatar_url, xp, level, badges')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Allow sales_agent, admin, owner roles
  const allowedRoles = ['sales_agent', 'admin', 'owner']
  if (!allowedRoles.includes(profile.role)) {
    redirect('/dashboard')
  }

  // Get unread message count
  const { count: unreadMessages } = await supabase
    .from('sales_agent_messages')
    .select('id', { count: 'exact', head: true })
    .eq('agent_id', profile.id)
    .eq('read_agent', false)

  // Get today's pending task count
  const today = new Date().toISOString().split('T')[0]
  const { count: pendingTasks } = await supabase
    .from('agent_daily_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('agent_id', profile.id)
    .eq('task_date', today)
    .eq('status', 'pending')

  const ctx = {
    profile: {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      role: profile.role,
      org_id: profile.org_id,
      avatar_url: profile.avatar_url,
      xp: profile.xp ?? 0,
      level: profile.level ?? 1,
    },
    unreadMessages: unreadMessages ?? 0,
    pendingTasks: pendingTasks ?? 0,
  }

  return <SalesPortalShell ctx={ctx}>{children}</SalesPortalShell>
}
