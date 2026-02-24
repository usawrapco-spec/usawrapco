import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runPipeline } from '@/lib/services/ai-pipeline'

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

    const { imageUrl, projectId } = await req.json()
    if (!imageUrl) {
      return NextResponse.json({ error: 'No image URL' }, { status: 400 })
    }

    const result = await runPipeline('background_removal', { imageUrl }, {
      orgId: profile.org_id,
      userId: user.id,
      projectId: projectId || undefined,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.result?.error || 'Background removal failed' }, { status: 500 })
    }

    return NextResponse.json({
      imageUrl: result.result.imageUrl,
      model: result.model,
      cost: result.cost,
      latencyMs: result.latencyMs,
    })
  } catch (err: any) {
    console.error('remove-background error:', err)
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 })
  }
}
