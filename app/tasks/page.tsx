import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AutoTasks from '@/components/settings/AutoTasks'

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')
  return <div style={{ padding: 24 }}><AutoTasks profile={profile} /></div>
}
