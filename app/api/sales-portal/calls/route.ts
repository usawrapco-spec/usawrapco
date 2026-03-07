import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getSupabaseAdmin()
    const { data: profile } = await admin
      .from('profiles')
      .select('role, org_id')
      .eq('id', user.id)
      .single()

    if (!profile || !['sales_agent', 'admin', 'owner'].includes(profile.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const url = new URL(req.url)
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // Get calls made by this agent
    const { data: calls, error } = await admin
      .from('call_logs')
      .select('id, direction, status, caller_name, caller_number, duration_seconds, recording_url, notes, created_at, transcription_status, analysis_status')
      .eq('org_id', profile.org_id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    // Get analysis scores for these calls
    const callIds = (calls || []).map(c => c.id)
    let analyses: any[] = []
    if (callIds.length > 0) {
      const { data } = await admin
        .from('call_analyses')
        .select('call_log_id, score, sentiment, summary')
        .in('call_log_id', callIds)
      analyses = data || []
    }

    const analysisMap = new Map(analyses.map(a => [a.call_log_id, a]))

    const enriched = (calls || []).map(c => ({
      ...c,
      analysis: analysisMap.get(c.id) || null,
    }))

    return NextResponse.json({ calls: enriched })
  } catch (err: any) {
    console.error('[sales-portal/calls] error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
