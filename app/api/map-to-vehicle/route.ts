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
    const { designImageUrl, vehiclePhotoUrl, prompt, projectId } = body

    if (!designImageUrl || !vehiclePhotoUrl) {
      return NextResponse.json(
        { error: 'Both designImageUrl and vehiclePhotoUrl are required' },
        { status: 400 }
      )
    }

    // Step 1: Extract depth map from vehicle photo
    const depthResult = await runPipeline('depth_estimation', { imageUrl: vehiclePhotoUrl }, {
      orgId: profile.org_id,
      userId: user.id,
      projectId: projectId || undefined,
    })

    if (!depthResult.success) {
      return NextResponse.json(
        { error: depthResult.result?.error || 'Depth extraction failed' },
        { status: 500 }
      )
    }

    const depthMapUrl = depthResult.result.depthMapUrl

    // Step 2: Apply design to vehicle using ControlNet depth conditioning
    const controlnetResult = await runPipeline('controlnet_generation', {
      prompt: prompt || 'Professional vehicle wrap design applied to real vehicle, photorealistic',
      designImageUrl,
      depthMapUrl,
      vehiclePhotoUrl,
    }, {
      orgId: profile.org_id,
      userId: user.id,
      projectId: projectId || undefined,
    })

    if (!controlnetResult.success) {
      return NextResponse.json(
        { error: controlnetResult.result?.error || 'ControlNet generation failed' },
        { status: 500 }
      )
    }

    const totalCost = depthResult.cost + controlnetResult.cost
    const totalLatency = depthResult.latencyMs + controlnetResult.latencyMs

    return NextResponse.json({
      mappedImage: controlnetResult.result.images?.[0] || controlnetResult.result.imageUrl,
      depthMapUrl,
      models: {
        depth: depthResult.model,
        controlnet: controlnetResult.model,
      },
      cost: totalCost,
      latencyMs: totalLatency,
      success: true,
    })
  } catch (err: any) {
    console.error('map-to-vehicle error:', err)
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 })
  }
}
