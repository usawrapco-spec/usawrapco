import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    designProjectId,
    title,
    clientName,
    slides,
    timerSeconds = 4,
    password,
    expiresInDays,
    branding = {},
  } = body

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) return NextResponse.json({ error: 'No org' }, { status: 400 })

  // Check if a presentation already exists for this design project
  if (designProjectId) {
    const { data: existing } = await supabase
      .from('design_presentations')
      .select('id, token')
      .eq('design_project_id', designProjectId)
      .eq('org_id', profile.org_id)
      .maybeSingle()

    if (existing) {
      // Update it
      const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 86400000).toISOString()
        : null

      const updates: Record<string, any> = {
        title,
        client_name: clientName,
        slides,
        timer_seconds: timerSeconds,
        branding,
        updated_at: new Date().toISOString(),
      }
      if (password !== undefined) updates.password = password || null
      if (expiresAt !== undefined) updates.expires_at = expiresAt

      await supabase
        .from('design_presentations')
        .update(updates)
        .eq('id', existing.id)

      return NextResponse.json({ token: existing.token, id: existing.id })
    }
  }

  // Create new
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 86400000).toISOString()
    : null

  const { data, error } = await supabase
    .from('design_presentations')
    .insert({
      org_id: profile.org_id,
      design_project_id: designProjectId || null,
      title,
      client_name: clientName,
      slides,
      timer_seconds: timerSeconds,
      password: password || null,
      expires_at: expiresAt,
      branding,
      created_by: user.id,
    })
    .select('id, token')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ token: data.token, id: data.id })
}
