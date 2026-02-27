import { ORG_ID } from '@/lib/org'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'owner' && profile.role !== 'admin'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const orgId = profile.org_id || ORG_ID
  const body = await req.json()
  const { message, history } = body
  if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 })

  const year = new Date().getFullYear()
  const yearStart = `${year}-01-01`

  // Gather business context
  const [runsRes, projectsRes, invoicesRes, employeesRes] = await Promise.all([
    admin.from('payroll_runs').select('period_start, period_end, status, total_gross, employee_count').eq('org_id', orgId).gte('period_start', yearStart).order('period_start', { ascending: false }).limit(10),
    admin.from('projects').select('id, title, pipe_stage, revenue, profit, gpm, installer_id, agent_id, created_at').eq('org_id', orgId).gte('created_at', yearStart).limit(100),
    admin.from('invoices').select('id, amount, status, due_date, created_at').eq('org_id', orgId).gte('created_at', yearStart).limit(100),
    admin.from('profiles').select('id, name, role').eq('org_id', orgId).eq('active', true).limit(50),
  ])

  const runs = runsRes.data || []
  const projects = projectsRes.data || []
  const invoices = invoicesRes.data || []
  const employees = employeesRes.data || []

  const ytdPayroll = runs.filter((r: any) => ['processed', 'paid'].includes(r.status)).reduce((s: number, r: any) => s + (r.total_gross || 0), 0)
  const totalRevenue = projects.reduce((s: number, p: any) => s + (p.revenue || 0), 0)
  const totalProfit = projects.reduce((s: number, p: any) => s + (p.profit || 0), 0)
  const avgGPM = projects.length ? projects.reduce((s: number, p: any) => s + (p.gpm || 0), 0) / projects.length : 0
  const paidInvoices = invoices.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + (i.amount || 0), 0)
  const unpaidInvoices = invoices.filter((i: any) => i.status !== 'paid').reduce((s: number, i: any) => s + (i.amount || 0), 0)
  const activeJobs = projects.filter((p: any) => !['done', 'sales_close'].includes(p.pipe_stage)).length
  const completedJobs = projects.filter((p: any) => ['done', 'sales_close'].includes(p.pipe_stage)).length

  const context = `
Business Context (Year-to-Date ${year}):
- YTD Payroll Processed: $${ytdPayroll.toFixed(2)}
- Payroll Runs: ${runs.length} runs (most recent: ${runs[0]?.period_start || 'none'} to ${runs[0]?.period_end || 'none'}, status: ${runs[0]?.status || 'n/a'})
- Active Employees: ${employees.length}
- Total Revenue: $${totalRevenue.toFixed(2)}
- Total Profit: $${totalProfit.toFixed(2)}
- Average GPM: ${avgGPM.toFixed(1)}%
- Paid Invoices: $${paidInvoices.toFixed(2)}
- Unpaid Invoices: $${unpaidInvoices.toFixed(2)}
- Active Jobs: ${activeJobs}
- Completed Jobs: ${completedJobs}
- Total Jobs This Year: ${projects.length}
Recent Payroll Runs:
${runs.slice(0, 5).map((r: any) => `  ${r.period_start}–${r.period_end}: $${(r.total_gross || 0).toFixed(2)} (${r.status}, ${r.employee_count} employees)`).join('\n') || '  None'}
`.trim()

  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const messages: any[] = [
    ...(Array.isArray(history) ? history.slice(-8) : []),
    { role: 'user', content: message }
  ]

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `You are an expert AI bookkeeper and payroll advisor for USA Wrap Co, a vehicle wrap shop. You help the owner understand their financials, payroll costs, and job profitability. You have access to real business data shown below. Be concise, specific, and use dollar amounts from the data when answering questions. Format numbers with $ signs and commas.

${context}`,
    messages,
  })

  const reply = response.content[0]?.type === 'text' ? response.content[0].text : 'Sorry, I could not generate a response.'
  return NextResponse.json({ reply })
}
