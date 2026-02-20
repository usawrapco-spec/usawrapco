import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Timeline from '@/components/timeline/Timeline'

export default async function TimelinePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')
  return <div style={{ padding: 24 }}><Timeline profile={profile} /></div>
}
