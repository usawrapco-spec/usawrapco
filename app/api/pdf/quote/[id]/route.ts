import { NextRequest, NextResponse } from 'next/server'
import React from 'react'
import {
  Document, Page, Text, View, StyleSheet, Font, Image, renderToBuffer,
} from '@react-pdf/renderer'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import {
  BRAND, PDF_COLORS,
  formatCurrency, formatDate, addDays,
} from '@/lib/pdf/brand'

// ── Fonts ─────────────────────────────────────────────────────────────────────
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

// ── Styles (Shopvox format) ──────────────────────────────────────────────────
const s = StyleSheet.create({
  page: { fontFamily: 'Inter', fontSize: 10, color: PDF_COLORS.textPrimary, backgroundColor: PDF_COLORS.white, paddingBottom: 60 },
  // Header
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 36, paddingTop: 28, paddingBottom: 16 },
  logoArea: { flex: 1 },
  logo: { width: 140, height: 45, objectFit: 'contain', marginBottom: 6 },
  companyName: { fontFamily: 'BarlowCondensed', fontSize: 14, fontWeight: 700, color: PDF_COLORS.dark },
  companyInfo: { fontSize: 8.5, color: PDF_COLORS.textSecondary, lineHeight: 1.5 },
  quoteRight: { alignItems: 'flex-end' },
  quoteLabel: { fontFamily: 'BarlowCondensed', fontSize: 28, fontWeight: 700, color: PDF_COLORS.accent, letterSpacing: 2 },
  quoteNumber: { fontSize: 14, fontWeight: 700, color: PDF_COLORS.dark, marginTop: 2 },
  accentLine: { height: 3, backgroundColor: PDF_COLORS.accent },
  // Meta row
  metaRow: { flexDirection: 'row', paddingHorizontal: 36, paddingVertical: 12, backgroundColor: PDF_COLORS.lightGray },
  metaCol: { flex: 1 },
  metaLabel: { fontSize: 7.5, fontWeight: 700, color: PDF_COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 2 },
  metaValue: { fontSize: 10, fontWeight: 600, color: PDF_COLORS.dark },
  // Billing
  billingRow: { flexDirection: 'row', paddingHorizontal: 36, paddingVertical: 16 },
  billingCol: { flex: 1 },
  sectionLabel: { fontSize: 8, fontWeight: 700, color: PDF_COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 },
  billName: { fontSize: 14, fontWeight: 700, marginBottom: 2 },
  billText: { fontSize: 10, color: PDF_COLORS.textSecondary, marginBottom: 1 },
  billEmail: { fontSize: 10, color: PDF_COLORS.accent, marginBottom: 1 },
  divider: { borderBottomWidth: 1, borderBottomColor: PDF_COLORS.border, marginHorizontal: 36 },
  // Table — Shopvox style
  tableHeader: { flexDirection: 'row', backgroundColor: PDF_COLORS.darkAlt, paddingHorizontal: 12, paddingVertical: 7, marginHorizontal: 36, marginTop: 16 },
  th: { color: PDF_COLORS.white, fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, marginHorizontal: 36, borderBottomWidth: 1, borderBottomColor: PDF_COLORS.border },
  tableRowAlt: { backgroundColor: PDF_COLORS.lightGray },
  tc: { fontSize: 10 },
  tcBold: { fontSize: 10, fontWeight: 700 },
  tcGray: { fontSize: 9, color: PDF_COLORS.textSecondary },
  // Shopvox column widths: # | ITEM | QTY | UOM | U.PRICE | DISC | DISC.PRICE | TOTAL | TAXABLE
  colNum: { width: '4%', textAlign: 'center' },
  colItem: { width: '30%', paddingLeft: 4 },
  colQty: { width: '6%', textAlign: 'center' },
  colUom: { width: '8%', textAlign: 'center' },
  colUPrice: { width: '12%', textAlign: 'right' },
  colDisc: { width: '8%', textAlign: 'right' },
  colDiscPrice: { width: '12%', textAlign: 'right' },
  colTotal: { width: '12%', textAlign: 'right' },
  colTaxable: { width: '8%', textAlign: 'center' },
  // Totals
  totalsBlock: { alignItems: 'flex-end', paddingHorizontal: 36, marginTop: 12 },
  totalsRow: { flexDirection: 'row', width: 280, justifyContent: 'space-between', marginBottom: 4 },
  totalsLabel: { fontSize: 10, color: PDF_COLORS.textSecondary },
  totalsValue: { fontSize: 10, fontWeight: 600 },
  totalsAmber: { fontSize: 10, color: PDF_COLORS.amber, fontWeight: 600 },
  totalsLine: { borderBottomWidth: 1, borderBottomColor: PDF_COLORS.border, width: 280, marginVertical: 6 },
  totalsFinalRow: { flexDirection: 'row', width: 280, justifyContent: 'space-between', marginBottom: 4, paddingVertical: 4 },
  totalsFinalLabel: { fontSize: 14, fontWeight: 700 },
  totalsFinalValue: { fontSize: 14, fontWeight: 700 },
  depositRow: { flexDirection: 'row', width: 280, justifyContent: 'space-between', marginTop: 6, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: 'rgba(59,130,246,0.08)', borderRadius: 4 },
  depositLabel: { fontSize: 10, color: PDF_COLORS.accent, fontWeight: 600 },
  depositValue: { fontSize: 10, color: PDF_COLORS.accent, fontWeight: 700 },
  // Terms block
  termsBox: { marginHorizontal: 36, marginTop: 20, padding: 14, backgroundColor: PDF_COLORS.lightGray, borderRadius: 6, borderLeftWidth: 3, borderLeftColor: PDF_COLORS.accent },
  termsTitle: { fontSize: 10, fontWeight: 700, marginBottom: 6 },
  termsText: { fontSize: 8.5, color: PDF_COLORS.textSecondary, lineHeight: 1.6 },
  // Signature
  sigSection: { marginHorizontal: 36, marginTop: 24 },
  sigRow: { flexDirection: 'row', marginTop: 16 },
  sigBlock: { flex: 1, marginRight: 20 },
  sigLine: { borderBottomWidth: 1, borderBottomColor: PDF_COLORS.textPrimary, marginBottom: 4 },
  sigLabel: { fontSize: 8, color: PDF_COLORS.textMuted },
  // Footer
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 36, paddingVertical: 10, borderTopWidth: 1, borderTopColor: PDF_COLORS.border },
  footerLogo: { width: 60, height: 18, objectFit: 'contain' },
  footerText: { fontSize: 7.5, color: PDF_COLORS.textMuted },
})

