import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import Anthropic from '@anthropic-ai/sdk'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

type AgentId = 'bookkeeper' | 'fleet_manager' | 'sales_agent' | 'production_manager'

async function buildSystemPrompt(admin: any, orgId: string, agentId: AgentId): Promise<string> {
  const today = new Date().toISOString().split('T')[0]
  let context = ''

  if (agentId === 'bookkeeper') {
    const [invoices, payments, estimates, expenses] = await Promise.all([
      admin.from('invoices').select('id, invoice_number, status, total, amount_paid, balance_due, due_date, customer_id').eq('org_id', orgId).limit(100),
      admin.from('payments').select('id, amount, method, payment_date, invoice_id').eq('org_id', orgId).limit(200),
      admin.from('estimates').select('id, estimate_number, status, total, quote_date').eq('org_id', orgId).limit(100),
      admin.from('job_expenses').select('id, amount, category, description, created_at').eq('org_id', orgId).limit(200),
    ])

    const totalRevenue = (invoices.data || []).reduce((s: number, i: any) => s + (i.total || 0), 0)
    const totalCollected = (payments.data || []).reduce((s: number, p: any) => s + (p.amount || 0), 0)
    const outstanding = totalRevenue - totalCollected
    const overdueInvoices = (invoices.data || []).filter((i: any) => i.status === 'overdue' || (i.due_date && i.due_date < today && i.balance_due > 0))

    context = `
FINANCIAL DATA (as of ${today}):
- Total Invoiced: $${totalRevenue.toLocaleString()}
- Total Collected: $${totalCollected.toLocaleString()}
- Outstanding: $${outstanding.toLocaleString()}
- Overdue Invoices: ${overdueInvoices.length}
- Total Estimates: ${(estimates.data || []).length}
- Total Payments: ${(payments.data || []).length}

INVOICES (recent):
${(invoices.data || []).slice(0, 20).map((i: any) => `  ${i.invoice_number}: $${i.total} | Status: ${i.status} | Balance: $${i.balance_due || 0}`).join('\n')}

EXPENSES:
${(expenses.data || []).slice(0, 20).map((e: any) => `  $${e.amount} - ${e.category || 'uncategorized'}: ${e.description || ''}`).join('\n') || '  No expenses tracked yet'}
`

    return `You are the Bookkeeper AI for USA Wrap Co, a vehicle wrap shop in Tacoma, WA.
You have access to their financial data. Be precise with numbers. Flag discrepancies.
If asked about P&L, calculate: Revenue - Expenses - Payroll = Net.
Always format currency with $ and commas.
${context}
Answer concisely. Use bullet points for lists. Bold key numbers.`
  }

  if (agentId === 'fleet_manager') {
    const [vehicles, trips, customers] = await Promise.all([
      admin.from('fleet_vehicles').select('*').eq('org_id', orgId).limit(200),
      admin.from('fleet_trips').select('*, vehicle:vehicle_id(year, make, model)').eq('org_id', orgId).limit(200),
      admin.from('customers').select('id, name, business_name').eq('org_id', orgId).limit(100),
    ])

    const totalMiles = (trips.data || []).reduce((s: number, t: any) => s + Number(t.miles || 0), 0)
    const wrapped = (vehicles.data || []).filter((v: any) => v.wrap_status === 'wrapped').length
    const unwrapped = (vehicles.data || []).filter((v: any) => v.wrap_status === 'none').length

    context = `
FLEET DATA (as of ${today}):
- Total Vehicles: ${(vehicles.data || []).length}
- Wrapped: ${wrapped}
- Unwrapped (Opportunities): ${unwrapped}
- Total Miles Tracked: ${totalMiles.toFixed(1)}
- Total Trips: ${(trips.data || []).length}
- Customers with Vehicles: ${new Set((vehicles.data || []).filter((v: any) => v.customer_id).map((v: any) => v.customer_id)).size}

VEHICLES:
${(vehicles.data || []).slice(0, 30).map((v: any) => `  ${v.year || '?'} ${v.make || ''} ${v.model || ''} | VIN: ${(v.vin || 'N/A').slice(0, 11)}... | Wrap: ${v.wrap_status} | Miles: ${v.mileage || 0}`).join('\n')}
`

    return `You are the Fleet Manager AI for USA Wrap Co.
You manage vehicle fleet data, mileage tracking, and wrap pipeline.
Help users understand fleet health, identify wrap opportunities, and track mileage.
${context}
Answer concisely. Use bullet points.`
  }

  if (agentId === 'sales_agent') {
    const [customers, projects, estimates] = await Promise.all([
      admin.from('customers').select('id, name, business_name, industry').eq('org_id', orgId).limit(100),
      admin.from('projects').select('id, title, status, pipe_stage, revenue, vehicle_desc, customer_id').eq('org_id', orgId).neq('status', 'cancelled').limit(100),
      admin.from('estimates').select('id, estimate_number, status, total, customer_id').eq('org_id', orgId).limit(100),
    ])

    const activeJobs = (projects.data || []).filter((p: any) => p.pipe_stage !== 'done')
    const pipeline = activeJobs.reduce((s: number, p: any) => s + (p.revenue || 0), 0)
    const pendingEstimates = (estimates.data || []).filter((e: any) => e.status === 'sent' || e.status === 'viewed')

    context = `
SALES DATA (as of ${today}):
- Total Customers: ${(customers.data || []).length}
- Active Jobs: ${activeJobs.length}
- Pipeline Value: $${pipeline.toLocaleString()}
- Pending Estimates: ${pendingEstimates.length}
- Total Estimates: ${(estimates.data || []).length}

ACTIVE PIPELINE:
${activeJobs.slice(0, 20).map((p: any) => `  ${p.title} | Stage: ${p.pipe_stage} | Rev: $${p.revenue || 0} | Vehicle: ${p.vehicle_desc || 'N/A'}`).join('\n')}

PENDING ESTIMATES:
${pendingEstimates.slice(0, 10).map((e: any) => `  ${e.estimate_number}: $${e.total} | Status: ${e.status}`).join('\n')}
`

    return `You are the Sales Agent AI for USA Wrap Co, a vehicle wrap shop in Tacoma, WA.
Help with quoting, pricing guidance, customer follow-up, and pipeline management.
Pricing reference: Full wraps $2,500-$5,000+, partial wraps $800-$2,500, decals $200-$800.
Fleet deals get 10-15% volume discount. Rush jobs add 20-30%.
${context}
Answer concisely. Be enthusiastic but professional.`
  }

  // production_manager
  const [projects, profiles] = await Promise.all([
    admin.from('projects').select('id, title, status, pipe_stage, install_date, vehicle_desc, installer_id').eq('org_id', orgId).in('pipe_stage', ['production', 'install', 'prod_review']).limit(100),
    admin.from('profiles').select('id, name, role').eq('org_id', orgId).eq('active', true).limit(50),
  ])

  const inProduction = (projects.data || []).filter((p: any) => p.pipe_stage === 'production')
  const inInstall = (projects.data || []).filter((p: any) => p.pipe_stage === 'install')
  const inReview = (projects.data || []).filter((p: any) => p.pipe_stage === 'prod_review')
  const installers = (profiles.data || []).filter((p: any) => p.role === 'installer' || p.role === 'production')

  context = `
PRODUCTION DATA (as of ${today}):
- In Production: ${inProduction.length}
- In Install: ${inInstall.length}
- In QC Review: ${inReview.length}
- Active Installers: ${installers.length}

PRODUCTION QUEUE:
${inProduction.slice(0, 15).map((p: any) => `  ${p.title} | Vehicle: ${p.vehicle_desc || 'N/A'} | Install: ${p.install_date || 'TBD'}`).join('\n')}

INSTALL QUEUE:
${inInstall.slice(0, 15).map((p: any) => `  ${p.title} | Vehicle: ${p.vehicle_desc || 'N/A'} | Install: ${p.install_date || 'TBD'}`).join('\n')}

TEAM:
${installers.map((p: any) => `  ${p.name} (${p.role})`).join('\n')}
`

  return `You are the Production Manager AI for USA Wrap Co.
You manage the production schedule, installer workload, and quality control.
Help identify bottlenecks, balance workload, and keep jobs on schedule.
${context}
Answer concisely. Flag urgent items.`
}

export async function POST(req: Request) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getSupabaseAdmin()
    const { data: profile } = await admin.from('profiles').select('org_id').eq('id', user.id).single()
    const orgId = profile?.org_id || ORG_ID

    const body = await req.json()
    const { agentId, messages } = body as { agentId: AgentId; messages: Array<{ role: string; content: string }> }

    if (!agentId || !messages?.length) {
      return Response.json({ error: 'agentId and messages required' }, { status: 400 })
    }

    const systemPrompt = await buildSystemPrompt(admin, orgId, agentId)

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })

    const content = response.content[0].type === 'text' ? response.content[0].text : ''

    return Response.json({ content })
  } catch (err: any) {
    console.error('[agents/chat]', err)
    return Response.json({ error: err.message || 'Agent chat failed' }, { status: 500 })
  }
}
