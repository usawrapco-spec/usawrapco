import { ORG_ID } from '@/lib/org'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'


export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (profile.role !== 'owner' && profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const orgId = profile.org_id || ORG_ID

  const { data: run } = await admin.from('payroll_runs').select('*').eq('id', params.id).single()
  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  if (run.status === 'processed' || run.status === 'paid')
    return NextResponse.json({ error: 'Run already processed' }, { status: 400 })

  const body = await req.json()
  // line_items_input: array of { user_id, type, hours, rate, amount, description, reference_id, reference_type, notes }
  const lineItemsInput: any[] = body.line_items || []

  // Delete existing line items for this run (allow re-processing)
  await admin.from('payroll_line_items').delete().eq('payroll_run_id', params.id)

  // Insert new line items
  if (lineItemsInput.length > 0) {
    const toInsert = lineItemsInput.map(li => ({
      payroll_run_id: params.id,
      user_id: li.user_id,
      type: li.type,
      description: li.description || null,
      hours: li.hours || null,
      rate: li.rate || null,
      amount: parseFloat(li.amount) || 0,
      reference_id: li.reference_id || null,
      reference_type: li.reference_type || null,
      notes: li.notes || null,
    }))
    await admin.from('payroll_line_items').insert(toInsert)
  }

  // Calculate totals
  const totalGross = lineItemsInput.reduce((sum, li) => sum + (parseFloat(li.amount) || 0), 0)

  // Mark approved mileage/expenses as paid and link to this run
  await admin.from('mileage_logs')
    .update({ status: 'paid', payroll_run_id: params.id })
    .eq('org_id', orgId)
    .eq('status', 'approved')
    .gte('date', run.period_start)
    .lte('date', run.period_end)

  await admin.from('expense_reports')
    .update({ status: 'paid', payroll_run_id: params.id })
    .eq('org_id', orgId)
    .eq('status', 'approved')
    .gte('expense_date', run.period_start)
    .lte('expense_date', run.period_end)

  // Process advance deductions — reduce remaining balance
  const advanceDeductions = lineItemsInput.filter(li => li.type === 'advance_deduction')
  for (const deduction of advanceDeductions) {
    if (deduction.reference_id) {
      const { data: advance } = await admin
        .from('employee_advances')
        .select('remaining_balance')
        .eq('id', deduction.reference_id)
        .single()
      if (advance) {
        const newBalance = Math.max(0, advance.remaining_balance - Math.abs(deduction.amount))
        await admin.from('employee_advances').update({
          remaining_balance: newBalance,
          fully_repaid: newBalance === 0,
          updated_at: new Date().toISOString(),
        }).eq('id', deduction.reference_id)
      }
    }
  }

  // Update run status
  const employeeCount = new Set(lineItemsInput.map(li => li.user_id)).size
  const { data: updated, error } = await admin.from('payroll_runs').update({
    status: 'processed',
    total_gross: totalGross,
    total_net: totalGross, // Net calculation would require tax data
    employee_count: employeeCount,
    processed_by: user.id,
    processed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', params.id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ run: updated, line_items_count: lineItemsInput.length })
}
