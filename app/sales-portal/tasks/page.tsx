import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import DailyTaskList from '@/components/sales-portal/DailyTaskList'

export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles')
    .select('role, org_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['sales_agent', 'admin', 'owner'].includes(profile.role))
    redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  const { data: tasks } = await admin
    .from('agent_daily_tasks')
    .select('*')
    .eq('agent_id', user.id)
    .eq('task_date', today)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })

  return <DailyTaskList initialTasks={tasks || []} date={today} />
}
