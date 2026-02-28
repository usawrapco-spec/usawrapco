import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { ORG_ID } from '@/lib/org'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; proofId: string } }
) {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('job_proof_messages')
    .select('*')
    .eq('proof_id', params.proofId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ messages: data || [] })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; proofId: string } }
) {
  const admin = getSupabaseAdmin()
  const body = await req.json()

  const { data, error } = await admin
    .from('job_proof_messages')
    .insert({
      proof_id: params.proofId,
      project_id: params.id,
      org_id: body.org_id || ORG_ID,
      sender_id: body.sender_id || null,
      sender_type: body.sender_type || 'internal',
      sender_name: body.sender_name || 'Team',
      content: body.content,
      attachments: body.attachments || [],
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ message: data })
}
