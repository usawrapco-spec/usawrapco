import { NextRequest, NextResponse } from 'next/server'
import React from 'react'
import {
  Document, Page, Text, View, StyleSheet, Font, Image, renderToBuffer,
} from '@react-pdf/renderer'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import {
  BRAND, PDF_COLORS,
  formatCurrency, formatDate,
} from '@/lib/pdf/brand'

Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiA.woff2', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiA.woff2', fontWeight: 700 },
  ],
})

Font.register({
  family: 'BarlowCondensed',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/barlowcondensed/v12/HTxwL3I-JCGChYJ8VI-L6OO_au7B6xTrF3DWvIMHYrtUxg.woff2', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/barlowcondensed/v12/HTxxL3I-JCGChYJ8VI-L6OO_au7B4xTrF3DWvImuVR4.woff2', fontWeight: 700 },
  ],
})

const s = StyleSheet.create({
  page: { fontFamily: 'Inter', fontSize: 10, color: PDF_COLORS.textPrimary, backgroundColor: PDF_COLORS.white, padding: 0 },
  headerBand: { backgroundColor: PDF_COLORS.dark, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 36, paddingVertical: 20 },
  logo: { width: 140, height: 45, objectFit: 'contain' },
  headerRight: { alignItems: 'flex-end' },
  headerTitle: { fontFamily: 'BarlowCondensed', fontSize: 26, fontWeight: 700, color: PDF_COLORS.white, letterSpacing: 3 },
  headerMeta: { color: '#94a3b8', fontSize: 10, marginTop: 2 },
  headerMetaBold: { color: PDF_COLORS.white, fontSize: 11, marginTop: 2, fontWeight: 600 },
  accentLine: { height: 3, backgroundColor: PDF_COLORS.accent },
  body: { padding: '24px 36px' },
  sectionLabel: { fontSize: 9, fontWeight: 700, color: PDF_COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },
  sectionTitle: { fontFamily: 'BarlowCondensed', fontSize: 14, fontWeight: 700, marginBottom: 10, marginTop: 16 },
  infoRow: { flexDirection: 'row', marginBottom: 20 },
  infoCol: { flex: 1 },
  infoName: { fontSize: 16, fontWeight: 700, marginBottom: 2 },
  infoText: { fontSize: 11, color: PDF_COLORS.textSecondary, marginBottom: 1 },
  divider: { borderBottomWidth: 1, borderBottomColor: PDF_COLORS.border, marginVertical: 14 },
  // Earnings table
  tableHeader: { flexDirection: 'row', backgroundColor: PDF_COLORS.darkAlt, paddingHorizontal: 10, paddingVertical: 7 },
  tableHeaderCell: { color: PDF_COLORS.white, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: PDF_COLORS.border },
  tableRowAlt: { backgroundColor: PDF_COLORS.lightGray },
  tableCell: { fontSize: 10 },
  tableCellBold: { fontSize: 10, fontWeight: 700 },
  colDesc: { width: '40%' },
  colHours: { width: '15%', textAlign: 'center' },
  colRate: { width: '20%', textAlign: 'right' },
  colAmount: { width: '25%', textAlign: 'right' },
  // Totals
  totalsBlock: { alignItems: 'flex-end', marginTop: 12, marginBottom: 16 },
  totalsRow: { flexDirection: 'row', width: 280, justifyContent: 'space-between', marginBottom: 5 },
  totalsLabel: { fontSize: 11, color: PDF_COLORS.textSecondary },
  totalsValue: { fontSize: 11, fontWeight: 600 },
  totalsLine: { borderBottomWidth: 1, borderBottomColor: PDF_COLORS.border, width: 280, marginVertical: 6 },
  netPayBox: { backgroundColor: '#f0fdf4', borderWidth: 2, borderColor: PDF_COLORS.green, borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 12 },
  netPayLabel: { fontSize: 12, fontWeight: 700, color: PDF_COLORS.textSecondary, marginBottom: 4 },
  netPayValue: { fontFamily: 'BarlowCondensed', fontSize: 36, fontWeight: 700, color: PDF_COLORS.greenDark },
  // YTD
  ytdRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  ytdLabel: { fontSize: 10, color: PDF_COLORS.textSecondary },
  ytdValue: { fontSize: 10, fontWeight: 600 },
  // Disclaimer
  disclaimer: { fontSize: 7, color: PDF_COLORS.textMuted, textAlign: 'center', marginTop: 20, fontStyle: 'italic', padding: '8px 36px' },
  // Footer
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 36, paddingVertical: 10, borderTopWidth: 1, borderTopColor: PDF_COLORS.border },
  footerLogo: { width: 70, height: 22, objectFit: 'contain' },
  footerText: { fontSize: 8, color: PDF_COLORS.textSecondary, textAlign: 'right' },
})

