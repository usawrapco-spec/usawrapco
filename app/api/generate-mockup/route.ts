import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

async function getReplicateToken(req: NextRequest): Promise<string | null> {
  // 1. Try environment variable first
  if (process.env.REPLICATE_API_TOKEN) {
    return process.env.REPLICATE_API_TOKEN
  }

  // 2. Fall back to integrations table (set via Settings → Integrations UI)
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const admin = getSupabaseAdmin()
    const { data: profile } = await admin
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) return null

    const { data: integration } = await admin
      .from('integrations')
      .select('config')
      .eq('org_id', profile.org_id)
      .eq('integration_id', 'replicate')
      .eq('enabled', true)
      .single()

    if (integration?.config?.api_token) return integration.config.api_token

    // Third fallback: orgs.settings.integrations.replicate.api_token
    const { data: org } = await admin
      .from('orgs')
      .select('settings')
      .eq('id', profile.org_id)
      .single()

    return (org?.settings as any)?.integrations?.replicate?.api_token || null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { prompt, vehicle_type, style, colors, brief, designId } = body

  const replicateToken = await getReplicateToken(req)

  if (!replicateToken) {
    return NextResponse.json(
      { error: 'Replicate API token not configured. Add it in Settings → Integrations → Replicate.' },
      { status: 500 }
    )
  }

  // Build the full prompt
  const fullPrompt = `Professional photorealistic vehicle wrap design, ${vehicle_type || 'pickup truck'},
  ${brief || 'bold commercial wrap design'}, ${colors?.join(', ') || 'red and black'} color scheme,
  ${style || 'professional'} style, studio photography, commercial vinyl wrap,
  high resolution product photography, clean background, sharp details, 8k quality`

  try {
    const startRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${replicateToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait=30',
      },
      body: JSON.stringify({
        input: {
          prompt: fullPrompt,
          num_outputs: 4,
          aspect_ratio: '16:9',
          output_format: 'webp',
          output_quality: 90,
        },
      }),
    })

    const prediction = await startRes.json()

    if (prediction.error) {
      return NextResponse.json({ error: prediction.error }, { status: 500 })
    }

    // Poll if still processing
    if (prediction.status !== 'succeeded') {
      let result = prediction
      let attempts = 0
      while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < 30) {
        await new Promise(r => setTimeout(r, 2000))
        const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
          headers: { 'Authorization': `Bearer ${replicateToken}` },
        })
        result = await pollRes.json()
        attempts++
      }
      return NextResponse.json({ images: result.output || [], status: result.status })
    }

    return NextResponse.json({ images: prediction.output || [], status: 'succeeded' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
