import { NextRequest, NextResponse } from 'next/server'
import React from 'react'
import {
  Document, Page, Text, View, StyleSheet, Font, Image, renderToBuffer,
} from '@react-pdf/renderer'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import {
  BRAND, PDF_COLORS, PDF_TERMS,
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
  page: { fontFamily: 'Inter', fontSize: 10, color: PDF_COLORS.textPrimary, backgroundColor: PDF_COLORS.white },
  headerBand: { backgroundColor: PDF_COLORS.dark, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 36, paddingVertical: 20 },
  logo: { width: 140, height: 45, objectFit: 'contain' },
  headerRight: { alignItems: 'flex-end' },
  headerTitle: { fontFamily: 'BarlowCondensed', fontSize: 26, fontWeight: 700, color: PDF_COLORS.white, letterSpacing: 3 },
  headerMeta: { color: '#94a3b8', fontSize: 10, marginTop: 2 },
  headerMetaBold: { color: PDF_COLORS.white, fontSize: 11, marginTop: 2, fontWeight: 600 },
  accentLine: { height: 3, backgroundColor: PDF_COLORS.accent },
  // Status banners
  bannerPaid: { backgroundColor: '#dcfce7', borderLeftWidth: 4, borderLeftColor: PDF_COLORS.green, paddingHorizontal: 36, paddingVertical: 10 },
  bannerPartial: { backgroundColor: '#fef9c3', borderLeftWidth: 4, borderLeftColor: PDF_COLORS.amber, paddingHorizontal: 36, paddingVertical: 10 },
  bannerOverdue: { backgroundColor: '#fee2e2', borderLeftWidth: 4, borderLeftColor: PDF_COLORS.red, paddingHorizontal: 36, paddingVertical: 10 },
  bannerDue: { backgroundColor: '#dbeafe', borderLeftWidth: 4, borderLeftColor: PDF_COLORS.accent, paddingHorizontal: 36, paddingVertical: 10 },
  bannerText: { fontSize: 13, fontWeight: 700 },
  bannerTextGreen: { color: PDF_COLORS.greenDark },
  bannerTextAmber: { color: PDF_COLORS.amberDark },
  bannerTextRed: { color: PDF_COLORS.red },
  bannerTextBlue: { color: PDF_COLORS.accentDark },
  body: { padding: '20px 36px' },
  sectionLabel: { fontSize: 8, fontWeight: 700, color: PDF_COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 },
  billingRow: { flexDirection: 'row', marginBottom: 20 },
  billingCol: { flex: 1 },
  billName: { fontSize: 16, fontWeight: 700, marginBottom: 2 },
  billText: { fontSize: 11, color: PDF_COLORS.textSecondary, marginBottom: 1 },
  billEmail: { fontSize: 11, color: PDF_COLORS.accent, marginBottom: 1 },
  divider: { borderBottomWidth: 1, borderBottomColor: PDF_COLORS.border, marginVertical: 14 },
  // Table
  tableHeader: { flexDirection: 'row', backgroundColor: PDF_COLORS.darkAlt, paddingHorizontal: 8, paddingVertical: 7 },
  tableHeaderCell: { color: PDF_COLORS.white, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: PDF_COLORS.border },
  tableRowAlt: { backgroundColor: PDF_COLORS.lightGray },
  tableCell: { fontSize: 10 },
  tableCellBold: { fontSize: 10, fontWeight: 700 },
  tableCellGray: { fontSize: 9, color: PDF_COLORS.textSecondary, marginTop: 1 },
  accentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: PDF_COLORS.accent },
  colDesc: { width: '35%', paddingLeft: 8, position: 'relative' },
  colCoverage: { width: '25%' },
  colQty: { width: '8%', textAlign: 'center' },
  colUnit: { width: '15%', textAlign: 'right' },
  colTotal: { width: '17%', textAlign: 'right' },
  // Totals
  totalsBlock: { alignItems: 'flex-end', marginTop: 8, marginBottom: 20 },
  totalsRow: { flexDirection: 'row', width: 260, justifyContent: 'space-between', marginBottom: 4 },
  totalsLabel: { fontSize: 11, color: PDF_COLORS.textSecondary },
  totalsValue: { fontSize: 11, fontWeight: 600 },
  totalsLine: { borderBottomWidth: 1, borderBottomColor: PDF_COLORS.border, width: 260, marginVertical: 6 },
  totalsFinalRow: { flexDirection: 'row', width: 260, justifyContent: 'space-between', marginBottom: 4 },
  totalsFinalLabel: { fontSize: 14, fontWeight: 700 },
  totalsFinalValue: { fontSize: 14, fontWeight: 700 },
  totalsPaidRow: { flexDirection: 'row', width: 260, justifyContent: 'space-between', marginBottom: 4 },
  totalsPaidLabel: { fontSize: 11, color: PDF_COLORS.green, fontWeight: 600 },
  totalsPaidValue: { fontSize: 11, color: PDF_COLORS.green, fontWeight: 700 },
  totalsBalanceRow: { flexDirection: 'row', width: 260, justifyContent: 'space-between', marginTop: 4 },
  totalsBalanceLabel: { fontSize: 13, fontWeight: 700, color: PDF_COLORS.red },
  totalsBalanceValue: { fontSize: 13, fontWeight: 700, color: PDF_COLORS.red },
  // Payment history table
  payHistHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 6, marginTop: 8 },
  payHistHeaderCell: { fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: PDF_COLORS.textSecondary },
  payHistRow: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: PDF_COLORS.border },
  payHistCell: { fontSize: 10 },
  colPayDate: { width: '25%' },
  colPayMethod: { width: '30%' },
  colPayAmt: { width: '25%', textAlign: 'right' },
  colPayBy: { width: '20%' },
  // Payment options
  payOptionsBox: { backgroundColor: PDF_COLORS.lightGray, borderRadius: 8, padding: 14, marginTop: 12 },
  payOptTitle: { fontSize: 11, fontWeight: 700, marginBottom: 8 },
  payOptRow: { flexDirection: 'row', marginBottom: 4, alignItems: 'center' },
  payOptLabel: { fontSize: 9, color: PDF_COLORS.textSecondary, width: 120 },
  payOptValue: { fontSize: 10, fontWeight: 600, flex: 1 },
  payOptLink: { fontSize: 10, color: PDF_COLORS.accent, fontWeight: 600, flex: 1 },
  // Footer
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 36, paddingVertical: 10, borderTopWidth: 1, borderTopColor: PDF_COLORS.border },
  footerLogo: { width: 70, height: 22, objectFit: 'contain' },
  footerTagline: { fontSize: 8, color: PDF_COLORS.textMuted, fontStyle: 'italic' },
  footerRight: { fontSize: 8, color: PDF_COLORS.textSecondary, textAlign: 'right' },
  // Terms
  termsTitle: { fontFamily: 'BarlowCondensed', fontSize: 12, fontWeight: 700, marginBottom: 6, marginTop: 14 },
  termItem: { flexDirection: 'row', marginBottom: 3 },
  termText: { fontSize: 8, color: PDF_COLORS.textSecondary, flex: 1, lineHeight: 1.5 },
})

