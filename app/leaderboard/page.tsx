import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Leaderboard from '@/components/leaderboard/Leaderboard'

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')
  return <div style={{ padding: 24 }}><Leaderboard profile={profile} /></div>
}
