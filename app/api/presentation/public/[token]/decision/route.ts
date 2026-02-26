import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  { params }: { params: { token: string } }
) {
  const supabase = await createClient()
  const { token } = params

  const { sessionId, decision, feedback, timeSpentSeconds, slidesViewed } = await req.json()

  // Look up presentation
  const { data: pres } = await supabase
    .from('design_presentations')
    .select('id')
    .eq('token', token)
    .single()

  if (!pres) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const userAgent = req.headers.get('user-agent') || ''
  const forwarded = req.headers.get('x-forwarded-for')
  const ipAddress = forwarded ? forwarded.split(',')[0].trim() : ''

  // Upsert view record
  const { data: existing } = await supabase
    .from('presentation_views')
    .select('id')
    .eq('presentation_id', pres.id)
    .eq('session_id', sessionId || '')
    .maybeSingle()

  if (existing) {
    await supabase
      .from('presentation_views')
      .update({
        ended_at: new Date().toISOString(),
        time_spent_seconds: timeSpentSeconds,
        slides_viewed: slidesViewed || [],
        decision,
        feedback: feedback || null,
      })
      .eq('id', existing.id)
  } else {
    await supabase.from('presentation_views').insert({
      presentation_id: pres.id,
      session_id: sessionId || crypto.randomUUID(),
      started_at: new Date(Date.now() - (timeSpentSeconds || 0) * 1000).toISOString(),
      ended_at: new Date().toISOString(),
      time_spent_seconds: timeSpentSeconds,
      slides_viewed: slidesViewed || [],
      decision,
      feedback: feedback || null,
      ip_address: ipAddress,
      user_agent: userAgent,
    })
  }

  return NextResponse.json({ ok: true })
}

// Also handle start-of-session tracking
export async function PUT(
  req: Request,
  { params }: { params: { token: string } }
) {
  const supabase = await createClient()
  const { token } = params

  const { sessionId } = await req.json()

  const { data: pres } = await supabase
    .from('design_presentations')
    .select('id')
    .eq('token', token)
    .single()

  if (!pres) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const userAgent = req.headers.get('user-agent') || ''
  const forwarded = req.headers.get('x-forwarded-for')
  const ipAddress = forwarded ? forwarded.split(',')[0].trim() : ''

  await supabase.from('presentation_views').insert({
    presentation_id: pres.id,
    session_id: sessionId,
    ip_address: ipAddress,
    user_agent: userAgent,
  })

  return NextResponse.json({ ok: true })
}
