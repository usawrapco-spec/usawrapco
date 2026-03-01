import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import type { Profile } from '@/types'
import EstimateTemplatesClient from '@/components/estimates/EstimateTemplatesClient'

export default async function EstimateTemplatesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const orgId = profile.org_id || ORG_ID

  let templates: any[] = []
  try {
    const { data, error } = await admin
      .from('estimate_templates')
      .select('id, name, description, category, use_count, created_at, updated_at, line_items')
      .eq('org_id', orgId)
      .order('use_count', { ascending: false })
      .limit(200)

    if (error) throw error
    templates = data || []
  } catch (err) {
    console.error('[estimate-templates] fetch error:', err)
  }

  return (
    <EstimateTemplatesClient
      profile={profile as Profile}
      initialTemplates={templates}
    />
  )
}
