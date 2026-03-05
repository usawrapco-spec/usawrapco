import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'

// Disable SSR — Fabric.js requires browser canvas
const DesignStudioInternal = dynamic(
  () => import('@/components/design/DesignStudioInternal'),
  { ssr: false, loading: () => (
    <div style={{ minHeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 14 }}>
      Loading Design Studio…
    </div>
  )}
)

export default async function DesignStudioPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: '0' }}>
      <DesignStudioInternal orgId={profile?.org_id || ''} />
    </main>
  )
}
