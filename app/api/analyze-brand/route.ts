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

    const body = await req.json()
    const {
      companyName, url, tagline, colors, services, aboutText, phone, email, socialLinks,
      logoUrl, brandFiles, brief, projectId
    } = body

    const result = await runPipeline('brand_analysis', {
      companyName, url, tagline, colors, services, aboutText, phone, email, socialLinks,
      logoUrl, brandFiles, brief
    }, {
      orgId: profile.org_id,
      userId: user.id,
      projectId: projectId || undefined,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.result?.error || 'Analysis failed' }, { status: 500 })
    }

    return NextResponse.json({
      analysis: result.result.analysis || {},
      success: true,
      model: result.model,
      cost: result.cost,
      latencyMs: result.latencyMs,
    })
  } catch (err: any) {
    console.error('analyze-brand error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
