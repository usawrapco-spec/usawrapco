import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const designProjectId = req.nextUrl.searchParams.get('design_project_id')
  if (!designProjectId) return NextResponse.json({ error: 'design_project_id required' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('design_voice_notes')
    .select('*, created_by_profile:created_by(name)')
    .eq('design_project_id', designProjectId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ voiceNotes: data || [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const audio = formData.get('audio') as File | null
  const design_project_id = formData.get('design_project_id') as string
  const layer = (formData.get('layer') as string) || 'designer'
  const pin_id = formData.get('pin_id') as string | null
  const duration = parseInt((formData.get('duration') as string) || '0', 10)

  if (!audio || !design_project_id) {
    return NextResponse.json({ error: 'Missing audio or design_project_id' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  // Upload audio to Supabase storage
  const path = `voice-notes/${design_project_id}/${Date.now()}_note.webm`
  const arrayBuffer = await audio.arrayBuffer()
  const { data: uploadData, error: uploadError } = await admin.storage
    .from('project-files')
    .upload(path, arrayBuffer, { contentType: 'audio/webm', upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage.from('project-files').getPublicUrl(path)

  // Save to DB
  const { data, error } = await admin
    .from('design_voice_notes')
    .insert({
      design_project_id,
      pin_id: pin_id || null,
      layer,
      audio_url: publicUrl,
      duration_seconds: duration || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Trigger async transcription via Replicate Whisper (fire and forget)
  const replicateToken = process.env.REPLICATE_API_TOKEN
  if (replicateToken && publicUrl) {
    fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: { Authorization: `Token ${replicateToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: 'e39e354773466b955265e969568deb7da217804d8e771ea8c9cd0cef6591f8bc',
        input: { audio: publicUrl, model: 'large-v2', language: 'en', transcription: 'plain text' },
        webhook: null,
      }),
    }).then(async r => {
      if (!r.ok) return
      const pred = await r.json()
      // Poll for result (non-blocking, runs server-side)
      let attempts = 0
      const poll = async () => {
        if (attempts++ > 20) return
        await new Promise(res => setTimeout(res, 3000))
        const statusRes = await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, {
          headers: { Authorization: `Token ${replicateToken}` },
        })
        if (!statusRes.ok) return
        const status = await statusRes.json()
        if (status.status === 'succeeded' && status.output?.transcription) {
          await admin.from('design_voice_notes').update({
            transcript: status.output.transcription,
            replicate_job_id: pred.id,
          }).eq('id', data.id)
        } else if (status.status === 'processing' || status.status === 'starting') {
          poll()
        }
      }
      poll()
    }).catch((error) => { console.error(error); })
  }

  return NextResponse.json({ voiceNote: data })
}