function StatusBanner({ invoice }: { invoice: any }) {
  const status = invoice.status
  const balanceDue = invoice.balance_due || 0
  const dueDate = invoice.due_date ? formatDate(invoice.due_date) : ''
  const amountPaid = invoice.amount_paid || 0

  if (status === 'paid') {
    return React.createElement(View, { style: s.bannerPaid },
      React.createElement(Text, { style: [s.bannerText, s.bannerTextGreen] as any },
        `PAID IN FULL${invoice.updated_at ? ` — ${formatDate(invoice.updated_at)}` : ''}`
      ),
    )
  }
  if (status === 'overdue') {
    const daysOverdue = invoice.due_date
      ? Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / 86400000)
      : 0
    return React.createElement(View, { style: s.bannerOverdue },
      React.createElement(Text, { style: [s.bannerText, s.bannerTextRed] as any },
        `OVERDUE — ${daysOverdue} days past due | Balance: ${formatCurrency(balanceDue)}`
      ),
    )
  }
  if (amountPaid > 0 && balanceDue > 0) {
    return React.createElement(View, { style: s.bannerPartial },
      React.createElement(Text, { style: [s.bannerText, s.bannerTextAmber] as any },
        `PARTIAL PAYMENT — ${formatCurrency(balanceDue)} remaining`
      ),
    )
  }
  return React.createElement(View, { style: s.bannerDue },
    React.createElement(Text, { style: [s.bannerText, s.bannerTextBlue] as any },
      `DUE ${dueDate || 'Upon Receipt'}`
    ),
  )
}

