import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import ProductionBriefClient from '@/components/production/ProductionBriefClient'

export default async function ProductionBriefPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: project } = await admin
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!project) redirect('/pipeline')

  return <ProductionBriefClient project={project} profile={profile} />
}
