import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { ORG_ID } from '@/lib/org'

export async function GET(
  req: NextRequest,
  { params }: { params: { recapId: string; itemId: string } }
) {
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

    if (!profile || profile.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const orgId = profile.org_id || ORG_ID
    const { recapId, itemId } = params

    // Fetch the recap
    const { data: recap } = await admin
      .from('ai_recaps')
      .select('id, action_items, sections, generated_at')
      .eq('id', recapId)
      .eq('org_id', orgId)
      .single()

    if (!recap) {
      return NextResponse.json({ error: 'Recap not found' }, { status: 404 })
    }

    // Find the specific action item
    const actionItems = (recap.action_items || []) as any[]
    const actionItem = actionItems.find((a: any) => a.id === itemId)
    if (!actionItem) {
      return NextResponse.json({ error: 'Action item not found' }, { status: 404 })
    }

    // Fetch referenced entities based on entity_type
    let entities: any[] = []
    const entityType = actionItem.entity_type
    const entityIds = actionItem.entity_ids || []

    if (entityType && entityIds.length > 0) {
      switch (entityType) {
        case 'estimate':
          const { data: estimates } = await admin
            .from('estimates')
            .select('id, title, status, total, created_at, customer:customer_id(id, name, email, phone)')
            .eq('org_id', orgId)
            .in('id', entityIds)
          entities = estimates || []
          break

        case 'invoice':
          const { data: invoices } = await admin
            .from('invoices')
            .select('id, invoice_number, status, total, due_date, created_at, customer:customer_id(id, name, email, phone)')
            .eq('org_id', orgId)
            .in('id', entityIds)
          entities = invoices || []
          break

        case 'project':
          const { data: projects } = await admin
            .from('projects')
            .select('id, title, status, pipe_stage, revenue, install_date, updated_at, agent:agent_id(name), installer:installer_id(name)')
            .eq('org_id', orgId)
            .in('id', entityIds)
          entities = projects || []
          break

        case 'customer':
          const { data: customers } = await admin
            .from('customers')
            .select('id, name, email, phone, created_at')
            .eq('org_id', orgId)
            .in('id', entityIds)
          entities = customers || []
          break

        case 'task':
          const { data: tasks } = await admin
            .from('tasks')
            .select('id, title, status, due_at, assigned_to, created_at')
            .eq('org_id', orgId)
            .in('id', entityIds)
          entities = tasks || []
          break

        case 'call':
          const { data: calls } = await admin
            .from('call_logs')
            .select('id, direction, status, duration_seconds, caller_number, caller_name, created_at, notes')
            .eq('org_id', orgId)
            .in('id', entityIds)
          entities = calls || []
          break

        case 'message':
          const { data: messages } = await admin
            .from('conversation_messages')
            .select('id, body, direction, created_at, conversation_id')
            .in('id', entityIds)
          entities = messages || []
          break
      }
    }

    // Fetch existing chat session
    const { data: session } = await admin
      .from('action_item_sessions')
      .select('id, messages')
      .eq('org_id', orgId)
      .eq('recap_id', recapId)
      .eq('action_item_id', itemId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({
      actionItem,
      entities,
      entityType,
      session,
      recapId,
      generatedAt: recap.generated_at,
    })
  } catch (err: any) {
    console.error('[ai/action-items] error:', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch action item' }, { status: 500 })
  }
}
