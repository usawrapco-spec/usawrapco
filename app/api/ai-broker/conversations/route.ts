import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 })

  const url = new URL(req.url)
  const status = url.searchParams.get('status') // active, escalated, closed, all
  const conversationId = url.searchParams.get('id')

  // Single conversation with messages
  if (conversationId) {
    const { data: convo } = await admin.from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('org_id', profile.org_id)
      .single()

    if (!convo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: messages } = await admin.from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(200)

    // Load customer
    let customer = null
    if (convo.customer_id) {
      const { data: c } = await admin.from('customers')
        .select('id, name, email, phone, company_name, status')
        .eq('id', convo.customer_id).single()
      customer = c
    }

    return NextResponse.json({ conversation: { ...convo, customer, messages: messages || [] } })
  }

  // List conversations
  let query = admin.from('conversations')
    .select('*')
    .eq('org_id', profile.org_id)
    .order('updated_at', { ascending: false })
    .limit(100)

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: conversations } = await query

  // Load last message for each + customer info
  const enriched = await Promise.all((conversations || []).map(async (convo: any) => {
    const { data: lastMsg } = await admin.from('messages')
      .select('*')
      .eq('conversation_id', convo.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const { data: msgCount } = await admin.from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', convo.id)

    let customer = null
    if (convo.customer_id) {
      const { data: c } = await admin.from('customers')
        .select('id, name, email, phone, company_name, status')
        .eq('id', convo.customer_id).single()
      customer = c
    }

    return {
      ...convo,
      customer,
      last_message: lastMsg,
      message_count: msgCount || 0,
    }
  }))

  return NextResponse.json({ conversations: enriched })
}
