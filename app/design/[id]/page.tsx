import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect, notFound } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import DesignCanvasClient from '@/components/design/DesignCanvasClient'

export default async function DesignCanvasPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = getSupabaseAdmin()

  const [profileRes, designRes] = await Promise.all([
    admin.from('profiles').select('*').eq('id', user.id).single(),
    admin.from('design_projects').select('*').eq('id', params.id).single(),
  ])

  if (!profileRes.data) redirect('/login')
  if (!designRes.data) notFound()

  // Load linked project separately to avoid FK join errors
  let linkedProject: any = null
  if (designRes.data.linked_project_id) {
    const { data } = await admin
      .from('projects')
      .select('id, title, vehicle_desc, form_data, revenue, profit')
      .eq('id', designRes.data.linked_project_id)
      .single()
    linkedProject = data || null
  }

  // Attach linked project to design object
  const designWithLinked = { ...designRes.data, linked_project: linkedProject }

  // Load linked job's images if available
  let jobImages: any[] = []
  if (designRes.data.linked_project_id) {
    const { data } = await admin
      .from('job_images')
      .select('id, public_url, file_name, mime_type')
      .eq('project_id', designRes.data.linked_project_id)
      .limit(20)
    jobImages = data || []
  }

  // Load design comments/history
  const { data: comments } = await admin
    .from('design_project_comments')
    .select('*, author:author_id(id, name)')
    .eq('design_project_id', params.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      <TopNav profile={profileRes.data as Profile} />
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <DesignCanvasClient
          profile={profileRes.data as Profile}
          design={designWithLinked}
          jobImages={jobImages}
          comments={comments || []}
        />
      </main>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
