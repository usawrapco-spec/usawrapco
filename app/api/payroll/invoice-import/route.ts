import { ORG_ID } from '@/lib/org'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

// Parse a line of CSV respecting quoted fields (RFC 4180)
function parseLine(line: string): string[] {
  const fields: string[] = []
  let i = 0
  while (i <= line.length) {
    if (i === line.length) { fields.push(''); break }
    if (line[i] === '"') {
      let field = ''
      i++
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { field += '"'; i += 2 }
        else if (line[i] === '"') { i++; break }
        else { field += line[i++] }
      }
      if (i < line.length && line[i] === ',') i++
      fields.push(field)
    } else {
      const end = line.indexOf(',', i)
      if (end === -1) { fields.push(line.slice(i).trim()); break }
      fields.push(line.slice(i, end).trim())
      i = end + 1
    }
  }
  return fields
}

// Parse a CSV string into rows of objects
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = parseLine(lines[0]).map(h => h.toLowerCase().trim())
  return lines.slice(1).map(line => {
    const values = parseLine(line)
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = (values[i] ?? '').trim() })
    return obj
  })
}

// Map common CSV column name variations
function col(row: Record<string, string>, ...names: string[]): string {
  for (const n of names) if (row[n] !== undefined) return row[n]
  return ''
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'owner' && profile.role !== 'admin'))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const orgId = profile.org_id || ORG_ID

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const text = await file.text()
  const rows = parseCSV(text)
  if (rows.length === 0) return NextResponse.json({ error: 'No data rows found in CSV' }, { status: 400 })

  // Get existing customers for matching
  const { data: customers } = await admin.from('customers').select('id, name, email').eq('org_id', orgId)
  const customerByName: Record<string, any> = {}
  for (const c of customers || []) {
    if (c.name) customerByName[c.name.toLowerCase().trim()] = c
  }

  let imported = 0
  let skipped = 0
  let unmatched = 0
  const unmatchedList: any[] = []
  const errors: string[] = []

  for (const row of rows) {
    const invoiceNum = col(row, 'invoice number', 'invoice_number', 'invoicenumber', 'invoice #', 'num')
    const customerName = col(row, 'customer', 'customer name', 'client', 'name', 'customer_name')
    const amountStr = col(row, 'amount', 'total', 'invoice total', 'gross amount', 'amount due')
    const dateStr = col(row, 'date', 'invoice date', 'txndate', 'created date')
    const statusStr = col(row, 'status', 'invoice status', 'payment status')
    const dueStr = col(row, 'due date', 'due_date', 'duedate')

    if (!invoiceNum && !amountStr) { skipped++; continue }

    const amount = parseFloat(amountStr.replace(/[$,]/g, '')) || 0
    const customer = customerName ? customerByName[customerName.toLowerCase().trim()] : null

    let invoiceDate: string | null = null
    if (dateStr) {
      const d = new Date(dateStr)
      if (!isNaN(d.getTime())) invoiceDate = d.toISOString()
    }
    let dueDate: string | null = null
    if (dueStr) {
      const d = new Date(dueStr)
      if (!isNaN(d.getTime())) dueDate = d.toISOString().split('T')[0]
    }

    const statusLower = statusStr.toLowerCase()
    const status = statusLower.includes('paid') ? 'paid'
      : statusLower.includes('partial') ? 'partial'
      : statusLower.includes('overdue') ? 'overdue'
      : statusLower.includes('void') ? 'void'
      : 'sent'

    const invData: any = {
      org_id: orgId,
      total: amount,
      subtotal: amount,
      status,
      due_date: dueDate,
    }
    if (invoiceNum) invData.invoice_number = invoiceNum
    if (invoiceDate) invData.created_at = invoiceDate
    if (customer) invData.customer_id = customer.id

    const { error: insertErr } = await admin.from('invoices').insert(invData)
    if (insertErr) { errors.push(`Row ${imported + skipped + 1}: ${insertErr.message}`); skipped++; continue }

    imported++
    if (!customer && customerName) {
      unmatched++
      unmatchedList.push({ name: customerName, invoice: invoiceNum, amount })
    }
  }

  return NextResponse.json({ imported, skipped, unmatched, unmatched_list: unmatchedList, errors: errors.slice(0, 20), total_rows: rows.length })
}