function PayStubPDF({ record, employee, period }: {
  record: any
  employee: any
  period: any
}) {
  const empName = employee?.name || 'Employee'
  const empEmail = employee?.email || ''
  const empRole = employee?.role || ''
  const periodStart = formatDate(period?.period_start)
  const periodEnd = formatDate(period?.period_end)
  const payDate = formatDate(period?.pay_date)

  const regularHours = record.regular_hours || 0
  const overtimeHours = record.overtime_hours || 0
  const ptoHours = record.pto_hours || 0
  const sickHours = record.sick_hours || 0
  const holidayHours = record.holiday_hours || 0
  const hourlyRate = record.hourly_rate || 0
  const overtimeRate = record.overtime_rate || hourlyRate * 1.5
  const commissionPay = record.commission_pay || 0
  const bonusPay = record.bonus_pay || 0
  const grossPay = record.gross_pay || 0
  const netPay = record.net_pay || 0

  const deductions = Array.isArray(record.deductions) ? record.deductions : []
  const taxes = Array.isArray(record.taxes) ? record.taxes : []

  // Build earnings rows
  const earnings: { desc: string; hours: string; rate: string; amount: number }[] = []
  if (regularHours > 0) {
    earnings.push({ desc: 'Regular Hours', hours: regularHours.toFixed(1), rate: formatCurrency(hourlyRate), amount: regularHours * hourlyRate })
  }
  if (overtimeHours > 0) {
    earnings.push({ desc: 'Overtime (1.5x)', hours: overtimeHours.toFixed(1), rate: formatCurrency(overtimeRate), amount: overtimeHours * overtimeRate })
  }
  if (ptoHours > 0) {
    earnings.push({ desc: 'PTO', hours: ptoHours.toFixed(1), rate: formatCurrency(hourlyRate), amount: ptoHours * hourlyRate })
  }
  if (sickHours > 0) {
    earnings.push({ desc: 'Sick Leave', hours: sickHours.toFixed(1), rate: formatCurrency(hourlyRate), amount: sickHours * hourlyRate })
  }
  if (holidayHours > 0) {
    earnings.push({ desc: 'Holiday Pay', hours: holidayHours.toFixed(1), rate: formatCurrency(hourlyRate), amount: holidayHours * hourlyRate })
  }
  if (commissionPay > 0) {
    earnings.push({ desc: 'Commission', hours: '--', rate: '--', amount: commissionPay })
  }
  if (bonusPay > 0) {
    earnings.push({ desc: 'Bonus', hours: '--', rate: '--', amount: bonusPay })
  }

  // Default tax line items if none specified
  const taxItems = taxes.length > 0 ? taxes : [
    { name: 'Federal Income Tax', amount: grossPay * 0.12 },
    { name: 'WA State L&I', amount: grossPay * 0.015 },
    { name: 'Social Security (6.2%)', amount: grossPay * 0.062 },
    { name: 'Medicare (1.45%)', amount: grossPay * 0.0145 },
  ]

  const totalTaxes = taxItems.reduce((sum: number, t: any) => sum + (t.amount || 0), 0)
  const totalDeductions = deductions.reduce((sum: number, d: any) => sum + (d.amount || 0), 0)

  // YTD placeholders (would normally come from aggregated data)
  const ytdGross = record.ytd_gross || grossPay
  const ytdTaxes = record.ytd_taxes || totalTaxes
  const ytdDeductions = record.ytd_deductions || totalDeductions
  const ytdNet = record.ytd_net || netPay

  return React.createElement(Document, {
    title: `Pay Stub - ${empName} - ${periodStart} to ${periodEnd}`,
    author: 'USA Wrap Co',
    subject: 'Employee Pay Stub',
  },
    React.createElement(Page, { size: 'LETTER', style: s.page },
      // Header
      React.createElement(View, { style: s.headerBand },
        React.createElement(Image, { style: s.logo, src: BRAND.logoUrl }),
        React.createElement(View, { style: s.headerRight },
          React.createElement(Text, { style: s.headerTitle }, 'PAY STUB'),
          React.createElement(Text, { style: s.headerMetaBold }, `Pay Date: ${payDate}`),
          React.createElement(Text, { style: s.headerMeta }, `Period: ${periodStart} - ${periodEnd}`),
        ),
      ),
      React.createElement(View, { style: s.accentLine }),

      React.createElement(View, { style: s.body },
        // Employee & Company Info
        React.createElement(View, { style: s.infoRow },
          React.createElement(View, { style: s.infoCol },
            React.createElement(Text, { style: s.sectionLabel }, 'Employee'),
            React.createElement(Text, { style: s.infoName }, empName),
            empRole ? React.createElement(Text, { style: s.infoText }, empRole.charAt(0).toUpperCase() + empRole.slice(1).replace('_', ' ')) : null,
            empEmail ? React.createElement(Text, { style: s.infoText }, empEmail) : null,
            employee?.division ? React.createElement(Text, { style: s.infoText }, `Division: ${employee.division}`) : null,
          ),
          React.createElement(View, { style: s.infoCol },
            React.createElement(Text, { style: s.sectionLabel }, 'Employer'),
            React.createElement(Text, { style: s.infoName }, BRAND.name),
            React.createElement(Text, { style: s.infoText }, BRAND.address),
            React.createElement(Text, { style: s.infoText }, BRAND.city),
            React.createElement(Text, { style: s.infoText }, BRAND.phone),
          ),
        ),

        React.createElement(View, { style: s.divider }),

        // Earnings Table
        React.createElement(Text, { style: s.sectionTitle }, 'Earnings'),
        React.createElement(View, { style: s.tableHeader },
          React.createElement(Text, { style: [s.tableHeaderCell, s.colDesc as any] }, 'Description'),
          React.createElement(Text, { style: [s.tableHeaderCell, s.colHours as any] }, 'Hours'),
          React.createElement(Text, { style: [s.tableHeaderCell, s.colRate as any] }, 'Rate'),
          React.createElement(Text, { style: [s.tableHeaderCell, s.colAmount as any] }, 'Amount'),
        ),
        ...earnings.map((item, i) =>
          React.createElement(View, {
            key: `earn-${i}`,
            style: [s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}] as any,
          },
            React.createElement(Text, { style: [s.tableCellBold, s.colDesc as any] }, item.desc),
            React.createElement(Text, { style: [s.tableCell, s.colHours as any] }, item.hours),
            React.createElement(Text, { style: [s.tableCell, s.colRate as any] }, item.rate),
            React.createElement(Text, { style: [s.tableCellBold, s.colAmount as any] }, formatCurrency(item.amount)),
          )
        ),

        // Deductions Table
        (deductions.length > 0 || taxItems.length > 0) && React.createElement(View, null,
          React.createElement(Text, { style: s.sectionTitle }, 'Deductions & Taxes'),
          React.createElement(View, { style: s.tableHeader },
            React.createElement(Text, { style: [s.tableHeaderCell, { width: '60%' }] }, 'Description'),
            React.createElement(Text, { style: [s.tableHeaderCell, { width: '40%', textAlign: 'right' }] }, 'Amount'),
          ),
          ...taxItems.map((item: any, i: number) =>
            React.createElement(View, {
              key: `tax-${i}`,
              style: [s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}] as any,
            },
              React.createElement(Text, { style: [s.tableCell, { width: '60%' }] }, item.name || item.type || 'Tax'),
              React.createElement(Text, { style: [s.tableCellBold, { width: '40%', textAlign: 'right', color: PDF_COLORS.red }] }, `-${formatCurrency(item.amount || 0)}`),
            )
          ),
          ...deductions.map((item: any, i: number) =>
            React.createElement(View, {
              key: `ded-${i}`,
              style: [s.tableRow, (taxItems.length + i) % 2 === 1 ? s.tableRowAlt : {}] as any,
            },
              React.createElement(Text, { style: [s.tableCell, { width: '60%' }] }, item.name || item.type || 'Deduction'),
              React.createElement(Text, { style: [s.tableCellBold, { width: '40%', textAlign: 'right', color: PDF_COLORS.red }] }, `-${formatCurrency(item.amount || 0)}`),
            )
          ),
        ),

        // Totals
        React.createElement(View, { style: s.totalsBlock },
          React.createElement(View, { style: s.totalsRow },
            React.createElement(Text, { style: s.totalsLabel }, 'Gross Pay'),
            React.createElement(Text, { style: s.totalsValue }, formatCurrency(grossPay)),
          ),
          React.createElement(View, { style: s.totalsRow },
            React.createElement(Text, { style: s.totalsLabel }, 'Total Taxes'),
            React.createElement(Text, { style: { ...s.totalsValue, color: PDF_COLORS.red } }, `-${formatCurrency(totalTaxes)}`),
          ),
          totalDeductions > 0 && React.createElement(View, { style: s.totalsRow },
            React.createElement(Text, { style: s.totalsLabel }, 'Total Deductions'),
            React.createElement(Text, { style: { ...s.totalsValue, color: PDF_COLORS.red } }, `-${formatCurrency(totalDeductions)}`),
          ),
          React.createElement(View, { style: s.totalsLine }),
        ),

        // Net Pay (Large)
        React.createElement(View, { style: s.netPayBox },
          React.createElement(Text, { style: s.netPayLabel }, 'NET PAY'),
          React.createElement(Text, { style: s.netPayValue }, formatCurrency(netPay)),
          record.payment_method && React.createElement(Text, {
            style: { fontSize: 9, color: PDF_COLORS.textMuted, marginTop: 4 },
          }, `Payment Method: ${record.payment_method.replace('_', ' ').toUpperCase()}`),
        ),

        React.createElement(View, { style: s.divider }),

        // YTD Totals
        React.createElement(Text, { style: s.sectionTitle }, 'Year-to-Date Totals'),
        React.createElement(View, { style: { backgroundColor: PDF_COLORS.lightGray, borderRadius: 8, padding: 14 } },
          React.createElement(View, { style: s.ytdRow },
            React.createElement(Text, { style: s.ytdLabel }, 'YTD Gross Earnings'),
            React.createElement(Text, { style: s.ytdValue }, formatCurrency(ytdGross)),
          ),
          React.createElement(View, { style: s.ytdRow },
            React.createElement(Text, { style: s.ytdLabel }, 'YTD Taxes Withheld'),
            React.createElement(Text, { style: s.ytdValue }, formatCurrency(ytdTaxes)),
          ),
          React.createElement(View, { style: s.ytdRow },
            React.createElement(Text, { style: s.ytdLabel }, 'YTD Deductions'),
            React.createElement(Text, { style: s.ytdValue }, formatCurrency(ytdDeductions)),
          ),
          React.createElement(View, { style: { ...s.ytdRow, borderTopWidth: 1, borderTopColor: PDF_COLORS.border, paddingTop: 6, marginTop: 4 } },
            React.createElement(Text, { style: { ...s.ytdLabel, fontWeight: 700, color: PDF_COLORS.textPrimary } }, 'YTD Net Pay'),
            React.createElement(Text, { style: { ...s.ytdValue, fontWeight: 700, color: PDF_COLORS.greenDark } }, formatCurrency(ytdNet)),
          ),
        ),
      ),

      // Disclaimer
      React.createElement(Text, { style: s.disclaimer },
        'This is not an official tax document. This pay stub is provided for informational purposes only and does not constitute a W-2 or other tax form. Please retain for your records.'
      ),

      // Footer
      React.createElement(View, { style: { position: 'absolute', bottom: 0, left: 0, right: 0 } },
        React.createElement(View, { style: s.footer },
          React.createElement(Image, { style: s.footerLogo, src: BRAND.logoUrl }),
          React.createElement(Text, { style: s.footerText }, `${BRAND.name}  |  ${BRAND.phone}  |  ${BRAND.email}`),
        ),
      ),
    ),
  )
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { recordId: string } }
) {
  try {
    const admin = getSupabaseAdmin()

    // Fetch payroll record
    const { data: record, error: recErr } = await admin
      .from('payroll_records')
      .select('*')
      .eq('id', params.recordId)
      .single()

    if (recErr || !record) {
      return NextResponse.json({ error: 'Payroll record not found' }, { status: 404 })
    }

    // Fetch employee profile
    const { data: employee } = await admin
      .from('profiles')
      .select('id, name, email, role, division')
      .eq('id', record.user_id)
      .single()

    // Fetch pay period
    const { data: period } = await admin
      .from('pay_periods')
      .select('*')
      .eq('id', record.pay_period_id)
      .single()

    // Calculate YTD from all previous records this year
    const yearStart = `${new Date().getFullYear()}-01-01`
    const { data: ytdRecords } = await admin
      .from('payroll_records')
      .select('gross_pay, net_pay, deductions, taxes')
      .eq('user_id', record.user_id)
      .eq('status', 'paid')
      .gte('created_at', yearStart)

    if (ytdRecords && ytdRecords.length > 0) {
      record.ytd_gross = ytdRecords.reduce((s: number, r: any) => s + (r.gross_pay || 0), 0) + (record.gross_pay || 0)
      record.ytd_net = ytdRecords.reduce((s: number, r: any) => s + (r.net_pay || 0), 0) + (record.net_pay || 0)
      record.ytd_taxes = ytdRecords.reduce((s: number, r: any) => {
        const taxes = Array.isArray(r.taxes) ? r.taxes : []
        return s + taxes.reduce((ts: number, t: any) => ts + (t.amount || 0), 0)
      }, 0)
      record.ytd_deductions = ytdRecords.reduce((s: number, r: any) => {
        const deds = Array.isArray(r.deductions) ? r.deductions : []
        return s + deds.reduce((ds: number, d: any) => ds + (d.amount || 0), 0)
      }, 0)
    }

    const empName = employee?.name || 'Employee'
    const periodLabel = period
      ? `${period.period_start}-${period.period_end}`
      : 'pay-stub'

    const buffer = await renderToBuffer(
      React.createElement(PayStubPDF, {
        record,
        employee,
        period,
      }) as any
    )

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="PayStub-${empName.replace(/\s+/g, '-')}-${periodLabel}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: any) {
    console.error('[pdf/pay-stub] error:', err)
    return NextResponse.json({ error: err.message || 'Pay stub generation failed' }, { status: 500 })
  }
}
