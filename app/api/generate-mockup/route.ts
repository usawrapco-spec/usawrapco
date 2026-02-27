export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runPipeline } from '@/lib/services/ai-pipeline'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) {
      return NextResponse.json({ error: 'No org found' }, { status: 400 })
    }

    const body = await req.json()
    const { prompt, vehicle_type, style, colors, brief, projectId } = body

    const fullPrompt = prompt || `Professional photorealistic vehicle wrap design, ${vehicle_type || 'pickup truck'},
    ${brief || 'bold commercial wrap design'}, ${colors?.join(', ') || 'red and black'} color scheme,
    ${style || 'professional'} style, studio photography, commercial vinyl wrap,
    high resolution product photography, clean background, sharp details, 8k quality`

    const result = await runPipeline('concept_generation', { prompt: fullPrompt }, {
      orgId: profile.org_id,
      userId: user.id,
      projectId: projectId || undefined,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.result?.error || 'Generation failed' }, { status: 500 })
    }

    return NextResponse.json({
      images: result.result.images || [],
      status: 'succeeded',
      model: result.model,
      cost: result.cost,
      latencyMs: result.latencyMs,
    })
  } catch (err: any) {
    console.error('Mockup API exception:', err)
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 })
  }
}
