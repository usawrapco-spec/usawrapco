export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runPipeline } from '@/lib/services/ai-pipeline'

export const maxDuration = 120

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
    const { imageUrl, designId, targetWidth, targetHeight, saveToProject } = body

    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 })
    }

    const context = {
      orgId: profile.org_id,
      userId: user.id,
      projectId: designId || undefined,
    }

    // Step 1: Upscale image for print quality
    const upscaleResult = await runPipeline('upscaling', {
      imageUrl,
      targetWidth: targetWidth || 8192,
      targetHeight: targetHeight || 8192,
      scaleFactor: 4,
    }, context)

    if (!upscaleResult.success) {
      return NextResponse.json(
        { error: upscaleResult.result?.error || 'Upscaling failed' },
        { status: 500 }
      )
    }

    const upscaledImageUrl = upscaleResult.result.imageUrl

    // Step 2: Vectorize for scalable print output
    const vectorizeResult = await runPipeline('vectorization', {
      imageUrl: upscaledImageUrl,
      outputFormat: 'svg',
      colorMode: 'full-color',
      detail: 'high',
    }, context)

    if (!vectorizeResult.success) {
      return NextResponse.json(
        { error: vectorizeResult.result?.error || 'Vectorization failed' },
        { status: 500 }
      )
    }

    const vectorFileUrl = vectorizeResult.result.svgUrl || vectorizeResult.result.fileUrl

    // Step 3: Save to design_project_files if designId provided
    if (saveToProject && designId) {
      const { error: saveError } = await supabase.from('design_project_files').insert({
        design_project_id: designId,
        file_name: `print-ready-${Date.now()}.svg`,
        file_url: vectorFileUrl,
        file_type: 'vector',
        uploaded_by: user.id,
      })

      if (saveError) {
        console.error('Failed to save print file to design project:', saveError)
      }
    }

    const totalCost = upscaleResult.cost + vectorizeResult.cost
    const totalLatency = upscaleResult.latencyMs + vectorizeResult.latencyMs

    return NextResponse.json({
      success: true,
      upscaledImageUrl,
      vectorFileUrl,
      printReady: true,
      models: {
        upscale: upscaleResult.model,
        vectorize: vectorizeResult.model,
      },
      cost: totalCost,
      latencyMs: totalLatency,
      saved: saveToProject && designId,
    })
  } catch (err: any) {
    console.error('prepare-for-print error:', err)
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 })
  }
}