function InvoicePDF({ invoice, lineItems, payments }: {
  invoice: any; lineItems: any[]; payments: any[]
}) {
  const invNumber = `INV-${String(invoice.invoice_number || '').padStart(4, '0')}`
  const date = formatDate(invoice.invoice_date || invoice.created_at)
  const dueDate = formatDate(invoice.due_date)
  const customer = invoice.customer || {}
  const subtotal = invoice.subtotal || 0
  const discount = invoice.discount || 0
  const taxAmt = invoice.tax_amount || 0
  const total = invoice.total || 0
  const amountPaid = invoice.amount_paid || 0
  const balanceDue = invoice.balance_due || 0

  return React.createElement(Document, {
    title: `USA Wrap Co — ${invNumber}`,
    author: 'USA Wrap Co',
    subject: 'Vehicle Wrap Invoice',
  },
    React.createElement(Page, { size: 'LETTER', style: s.page },
      // Header
      React.createElement(View, { style: s.headerBand },
        React.createElement(Image, { style: s.logo, src: BRAND.logoUrl }),
        React.createElement(View, { style: s.headerRight },
          React.createElement(Text, { style: s.headerTitle }, 'INVOICE'),
          React.createElement(Text, { style: s.headerMetaBold }, invNumber),
          React.createElement(Text, { style: s.headerMeta }, `Invoice Date: ${date}`),
          React.createElement(Text, { style: s.headerMeta }, `Due Date: ${dueDate}`),
          invoice.form_data?.poNumber && React.createElement(Text, { style: s.headerMeta },
            `PO #: ${invoice.form_data.poNumber}`
          ),
        ),
      ),
      React.createElement(View, { style: s.accentLine }),

      // Status banner
      React.createElement(StatusBanner, { invoice }),

      React.createElement(View, { style: s.body },
        // Billing
        React.createElement(View, { style: s.billingRow },
          React.createElement(View, { style: s.billingCol },
            React.createElement(Text, { style: s.sectionLabel }, 'Bill To'),
            React.createElement(Text, { style: s.billName }, customer.name || customer.contact_name || 'Customer'),
            customer.company || customer.company_name
              ? React.createElement(Text, { style: { ...s.billText, fontWeight: 600 } },
                  customer.company || customer.company_name)
              : null,
            customer.phone && React.createElement(Text, { style: s.billText }, customer.phone),
            customer.email && React.createElement(Text, { style: s.billEmail }, customer.email),
          ),
          React.createElement(View, { style: s.billingCol },
            React.createElement(Text, { style: s.sectionLabel }, 'From'),
            React.createElement(Text, { style: s.billName }, BRAND.name),
            React.createElement(Text, { style: s.billText }, BRAND.address),
            React.createElement(Text, { style: s.billText }, BRAND.city),
            React.createElement(Text, { style: s.billText }, BRAND.phone),
            React.createElement(Text, { style: s.billEmail }, BRAND.email),
          ),
        ),

        React.createElement(View, { style: s.divider }),

        // Line items table
        React.createElement(View, { style: { marginBottom: 12 } },
          React.createElement(View, { style: s.tableHeader },
            React.createElement(Text, { style: [s.tableHeaderCell, s.colDesc as any] }, 'Description'),
            React.createElement(Text, { style: [s.tableHeaderCell, s.colCoverage as any] }, 'Details'),
            React.createElement(Text, { style: [s.tableHeaderCell, s.colQty as any] }, 'Qty'),
            React.createElement(Text, { style: [s.tableHeaderCell, s.colUnit as any] }, 'Unit Price'),
            React.createElement(Text, { style: [s.tableHeaderCell, s.colTotal as any] }, 'Total'),
          ),
          ...lineItems.map((item, i) =>
            React.createElement(View, {
              key: i,
              style: [s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}] as any,
            },
              React.createElement(View, { style: s.colDesc },
                React.createElement(View, { style: s.accentBar }),
                React.createElement(Text, { style: s.tableCellBold }, item.name || 'Item'),
                item.description && React.createElement(Text, { style: s.tableCellGray }, item.description),
              ),
              React.createElement(View, { style: s.colCoverage },
                React.createElement(Text, { style: s.tableCell },
                  (item.specs?.wrapType || item.specs?.coverageType || item.specs?.customerDescription || '—')
                ),
              ),
              React.createElement(View, { style: s.colQty },
                React.createElement(Text, { style: s.tableCell }, String(item.quantity || 1)),
              ),
              React.createElement(View, { style: s.colUnit },
                React.createElement(Text, { style: s.tableCell }, formatCurrency(item.unit_price || 0)),
              ),
              React.createElement(View, { style: s.colTotal },
                React.createElement(Text, { style: s.tableCellBold }, formatCurrency(item.total_price || 0)),
              ),
            )
          ),
        ),

        // Totals
        React.createElement(View, { style: s.totalsBlock },
          React.createElement(View, { style: s.totalsRow },
            React.createElement(Text, { style: s.totalsLabel }, 'Subtotal'),
            React.createElement(Text, { style: s.totalsValue }, formatCurrency(subtotal)),
          ),
          discount > 0 && React.createElement(View, { style: s.totalsRow },
            React.createElement(Text, { style: s.totalsLabel }, 'Discount'),
            React.createElement(Text, { style: { ...s.totalsValue, color: PDF_COLORS.amber } }, `-${formatCurrency(discount)}`),
          ),
          React.createElement(View, { style: s.totalsRow },
            React.createElement(Text, { style: s.totalsLabel },
              `Tax (${((invoice.tax_rate || 0) * 100).toFixed(2)}%)`
            ),
            React.createElement(Text, { style: s.totalsValue }, formatCurrency(taxAmt)),
          ),
          React.createElement(View, { style: s.totalsLine }),
          React.createElement(View, { style: s.totalsFinalRow },
            React.createElement(Text, { style: s.totalsFinalLabel }, 'INVOICE TOTAL'),
            React.createElement(Text, { style: s.totalsFinalValue }, formatCurrency(total)),
          ),
          amountPaid > 0 && React.createElement(View, { style: s.totalsPaidRow },
            React.createElement(Text, { style: s.totalsPaidLabel }, 'Amount Paid'),
            React.createElement(Text, { style: s.totalsPaidValue }, `-${formatCurrency(amountPaid)}`),
          ),
          React.createElement(View, { style: s.totalsLine }),
          React.createElement(View, { style: s.totalsBalanceRow },
            React.createElement(Text, { style: s.totalsBalanceLabel }, 'BALANCE DUE'),
            React.createElement(Text, { style: s.totalsBalanceValue }, formatCurrency(balanceDue)),
          ),
        ),

        // Payment history
        payments.length > 0 && React.createElement(View, null,
          React.createElement(View, { style: s.divider }),
          React.createElement(Text, { style: { ...s.sectionLabel, marginBottom: 4 } }, 'Payment History'),
          React.createElement(View, { style: s.payHistHeader },
            React.createElement(Text, { style: [s.payHistHeaderCell, s.colPayDate as any] }, 'Date'),
            React.createElement(Text, { style: [s.payHistHeaderCell, s.colPayMethod as any] }, 'Method'),
            React.createElement(Text, { style: [s.payHistHeaderCell, s.colPayAmt as any] }, 'Amount'),
            React.createElement(Text, { style: [s.payHistHeaderCell, s.colPayBy as any] }, 'Recorded By'),
          ),
          ...payments.map((p, i) =>
            React.createElement(View, { key: i, style: s.payHistRow },
              React.createElement(Text, { style: [s.payHistCell, s.colPayDate as any] }, formatDate(p.created_at || p.payment_date)),
              React.createElement(Text, { style: [s.payHistCell, s.colPayMethod as any] }, p.method || p.payment_method || '—'),
              React.createElement(Text, { style: [s.payHistCell, s.colPayAmt as any] }, formatCurrency(p.amount || 0)),
              React.createElement(Text, { style: [s.payHistCell, s.colPayBy as any] }, p.recorded_by_name || p.notes || '—'),
            )
          ),
        ),

        // Payment options
        React.createElement(View, { style: s.payOptionsBox },
          React.createElement(Text, { style: s.payOptTitle }, 'Payment Options'),
          React.createElement(View, { style: s.payOptRow },
            React.createElement(Text, { style: s.payOptLabel }, 'Pay Online:'),
            React.createElement(Text, { style: s.payOptLink },
              `usawrapco.com/pay/${invoice.id}`
            ),
          ),
          React.createElement(View, { style: s.payOptRow },
            React.createElement(Text, { style: s.payOptLabel }, 'Check Payable To:'),
            React.createElement(Text, { style: s.payOptValue }, BRAND.name),
          ),
          React.createElement(View, { style: s.payOptRow },
            React.createElement(Text, { style: s.payOptLabel }, 'Questions:'),
            React.createElement(Text, { style: s.payOptValue }, `${BRAND.phone}  |  ${BRAND.email}`),
          ),
        ),

        // Terms (compact)
        React.createElement(View, { style: s.divider }),
        React.createElement(Text, { style: s.termsTitle }, 'Terms & Conditions'),
        ...PDF_TERMS.slice(0, 4).map((term, i) =>
          React.createElement(View, { key: i, style: s.termItem },
            React.createElement(Text, { style: { ...s.termText, marginRight: 4, color: PDF_COLORS.accent } }, '•'),
            React.createElement(Text, { style: s.termText }, term),
          )
        ),
      ),

      // Footer
      React.createElement(View, { style: { position: 'absolute', bottom: 0, left: 0, right: 0 } },
        React.createElement(View, { style: s.footer },
          React.createElement(Image, { style: s.footerLogo, src: BRAND.logoUrl }),
          React.createElement(Text, { style: s.footerTagline }, BRAND.tagline),
          React.createElement(Text, { style: s.footerRight }, `${BRAND.phone}  |  ${BRAND.email}`),
        ),
      ),
    ),
  )
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = getSupabaseAdmin()

    const { data: invoice, error } = await admin
      .from('invoices')
      .select('*, customer:customer_id(id, name, email, phone, company, company_name, contact_name)')
      .eq('id', params.id)
      .single()

    if (error || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const { data: items } = await admin
      .from('line_items')
      .select('*')
      .eq('parent_type', 'invoice')
      .eq('parent_id', params.id)
      .order('sort_order', { ascending: true })

    const { data: payments } = await admin
      .from('payments')
      .select('*')
      .eq('invoice_id', params.id)
      .order('created_at', { ascending: true })

    const invNumber = `INV-${String(invoice.invoice_number || '').padStart(4, '0')}`

    const buffer = await renderToBuffer(
      React.createElement(InvoicePDF, {
        invoice,
        lineItems: items || [],
        payments: payments || [],
      })
    )

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="USA-Wrap-Co-Invoice-${invNumber}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: any) {
    console.error('[pdf/invoice] error:', err)
    return NextResponse.json({ error: err.message || 'PDF generation failed' }, { status: 500 })
  }
}
