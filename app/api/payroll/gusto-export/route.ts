import { ORG_ID } from '@/lib/org'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

// GET — list export history
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (profile.role !== 'owner' && profile.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const orgId = profile.org_id || ORG_ID
  const { data, error } = await admin
    .from('gusto_exports')
    .select('*, exporter:exported_by(id,name)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ exports: data })
}

// POST — generate Gusto CSV
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id, role, name').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (profile.role !== 'owner' && profile.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { export_type, period_start, period_end, payroll_run_id, employees } = body

  if (!export_type || !period_start || !period_end || !employees)
    return NextResponse.json({ error: 'export_type, period_start, period_end, and employees required' }, { status: 400 })

  const orgId = profile.org_id || ORG_ID
  let csvRows: string[] = []
  let totalAmount = 0

  if (export_type === 'w2') {
    // Gusto W2 payroll import format
    csvRows.push('Employee ID,First Name,Last Name,Pay Type,Hours,Amount')
    for (const emp of employees) {
      const [firstName, ...rest] = (emp.name || 'Unknown').split(' ')
      const lastName = rest.join(' ') || ''
      const gustoId = emp.gusto_employee_id || ''

      // Regular hours line
      if (emp.hours_worked > 0) {
        csvRows.push(`"${gustoId}","${firstName}","${lastName}","Regular Hours","${emp.hours_worked.toFixed(2)}",""`)
      }

      // Commission line (only the bonus portion above base)
      if (emp.commission_bonus > 0) {
        csvRows.push(`"${gustoId}","${firstName}","${lastName}","Commission","","${emp.commission_bonus.toFixed(2)}"`)
      }

      // Base pay line
      csvRows.push(`"${gustoId}","${firstName}","${lastName}","Regular Pay","40","${emp.base_pay.toFixed(2)}"`)

      totalAmount += emp.total_pay || 0
    }
  } else if (export_type === '1099') {
    // Gusto 1099 contractor payment format
    csvRows.push('Contractor ID,First Name,Last Name,Pay Type,Amount,Description')
    for (const emp of employees) {
      const [firstName, ...rest] = (emp.name || 'Unknown').split(' ')
      const lastName = rest.join(' ') || ''
      const gustoId = emp.gusto_employee_id || ''
      const amount = emp.total_earned || 0
      const desc = `${emp.total_jobs || 0} jobs completed ${period_start} to ${period_end}`
      csvRows.push(`"${gustoId}","${firstName}","${lastName}","Flat Rate","${amount.toFixed(2)}","${desc}"`)
      totalAmount += amount
    }
  } else if (export_type === 'hours') {
    // Gusto time tracking import format
    csvRows.push('Employee ID,First Name,Last Name,Date,Hours,Job/Project,Notes')
    for (const emp of employees) {
      const [firstName, ...rest] = (emp.name || 'Unknown').split(' ')
      const lastName = rest.join(' ') || ''
      const gustoId = emp.gusto_employee_id || ''
      const blocks = emp.time_blocks || []
      for (const block of blocks) {
        const date = (block.start_at || '').split('T')[0]
        const hours = (block.hours || 0).toFixed(2)
        const job = (block.title || '').replace(/"/g, "'")
        const notes = (block.notes || '').replace(/"/g, "'")
        csvRows.push(`"${gustoId}","${firstName}","${lastName}","${date}","${hours}","${job}","${notes}"`)
      }
    }
  }

  const csvData = csvRows.join('\n')
  const fileName = `gusto_${export_type}_${period_start}_${period_end}.csv`

  // Store export record
  await admin.from('gusto_exports').insert({
    org_id: orgId,
    payroll_run_id: payroll_run_id || null,
    export_type,
    period_start,
    period_end,
    file_name: fileName,
    row_count: csvRows.length - 1,
    total_amount: Math.round(totalAmount * 100) / 100,
    csv_data: csvData,
    exported_by: user.id,
  })

  return NextResponse.json({
    csv: csvData,
    file_name: fileName,
    row_count: csvRows.length - 1,
    total_amount: Math.round(totalAmount * 100) / 100,
  })
}
