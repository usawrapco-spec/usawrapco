import { ORG_ID } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ notifications: [] })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id').eq('id', user.id).single()
  const orgId = profile?.org_id || ORG_ID

  // Try real notifications table first
  let notifications: any[] = []
  try {
    const { data } = await admin
      .from('notifications')
      .select('*')
      .or(`user_id.eq.${user.id},org_id.eq.${orgId}`)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(20)
    notifications = data || []
  } catch {
    // Table may not exist yet
  }

  // If no real notifications, build smart ones from project data
  if (notifications.length === 0) {
    try {
      const [{ data: sendBacks }, { data: overdue }] = await Promise.all([
        admin.from('send_backs').select('*, project:project_id(title)').eq('org_id', orgId).order('created_at', { ascending: false }).limit(5),
        admin.from('projects').select('id, title, install_date, pipe_stage').eq('org_id', orgId).lt('install_date', new Date().toISOString()).eq('status', 'active').limit(5),
      ])

      const smart: any[] = []

      if (sendBacks?.length) {
        sendBacks.forEach((sb: any) => {
          smart.push({
            id: `sb-${sb.id}`,
            type: 'send_back',
            title: 'Job sent back',
            message: `${sb.project?.title || 'A job'} was sent back: ${sb.reason}`,
            created_at: sb.created_at,
            read: false,
          })
        })
      }

      if (overdue?.length) {
        overdue.forEach((p: any) => {
          smart.push({
            id: `od-${p.id}`,
            type: 'overdue',
            title: 'Overdue install',
            message: `${p.title} — install date passed, still in ${p.pipe_stage}`,
            created_at: new Date().toISOString(),
            read: false,
          })
        })
      }

      notifications = smart.slice(0, 10)
    } catch {}
  }

  return Response.json({ notifications })
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { ids } = await req.json()
  if (!ids?.length) return Response.json({ success: true })

  const admin = getSupabaseAdmin()
  try {
    await admin.from('notifications').update({ read: true }).in('id', ids)
  } catch {}

  return Response.json({ success: true })
}
