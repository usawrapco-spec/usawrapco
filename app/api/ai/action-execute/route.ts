import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { ORG_ID } from '@/lib/org'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getSupabaseAdmin()
    const { data: profile } = await admin
      .from('profiles')
      .select('role, org_id, name')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const orgId = profile.org_id || ORG_ID
    const { type, payload, recapId, itemId, entityType, entityIds, suggestionLabel } = await req.json()

    let result: any = { success: true }

    switch (type) {
      case 'update_status': {
        const { newStatus, tableName } = payload || {}
        if (!newStatus || !tableName || !entityIds?.length) {
          return NextResponse.json({ error: 'Missing newStatus, tableName, or entityIds' }, { status: 400 })
        }
        const allowedTables = ['estimates', 'invoices', 'projects', 'tasks']
        if (!allowedTables.includes(tableName)) {
          return NextResponse.json({ error: 'Invalid table' }, { status: 400 })
        }
        const { error: updateErr } = await admin
          .from(tableName)
          .update({ status: newStatus })
          .eq('org_id', orgId)
          .in('id', entityIds)
        if (updateErr) throw updateErr
        result = { success: true, updated: entityIds.length, newStatus }
        break
      }

      case 'create_task': {
        const { taskTitle, dueInDays, assignedTo } = payload || {}
        if (!taskTitle) {
          return NextResponse.json({ error: 'Missing taskTitle' }, { status: 400 })
        }
        const dueAt = dueInDays
          ? new Date(Date.now() + dueInDays * 24 * 60 * 60 * 1000).toISOString()
          : null
        const { data: task, error: taskErr } = await admin
          .from('tasks')
          .insert({
            org_id: orgId,
            title: taskTitle,
            status: 'open',
            due_at: dueAt,
            assigned_to: assignedTo || user.id,
            created_by: user.id,
          })
          .select('id, title')
          .single()
        if (taskErr) throw taskErr
        result = { success: true, task }
        break
      }

      case 'send_message': {
        const { draft, recipientName, recipientPhone, recipientEmail } = payload || {}
        if (!draft) {
          return NextResponse.json({ error: 'Missing draft message' }, { status: 400 })
        }
        // Store as a pending draft — the owner can review and send from comms
        // For now we log it as a prepared action
        result = {
          success: true,
          action: 'draft_prepared',
          draft,
          recipientName,
          recipientPhone,
          recipientEmail,
          message: 'Draft prepared. Navigate to Communications to send.',
        }
        break
      }

      case 'log_view': {
        // Just log that the user viewed the detail page
        result = { success: true }
        break
      }

      case 'log_dismiss': {
        // Just log that the user dismissed a suggestion
        result = { success: true }
        break
      }

      default:
        return NextResponse.json({ error: `Unknown action type: ${type}` }, { status: 400 })
    }

    // Log feedback
    const feedbackTypeMap: Record<string, string> = {
      log_view: 'viewed',
      log_dismiss: 'suggestion_dismissed',
      update_status: 'suggestion_accepted',
      create_task: 'suggestion_accepted',
      send_message: 'suggestion_accepted',
    }
    await admin.from('action_item_feedback').insert({
      org_id: orgId,
      user_id: user.id,
      recap_id: recapId,
      action_item_id: itemId,
      entity_type: entityType,
      entity_ids: entityIds,
      feedback_type: feedbackTypeMap[type] || 'suggestion_accepted',
      suggestion_label: suggestionLabel,
      suggestion_type: type,
    })

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[ai/action-execute] error:', err)
    return NextResponse.json({ error: err.message || 'Execution failed' }, { status: 500 })
  }
}
