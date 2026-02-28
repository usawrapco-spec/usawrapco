import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { ORG_ID } from '@/lib/org'

export async function GET(req: NextRequest) {
  const admin = getSupabaseAdmin()
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const search = searchParams.get('search') || ''
  const filter = searchParams.get('filter') || 'all' // all, photos, pdfs, videos, proofs, mockups
  const orgId = searchParams.get('orgId') || ORG_ID
  const mode = searchParams.get('mode') || 'all' // 'job' | 'all' | 'customers'

  let query = admin
    .from('files')
    .select(`
      id, name, url, file_type, size, tags, created_at, project_id, org_id,
      project:project_id(id, title, customer:customer_id(id, name, company_name))
    `)
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(200)

  // Scope to current job only
  if (mode === 'job' && projectId) {
    query = query.eq('project_id', projectId)
  }

  // Text search
  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  // File type filter
  if (filter === 'photos') {
    query = query.or('file_type.ilike.image/%,name.ilike.%.jpg,name.ilike.%.jpeg,name.ilike.%.png,name.ilike.%.webp')
  } else if (filter === 'pdfs') {
    query = query.or('file_type.eq.application/pdf,name.ilike.%.pdf')
  } else if (filter === 'videos') {
    query = query.or('file_type.ilike.video/%,name.ilike.%.mp4,name.ilike.%.mov')
  } else if (filter === 'proofs') {
    query = query.containedBy('tags', ['proof'])
  } else if (filter === 'mockups') {
    query = query.containedBy('tags', ['mockup'])
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ files: data || [] })
}
