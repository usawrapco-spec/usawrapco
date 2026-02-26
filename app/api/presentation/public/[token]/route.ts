import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const supabase = await createClient()
  const { token } = params

  const { data, error } = await supabase
    .from('design_presentations')
    .select('id, title, client_name, slides, timer_seconds, branding, expires_at, password, design_project_id')
    .eq('token', token)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Presentation not found' }, { status: 404 })
  }

  // Check expiry
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Presentation link has expired' }, { status: 410 })
  }

  return NextResponse.json({
    id: data.id,
    title: data.title,
    client_name: data.client_name,
    slides: data.slides,
    timer_seconds: data.timer_seconds,
    branding: data.branding,
    expires_at: data.expires_at,
    password_protected: !!data.password,
    password: data.password, // sent so client can check (token is already secret enough)
  })
}
