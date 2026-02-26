import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  return Response.json({ commits: STATIC_CHANGELOG })
}


const STATIC_CHANGELOG = [
  { hash: 'bde7856', date: '2026-02-21', subject: 'SMS/Email message APIs, cross-referral tracker', body: '', category: 'comms' },
  { hash: 'f286221', date: '2026-02-21', subject: 'Estimate: real SendGrid email + PDF export', body: '', category: 'finance' },
  { hash: 'bd5ee6d', date: '2026-02-21', subject: 'Invoice email send API + PDF print + manual task creation', body: '', category: 'finance' },
  { hash: 'b98167e', date: '2026-02-21', subject: 'AutoTasks: assigned DB tasks with mark-done', body: '', category: 'workflow' },
  { hash: '065475b', date: '2026-02-21', subject: 'Phase 5: Integration webhooks — Slack + GoHighLevel', body: '', category: 'settings' },
  { hash: '7569081', date: '2026-02-20', subject: 'Phase 3-5: WrapUp, Online Shop, Integrations, middleware', body: '', category: 'feature' },
  { hash: 'db62017', date: '2026-02-20', subject: 'Phase 2-3: Activity log API, Activity tab in job detail', body: '', category: 'workflow' },
  { hash: '517a448', date: '2026-02-19', subject: 'v6.1: Shopvox structure + PWA + proposals + templates', body: '', category: 'ui' },
  { hash: '1e52442', date: '2026-02-18', subject: 'v6.1: Premium overhaul — Unified Inbox, Payroll, AI GenieBar', body: '', category: 'feature' },
]
