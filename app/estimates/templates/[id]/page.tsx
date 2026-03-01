import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import type { Profile } from '@/types'
import EstimateTemplateDetailClient from '@/components/estimates/EstimateTemplateDetailClient'

export default async function EstimateTemplateDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id || ORG_ID
  const isNew = params.id === 'new'

  let template: any = null

  if (!isNew) {
    try {
      const { data, error } = await admin
        .from('estimate_templates')
        .select('*')
        .eq('id', params.id)
        .eq('org_id', orgId)
        .single()

      if (error) throw error
      template = data
    } catch (err) {
      console.error('[estimate-template detail] fetch error:', err)
    }
  }

  return (
    <EstimateTemplateDetailClient
      profile={profile as Profile}
      template={template}
      isNew={isNew}
    />
  )
}
