import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const channel = url.searchParams.get('channel') || 'agent_shop'

  const { data, error } = await supabase
    .from('sales_agent_messages')
    .select('*')
    .eq('referral_id', params.id)
    .eq('channel', channel)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mark as read
  await supabase
    .from('sales_agent_messages')
    .update({ read_agent: true })
    .eq('referral_id', params.id)
    .eq('channel', channel)
    .eq('read_agent', false)

  return NextResponse.json(data)
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, name')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const body = await req.json()

  const { data, error } = await supabase
    .from('sales_agent_messages')
    .insert({
      org_id: profile.org_id,
      referral_id: params.id,
      agent_id: user.id,
      channel: body.channel || 'agent_shop',
      sender_type: 'agent',
      sender_name: profile.name,
      body: body.body?.trim(),
      attachment_url: body.attachment_url || null,
      read_agent: true,
      read_shop: false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
