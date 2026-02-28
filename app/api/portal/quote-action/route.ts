import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  try {
    const { project_id, portal_token, action, customer_name, notes } = await req.json()

    if (!project_id || !portal_token || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (!['approved', 'changes_requested'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Verify the portal token matches this project
    const { data: project } = await supabase
      .from('projects')
      .select('id, portal_token, title, org_id')
      .eq('id', project_id)
      .eq('portal_token', portal_token)
      .maybeSingle()

    if (!project) {
      return NextResponse.json({ error: 'Invalid portal token' }, { status: 403 })
    }

    // Record the approval
    await supabase.from('portal_quote_approvals').insert({
      project_id,
      portal_token,
      action,
      customer_name: customer_name || null,
      notes: notes || null,
    })

    // Add a job comment so the team sees it
    const teamMsg = action === 'approved'
      ? `Customer ${customer_name ? `(${customer_name}) ` : ''}approved the quote via the customer portal.`
      : `Customer ${customer_name ? `(${customer_name}) ` : ''}requested changes via the customer portal: ${notes || 'No notes provided.'}`

    await supabase.from('job_comments').insert({
      project_id,
      org_id: project.org_id,
      body: teamMsg,
      channel: 'internal',
    })

    // If approved, add a notification to the team
    if (action === 'approved') {
      await supabase.from('notifications').insert({
        org_id: project.org_id,
        title: 'Quote Approved',
        message: `${customer_name || 'Customer'} approved the quote for "${project.title}"`,
        type: 'quote_approved',
        link: `/projects/${project_id}`,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[portal/quote-action]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
