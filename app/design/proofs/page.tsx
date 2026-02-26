import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { DesignStudioLayout } from '@/components/design/DesignStudioLayout'
import { DesignProofs } from '@/components/design/DesignProofs'
import { Lock } from 'lucide-react'
import type { Profile } from '@/types'

export default async function DesignProofsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const hasAccess = ['owner', 'admin', 'designer', 'sales_agent', 'production'].includes(profile.role)
  if (!hasAccess) {
    return (
      <DesignStudioLayout profile={profile as Profile}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
          <Lock size={36} color="var(--text3)" />
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)' }}>Access Restricted</div>
        </div>
      </DesignStudioLayout>
    )
  }

  // Load design_proofs with project info
  const { data: proofs } = await admin
    .from('design_proofs')
    .select(`
      *,
      project:project_id(id, title, customer_name, form_data)
    `)
    .eq('org_id', ORG_ID)
    .order('sent_at', { ascending: false })

  // Load design_projects with proof_sent or revision status
  const { data: designProjects } = await admin
    .from('design_projects')
    .select(`
      id, title, client_name, status, vehicle_type, created_at, updated_at,
      portal_token, designer_id,
      designer:designer_id(id, name, avatar_url)
    `)
    .eq('org_id', ORG_ID)
    .in('status', ['proof_sent', 'revision'])
    .order('updated_at', { ascending: false })

  return (
    <DesignStudioLayout profile={profile as Profile}>
      <DesignProofs
        profile={profile as Profile}
        proofs={proofs ?? []}
        designProjects={(designProjects ?? []) as any}
      />
    </DesignStudioLayout>
  )
}
