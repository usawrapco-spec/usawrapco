import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { ORG_ID } from '@/lib/org'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = getSupabaseAdmin()
  const jobId = params.id

  // Fetch connections where this job is either job_a or job_b
  const { data: asA } = await admin
    .from('job_connections')
    .select(`
      id, connection_type, notes, created_at, job_a, job_b,
      connected:job_b(id, title, pipe_stage, vehicle_desc,
        customer:customer_id(name, company_name))
    `)
    .eq('job_a', jobId)

  const { data: asB } = await admin
    .from('job_connections')
    .select(`
      id, connection_type, notes, created_at, job_a, job_b,
      connected:job_a(id, title, pipe_stage, vehicle_desc,
        customer:customer_id(name, company_name))
    `)
    .eq('job_b', jobId)

  const connections = [
    ...(asA || []).map(c => ({ ...c, direction: 'a' as const })),
    ...(asB || []).map(c => ({ ...c, direction: 'b' as const })),
  ]

  return NextResponse.json({ connections })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = getSupabaseAdmin()
  const body = await req.json()
  const { targetJobId, connectionType, notes } = body

  if (!targetJobId) {
    return NextResponse.json({ error: 'targetJobId required' }, { status: 400 })
  }

  // Ensure job_a < job_b to respect UNIQUE constraint (prevent duplicates both ways)
  const [jobA, jobB] = params.id < targetJobId
    ? [params.id, targetJobId]
    : [targetJobId, params.id]

  const { data, error } = await admin
    .from('job_connections')
    .upsert({
      org_id: body.org_id || ORG_ID,
      job_a: jobA,
      job_b: jobB,
      connection_type: connectionType || 'fleet_package',
      notes: notes || null,
    }, { onConflict: 'job_a,job_b' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ connection: data })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = getSupabaseAdmin()
  const { searchParams } = new URL(req.url)
  const connectionId = searchParams.get('connectionId')

  if (!connectionId) {
    return NextResponse.json({ error: 'connectionId required' }, { status: 400 })
  }

  const { error } = await admin
    .from('job_connections')
    .delete()
    .eq('id', connectionId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
