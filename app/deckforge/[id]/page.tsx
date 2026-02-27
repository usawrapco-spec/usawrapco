import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import DeckForgeTool from '@/components/deckforge/DeckForgeTool'

export default async function DeckForgeToolPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project, error } = await getSupabaseAdmin()
    .from('deckforge_projects')
    .select('id, name, boat_name, status')
    .eq('id', params.id)
    .single()

  if (error || !project) notFound()

  // Full-screen tool — no TopNav, no SideNav, no MobileNav
  return (
    <DeckForgeTool
      projectId={project.id}
      projectName={project.name}
    />
  )
}
