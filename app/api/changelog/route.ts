import { execSync } from 'child_process'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

interface Commit {
  hash: string
  date: string
  subject: string
  body: string
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Get git log with full format
    const raw = execSync(
      'git log --pretty=format:"%H|%ad|%s|%b---END---" --date=format:"%Y-%m-%d" -n 60 2>/dev/null',
      { cwd: process.cwd(), encoding: 'utf8', timeout: 5000 }
    )

    const commits: Commit[] = []

    // Parse commits
    raw.split('---END---').forEach(block => {
      const trimmed = block.trim()
      if (!trimmed) return
      const [hash, date, subject, ...bodyParts] = trimmed.split('|')
      if (!hash || !subject) return
      commits.push({
        hash: hash.trim().substring(0, 7),
        date: date?.trim() || '',
        subject: subject?.trim() || '',
        body: bodyParts.join('|').trim(),
      })
    })

    // Categorize commits by emoji/keyword
    const categorized = commits.map(c => ({
      ...c,
      category: categorize(c.subject),
    }))

    return Response.json({ commits: categorized })
  } catch {
    // Return static log if git not available (production build)
    return Response.json({
      commits: STATIC_CHANGELOG,
    })
  }
}

function categorize(subject: string): string {
  const s = subject.toLowerCase()
  if (s.includes('fix') || s.includes('bug') || s.includes('crash')) return 'fix'
  if (s.includes('ai') || s.includes('claude') || s.includes('genie')) return 'ai'
  if (s.includes('invoice') || s.includes('estimate') || s.includes('payment')) return 'finance'
  if (s.includes('task') || s.includes('pipeline') || s.includes('stage')) return 'workflow'
  if (s.includes('sms') || s.includes('email') || s.includes('inbox') || s.includes('message')) return 'comms'
  if (s.includes('referral') || s.includes('affiliate') || s.includes('commission')) return 'sales'
  if (s.includes('install') || s.includes('production') || s.includes('print')) return 'production'
  if (s.includes('settings') || s.includes('config') || s.includes('integrat')) return 'settings'
  if (s.includes('dashboard') || s.includes('analytics') || s.includes('report')) return 'analytics'
  if (s.includes('ui') || s.includes('design') || s.includes('style') || s.includes('nav')) return 'ui'
  return 'feature'
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