// ── Document ────────────────────────────────────────────────────────────────
function QuotePDF({ salesOrder, lineItems, customer }: {
  salesOrder: any; lineItems: any[]; customer: any
}) {
  const soNum = `QT-${String(salesOrder.so_number || '').padStart(4, '0')}`
  const date = formatDate(salesOrder.so_date || salesOrder.created_at)
  const expiryDate = salesOrder.due_date
    ? formatDate(salesOrder.due_date)
    : addDays(salesOrder.so_date || salesOrder.created_at, 30)
  const terms = salesOrder.payment_terms || 'net_30'
  const requestedBy = customer?.name || 'Customer'

  const subtotal = salesOrder.subtotal || 0
  const discount = salesOrder.discount_amount || salesOrder.discount || 0
  const taxRate = salesOrder.tax_percent || salesOrder.tax_rate || 0
  const taxAmt = salesOrder.tax_amount || 0
  const total = salesOrder.total || 0
  const depositAmt = Math.min(total * 0.5, total)

  return React.createElement(Document, {
    title: `USA Wrap Co — Quote ${soNum}`,
    author: 'USA Wrap Co',
    subject: 'Quote',
  },
    React.createElement(Page, { size: 'LETTER', style: s.page },
      // Header: Logo left, Quote number right
      React.createElement(View, { style: s.headerRow },
        React.createElement(View, { style: s.logoArea },
          React.createElement(Image, { style: s.logo, src: BRAND.logoUrl }),
          React.createElement(Text, { style: s.companyName }, BRAND.name),
          React.createElement(Text, { style: s.companyInfo },
            `${BRAND.address}\n${BRAND.city}\n${BRAND.phone}\n${BRAND.website}`
          ),
        ),
        React.createElement(View, { style: s.quoteRight },
          React.createElement(Text, { style: s.quoteLabel }, 'QUOTE'),
          React.createElement(Text, { style: s.quoteNumber }, soNum),
        ),
      ),
      React.createElement(View, { style: s.accentLine }),

      // Meta row: Quote Date | Expiry Date | Terms | Requested By
      React.createElement(View, { style: s.metaRow },
        React.createElement(View, { style: s.metaCol },
          React.createElement(Text, { style: s.metaLabel }, 'Quote Date'),
          React.createElement(Text, { style: s.metaValue }, date),
        ),
        React.createElement(View, { style: s.metaCol },
          React.createElement(Text, { style: s.metaLabel }, 'Expiry Date'),
          React.createElement(Text, { style: s.metaValue }, expiryDate),
        ),
        React.createElement(View, { style: s.metaCol },
          React.createElement(Text, { style: s.metaLabel }, 'Terms'),
          React.createElement(Text, { style: s.metaValue }, terms.replace(/_/g, ' ').toUpperCase()),
        ),
        React.createElement(View, { style: s.metaCol },
          React.createElement(Text, { style: s.metaLabel }, 'Requested By'),
          React.createElement(Text, { style: s.metaValue }, requestedBy),
        ),
      ),

      // Billing
      React.createElement(View, { style: s.billingRow },
        React.createElement(View, { style: s.billingCol },
          React.createElement(Text, { style: s.sectionLabel }, 'Bill To'),
          React.createElement(Text, { style: s.billName }, customer?.name || 'Customer'),
          customer?.business_name && React.createElement(Text, { style: s.billText }, customer.company),
          customer?.phone && React.createElement(Text, { style: s.billText }, customer.phone),
          customer?.email && React.createElement(Text, { style: s.billEmail }, customer.email),
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

      // Line items table — Shopvox format
      React.createElement(View, { style: s.tableHeader },
        React.createElement(Text, { style: [s.th, s.colNum as any] }, '#'),
        React.createElement(Text, { style: [s.th, s.colItem as any] }, 'ITEM'),
        React.createElement(Text, { style: [s.th, s.colQty as any] }, 'QTY'),
        React.createElement(Text, { style: [s.th, s.colUom as any] }, 'UOM'),
        React.createElement(Text, { style: [s.th, s.colUPrice as any] }, 'U.PRICE'),
        React.createElement(Text, { style: [s.th, s.colDisc as any] }, 'DISC'),
        React.createElement(Text, { style: [s.th, s.colDiscPrice as any] }, 'DISC.PRICE'),
        React.createElement(Text, { style: [s.th, s.colTotal as any] }, 'TOTAL'),
        React.createElement(Text, { style: [s.th, s.colTaxable as any] }, 'TAXABLE'),
      ),
      ...lineItems.map((item, i) =>
        React.createElement(View, {
          key: item.id || i,
          style: [s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}] as any,
        },
          React.createElement(Text, { style: [s.tc, s.colNum as any] }, String(i + 1)),
          React.createElement(View, { style: s.colItem },
            React.createElement(Text, { style: s.tcBold }, item.name || 'Item'),
            item.description ? React.createElement(Text, { style: s.tcGray }, item.description) : null,
          ),
          React.createElement(Text, { style: [s.tc, s.colQty as any] }, String(item.quantity || 1)),
          React.createElement(Text, { style: [s.tc, s.colUom as any] }, 'EA'),
          React.createElement(Text, { style: [s.tc, s.colUPrice as any] }, formatCurrency(item.unit_price || 0)),
          React.createElement(Text, { style: [s.tc, s.colDisc as any] }, item.unit_discount > 0 ? formatCurrency(item.unit_discount) : '-'),
          React.createElement(Text, { style: [s.tc, s.colDiscPrice as any] },
            formatCurrency((item.unit_price || 0) - (item.unit_discount || 0))
          ),
          React.createElement(Text, { style: [s.tcBold, s.colTotal as any] }, formatCurrency(item.total_price || 0)),
          React.createElement(Text, { style: [s.tc, s.colTaxable as any] }, 'Y'),
        )
      ),

      // Totals — right aligned
      React.createElement(View, { style: s.totalsBlock },
        React.createElement(View, { style: s.totalsRow },
          React.createElement(Text, { style: s.totalsLabel }, 'Subtotal'),
          React.createElement(Text, { style: s.totalsValue }, formatCurrency(subtotal)),
        ),
        taxRate > 0 && React.createElement(View, { style: s.totalsRow },
          React.createElement(Text, { style: s.totalsLabel },
            `Sales Tax (${(taxRate * 100).toFixed(2)}%)`
          ),
          React.createElement(Text, { style: s.totalsValue }, formatCurrency(taxAmt)),
        ),
        React.createElement(View, { style: s.totalsLine }),
        React.createElement(View, { style: s.totalsFinalRow },
          React.createElement(Text, { style: s.totalsFinalLabel }, 'Total'),
          React.createElement(Text, { style: s.totalsFinalValue }, formatCurrency(total)),
        ),
        discount > 0 && React.createElement(View, { style: s.totalsRow },
          React.createElement(Text, { style: s.totalsLabel }, 'Customer Discount'),
          React.createElement(Text, { style: s.totalsAmber }, `-${formatCurrency(discount)}`),
        ),
        React.createElement(View, { style: s.depositRow },
          React.createElement(Text, { style: s.depositLabel }, 'Downpayment (50%)'),
          React.createElement(Text, { style: s.depositValue }, formatCurrency(depositAmt)),
        ),
      ),

      // Terms block
      React.createElement(View, { style: s.termsBox },
        React.createElement(Text, { style: s.termsTitle }, 'Terms & Conditions'),
        React.createElement(Text, { style: s.termsText },
          'This handcrafted quote is based on the specific information you have given us and is valid for 30 days. When you approve this quote you are agreeing to pay 100% of the quoted price. We require a 50% deposit to begin work on your project. Final payment is due upon completion/pickup of vehicle.'
        ),
      ),

      // Signature
      React.createElement(View, { style: s.sigSection },
        React.createElement(View, { style: s.sigRow },
          React.createElement(View, { style: s.sigBlock },
            React.createElement(View, { style: { ...s.sigLine, marginTop: 24 } }),
            React.createElement(Text, { style: s.sigLabel }, 'SIGNATURE'),
          ),
          React.createElement(View, { style: { ...s.sigBlock, flex: 0.4 } },
            React.createElement(View, { style: { ...s.sigLine, marginTop: 24 } }),
            React.createElement(Text, { style: s.sigLabel }, 'DATE'),
          ),
        ),
      ),

      // Footer
      React.createElement(View, { fixed: true, style: s.footer },
        React.createElement(Image, { style: s.footerLogo, src: BRAND.logoUrl }),
        React.createElement(Text, { style: s.footerText }, BRAND.tagline),
        React.createElement(Text, { style: s.footerText }, `${BRAND.phone} | ${BRAND.website}`),
      ),
    ),
  )
}

// ── Route Handler ─────────────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = getSupabaseAdmin()

    const { data: salesOrder, error } = await admin
      .from('sales_orders')
      .select('*, customer:customer_id(id, name, email, phone, business_name, address)')
      .eq('id', params.id)
      .single()

    if (error || !salesOrder) {
      return NextResponse.json({ error: 'Sales order not found' }, { status: 404 })
    }

    const { data: items } = await admin
      .from('line_items')
      .select('*')
      .eq('parent_type', 'sales_order')
      .eq('parent_id', params.id)
      .order('sort_order', { ascending: true })

    const lineItems = items || []
    const customer = salesOrder.customer || {}
    const soNum = `QT-${String(salesOrder.so_number || '').padStart(4, '0')}`

    const buffer = await renderToBuffer(
      React.createElement(QuotePDF, { salesOrder, lineItems, customer }) as any
    )

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="USA-Wrap-Co-Quote-${soNum}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: any) {
    console.error('[pdf/quote] error:', err)
    return NextResponse.json({ error: err.message || 'PDF generation failed' }, { status: 500 })
  }
}
