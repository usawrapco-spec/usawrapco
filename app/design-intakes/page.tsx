import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DesignIntakesClient from '@/components/design-intake/DesignIntakesAdmin'

export default async function DesignIntakesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return <DesignIntakesClient profile={profile} />
}
