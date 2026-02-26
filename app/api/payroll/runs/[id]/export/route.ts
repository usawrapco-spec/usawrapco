import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (profile.role !== 'owner' && profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const format = req.nextUrl.searchParams.get('format') || 'csv'

  const [runRes, lineItemsRes] = await Promise.all([
    admin.from('payroll_runs').select('*').eq('id', params.id).single(),
    admin.from('payroll_line_items')
      .select('*, user:user_id(id,name,email,role)')
      .eq('payroll_run_id', params.id)
      .order('user_id'),
  ])

  if (!runRes.data) return NextResponse.json({ error: 'Run not found' }, { status: 404 })

  const run = runRes.data
  const lineItems = lineItemsRes.data || []

  // Group by employee
  const byEmployee: Record<string, any> = {}
  for (const li of lineItems) {
    const uid = li.user_id
    if (!byEmployee[uid]) {
      byEmployee[uid] = {
        user: li.user,
        items: [],
        total: 0,
      }
    }
    byEmployee[uid].items.push(li)
    byEmployee[uid].total += parseFloat(li.amount) || 0
  }

  if (format === 'csv') {
    // Gusto-compatible CSV format
    const rows: string[] = [
      'Employee Name,Employee Email,Pay Type,Hours,Rate,Amount,Notes,Pay Period Start,Pay Period End'
    ]
    for (const emp of Object.values(byEmployee) as any[]) {
      for (const li of emp.items) {
        const name = emp.user?.name || 'Unknown'
        const email = emp.user?.email || ''
        const hours = li.hours || ''
        const rate = li.rate || ''
        const notes = (li.description || li.notes || li.type || '').replace(/,/g, ';')
        rows.push(`"${name}","${email}","${li.type}","${hours}","${rate}","${li.amount}","${notes}","${run.period_start}","${run.period_end}"`)
      }
    }

    const csv = rows.join('\n')
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="payroll_${run.period_start}_${run.period_end}.csv"`,
      },
    })
  }

  // JSON summary for PDF generation on client
  return NextResponse.json({
    run,
    employees: Object.values(byEmployee),
    period_start: run.period_start,
    period_end: run.period_end,
    total_gross: run.total_gross,
    employee_count: run.employee_count,
  })
}
