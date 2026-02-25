import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PublicConfiguratorClient from './PublicConfiguratorClient'

export const metadata = { title: 'Configure Your Wrap' }

export default async function PublicConfiguratorPage({ params }: { params: { token: string } }) {
  const supabase = createClient()

  const { data: session } = await supabase
    .from('configurator_sessions')
    .select('*')
    .eq('public_token', params.token)
    .single()

  if (!session) notFound()

  const { data: materials } = await supabase
    .from('wrap_materials')
    .select('*')
    .eq('enabled', true)
    .order('brand')
    .order('sort_order')

  return <PublicConfiguratorClient session={session} materials={materials ?? []} />
}
