import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ConfiguratorClient from './ConfiguratorClient'
import { TopNav } from '@/components/layout/TopNav'

export const metadata = { title: '3D Wrap Configurator — WrapShop Pro' }

export default async function ConfiguratorPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: materials } = await supabase
    .from('wrap_materials')
    .select('*')
    .eq('enabled', true)
    .order('brand')
    .order('sort_order')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
      <TopNav profile={profile} />
      <ConfiguratorClient profile={profile} materials={materials ?? []} />
    </div>
  )
}
