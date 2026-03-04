import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AITrainingClient from '@/components/dashboard/AITrainingClient'

export default async function AITrainingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <AITrainingClient />
}
