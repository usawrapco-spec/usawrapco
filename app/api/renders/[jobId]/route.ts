import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

// ─── GET: List all renders for a job ────────────────────────────────────────
export async function GET(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getSupabaseAdmin()
    const { data: renders, error } = await admin
      .from('job_renders')
      .select('*')
      .eq('project_id', params.jobId)
      .order('created_at', { ascending: false })

    if (error) return Response.json({ error: error.message }, { status: 500 })

    // Also return render count and settings
    const { data: settings } = await admin
      .from('render_settings')
      .select('max_renders_per_job, watermark_text, watermark_enabled')
      .eq('org_id', ORG_ID)
      .single()

    return Response.json({
      renders: renders || [],
      count: renders?.length || 0,
      settings: settings || { max_renders_per_job: 20, watermark_enabled: true, watermark_text: 'UNCONFIRMED — USA WRAP CO' },
    })
  } catch (err) {
    console.error('[renders/jobId] GET error:', err)
    return Response.json({ error: 'Failed to load renders' }, { status: 500 })
  }
}

// ─── DELETE: Delete a specific render ───────────────────────────────────────
export async function DELETE(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const renderId = searchParams.get('renderId')
    if (!renderId) return Response.json({ error: 'renderId required' }, { status: 400 })

    const admin = getSupabaseAdmin()
    const { error } = await admin
      .from('job_renders')
      .delete()
      .eq('id', renderId)
      .eq('project_id', params.jobId)

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true })
  } catch (err) {
    console.error('[renders/jobId] DELETE error:', err)
    return Response.json({ error: 'Failed to delete render' }, { status: 500 })
  }
}

// ─── PATCH: Update render (watermark, notes, etc.) ──────────────────────────
export async function PATCH(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { renderId, ...updates } = await req.json()
    if (!renderId) return Response.json({ error: 'renderId required' }, { status: 400 })

    const allowed = ['notes', 'watermarked', 'watermark_url']
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([k]) => allowed.includes(k))
    )

    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('job_renders')
      .update({ ...filtered, updated_at: new Date().toISOString() })
      .eq('id', renderId)
      .eq('project_id', params.jobId)
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ render: data })
  } catch (err) {
    console.error('[renders/jobId] PATCH error:', err)
    return Response.json({ error: 'Failed to update render' }, { status: 500 })
  }
}
