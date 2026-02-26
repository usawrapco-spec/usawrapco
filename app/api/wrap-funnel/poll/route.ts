import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

async function getReplicateToken(): Promise<string | null> {
  if (process.env.REPLICATE_API_TOKEN) return process.env.REPLICATE_API_TOKEN
  try {
    const admin = getSupabaseAdmin()
    const { data } = await admin
      .from('integrations')
      .select('config')
      .eq('org_id', ORG_ID)
      .eq('integration_id', 'replicate')
      .eq('enabled', true)
      .single()
    return data?.config?.api_token || null
  } catch { return null }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const ids = searchParams.get('ids')
  const sessionToken = searchParams.get('session_token')

  if (!ids) return NextResponse.json({ error: 'ids required' }, { status: 400 })

  const replicateToken = await getReplicateToken()
  if (!replicateToken) return NextResponse.json({ error: 'Not configured' }, { status: 503 })

  const predictionIds = ids.split(',').filter(Boolean)

  const results = await Promise.all(
    predictionIds.map(async (id) => {
      try {
        const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
          headers: { Authorization: `Bearer ${replicateToken}` },
        })
        if (!res.ok) return { id, status: 'processing', imageUrl: null }
        const p = await res.json()
        const imageUrl = Array.isArray(p.output) ? p.output[0] : (p.output ?? null)

        // If done, store in Supabase so URL doesn't expire
        let finalUrl = imageUrl
        if (p.status === 'succeeded' && imageUrl) {
          try {
            const imgRes = await fetch(imageUrl)
            if (imgRes.ok) {
              const buffer = await imgRes.arrayBuffer()
              const admin = getSupabaseAdmin()
              const fileName = `wrap-funnel-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
              const path = `wrap-funnel/${fileName}`
              const { error } = await admin.storage
                .from('project-files')
                .upload(path, Buffer.from(buffer), { contentType: 'image/jpeg', upsert: false })
              if (!error) {
                const { data: { publicUrl } } = admin.storage.from('project-files').getPublicUrl(path)
                finalUrl = publicUrl
              }
            }
          } catch { /* keep original */ }
        }

        return { id, status: p.status, imageUrl: finalUrl }
      } catch {
        return { id, status: 'processing', imageUrl: null }
      }
    })
  )

  const allDone = results.every(r => r.status === 'succeeded' || r.status === 'failed')
  const completedUrls = results.filter(r => r.imageUrl && r.status === 'succeeded').map(r => r.imageUrl)

  // Persist completed URLs to session
  if (allDone && sessionToken && completedUrls.length > 0) {
    try {
      const admin = getSupabaseAdmin()
      await admin.from('wrap_funnel_sessions')
        .update({ mockup_urls: completedUrls, updated_at: new Date().toISOString() })
        .eq('session_token', sessionToken)
    } catch { /* non-fatal */ }
  }

  return NextResponse.json({ results, allDone, completedUrls })
}
