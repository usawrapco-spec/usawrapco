import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { token, customerId, orgId, senderName, body } = await req.json()

    if (!token || !customerId || !body?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Validate customer token
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('portal_token', token)
      .single()

    if (!customer || customer.id !== customerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get a project for this customer (for the required project_id FK)
    const { data: project } = await supabase
      .from('projects')
      .select('id, portal_token')
      .eq('customer_id', customerId)
      .limit(1)
      .maybeSingle()

    // Insert the message
    const { data: message, error } = await supabase
      .from('portal_messages')
      .insert({
        org_id: orgId,
        project_id: project?.id || null,
        portal_token: project?.portal_token || token,
        customer_id: customerId,
        sender_name: senderName || 'Customer',
        body: body.trim(),
        direction: 'customer',
      })
      .select('id, sender_name, body, direction, created_at, project_id, customer_id')
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    return NextResponse.json({ message })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
