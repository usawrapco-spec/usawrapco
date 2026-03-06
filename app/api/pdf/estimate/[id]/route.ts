import { NextRequest, NextResponse } from 'next/server'
import React from 'react'

import {
  Document, Page, Text, View, StyleSheet, Image, renderToBuffer,
} from '@react-pdf/renderer'
import { registerPdfFonts } from '@/lib/pdf/fonts'

registerPdfFonts()
import { getSupabaseAdmin } from '@/lib/supabase/service'
import {
  BRAND, PDF_COLORS,
  formatCurrency, formatDate, addDays,
} from '@/lib/pdf/brand'
import { getPdfLogoSrc, getPdfLogoDarkSrc } from '@/lib/pdf/logo'

export const maxDuration = 60
export const runtime = 'nodejs'



// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: { fontFamily: 'Inter', fontSize: 9, color: PDF_COLORS.textPrimary, backgroundColor: PDF_COLORS.white, paddingBottom: 36 },
  // Header band — compact
  headerBand: { backgroundColor: PDF_COLORS.dark, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 32, paddingVertical: 16 },
  logo: { width: 72, height: 72, objectFit: 'contain' },
  headerRight: { alignItems: 'flex-end' },
  headerTitle: { fontFamily: 'BarlowCondensed', fontSize: 22, fontWeight: 700, color: PDF_COLORS.white, letterSpacing: 3 },
  headerMeta: { color: '#94a3b8', fontSize: 8, marginTop: 1 },
  headerMetaBold: { color: PDF_COLORS.white, fontSize: 9, marginTop: 1, fontWeight: 600 },
  headerMetaAmber: { color: PDF_COLORS.amber, fontSize: 8, marginTop: 1 },
  accentLine: { height: 2, backgroundColor: PDF_COLORS.accent },
  // Body
  body: { padding: '16px 32px' },
  // Billing section — compact inline
  billingRow: { flexDirection: 'row', marginBottom: 12 },
  billingCol: { flex: 1 },
  sectionLabel: { fontSize: 7, fontWeight: 700, color: PDF_COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 3 },
  billName: { fontSize: 12, fontWeight: 700, marginBottom: 1 },
  billText: { fontSize: 9, color: PDF_COLORS.textSecondary, lineHeight: 1.3 },
  billEmail: { fontSize: 9, color: PDF_COLORS.accent },
  divider: { borderBottomWidth: 1, borderBottomColor: PDF_COLORS.border, marginVertical: 8 },
  // Vehicle — single compact row
  vehicleCard: { backgroundColor: PDF_COLORS.lightGray, borderRadius: 6, padding: '8px 12px', marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  vehicleMain: { fontSize: 11, fontWeight: 700 },
  vehicleMeta: { fontSize: 8, color: PDF_COLORS.textSecondary },
  // Table — tighter
  tableHeader: { flexDirection: 'row', backgroundColor: PDF_COLORS.darkAlt, paddingHorizontal: 8, paddingVertical: 5 },
  tableHeaderCell: { color: PDF_COLORS.white, fontSize: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: PDF_COLORS.border },
  tableRowAlt: { backgroundColor: PDF_COLORS.lightGray },
  tableCell: { fontSize: 9 },
  tableCellBold: { fontSize: 9, fontWeight: 700 },
  tableCellGray: { fontSize: 8, color: PDF_COLORS.textSecondary, marginTop: 1 },
  accentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, backgroundColor: PDF_COLORS.accent },
  // Col widths
  colDesc: { width: '35%', paddingLeft: 6, position: 'relative' },
  colCoverage: { width: '20%' },
  colMaterial: { width: '15%' },
  colHrs: { width: '8%', textAlign: 'center' },
  colUnit: { width: '12%', textAlign: 'right' },
  colTotal: { width: '10%', textAlign: 'right' },
  // Totals — compact right-aligned
  totalsBlock: { alignItems: 'flex-end', marginTop: 6, marginBottom: 10 },
  totalsRow: { flexDirection: 'row', width: 220, justifyContent: 'space-between', marginBottom: 2 },
  totalsLabel: { fontSize: 9, color: PDF_COLORS.textSecondary },
  totalsValue: { fontSize: 9, fontWeight: 600 },
  totalsDiscount: { fontSize: 9, color: PDF_COLORS.amber, fontWeight: 600 },
  totalsLine: { borderBottomWidth: 1, borderBottomColor: PDF_COLORS.border, width: 220, marginVertical: 4 },
  totalsFinalRow: { flexDirection: 'row', width: 220, justifyContent: 'space-between', marginBottom: 2 },
  totalsFinalLabel: { fontSize: 12, fontWeight: 700 },
  totalsFinalValue: { fontSize: 12, fontWeight: 700 },
  totalsDepositRow: { flexDirection: 'row', width: 220, justifyContent: 'space-between', marginTop: 4 },
  totalsDepositLabel: { fontSize: 9, color: PDF_COLORS.accent, fontWeight: 600 },
  totalsDepositValue: { fontSize: 9, color: PDF_COLORS.accent, fontWeight: 700 },
  totalsDepositNote: { fontSize: 7, color: PDF_COLORS.textMuted },
  // Next steps — compact side by side
  nextStepsRow: { flexDirection: 'row', marginTop: 8, marginBottom: 8 },
  card: { flex: 1, padding: 10, borderRadius: 5, borderWidth: 1, borderColor: PDF_COLORS.border, marginHorizontal: 3 },
  cardGreen: { borderLeftWidth: 3, borderLeftColor: PDF_COLORS.green },
  cardPurple: { borderLeftWidth: 3, borderLeftColor: PDF_COLORS.purple },
  cardTitle: { fontSize: 9, fontWeight: 700, marginBottom: 2 },
  cardText: { fontSize: 7.5, color: PDF_COLORS.textSecondary, lineHeight: 1.3 },
  cardPrice: { fontSize: 14, fontWeight: 700, color: PDF_COLORS.accent, marginTop: 2 },
  cardLink: { fontSize: 7.5, color: PDF_COLORS.accent, marginTop: 1 },
  // Terms — compact inline
  termsTitle: { fontFamily: 'BarlowCondensed', fontSize: 10, fontWeight: 700, marginBottom: 4 },
  termText: { fontSize: 7, color: PDF_COLORS.textSecondary, lineHeight: 1.4 },
  // Footer
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 32, paddingVertical: 8, borderTopWidth: 1, borderTopColor: PDF_COLORS.border },
  footerLogo: { width: 50, height: 16, objectFit: 'contain' },
  footerTagline: { fontSize: 7, color: PDF_COLORS.textMuted },
  footerRight: { fontSize: 7, color: PDF_COLORS.textSecondary, textAlign: 'right' },
})

// ── Helper components ─────────────────────────────────────────────────────────
function Header({ type, number, date, validUntil }: {
  type: string; number: string; date: string; validUntil?: string
}) {
  return React.createElement(View, null,
    React.createElement(View, { style: s.headerBand },
      React.createElement(Image, { style: s.logo, src: getPdfLogoDarkSrc() }),
      React.createElement(View, { style: s.headerRight },
        React.createElement(Text, { style: s.headerTitle }, type),
        React.createElement(Text, { style: s.headerMetaBold }, number),
        React.createElement(Text, { style: s.headerMeta }, `Date: ${date}`),
        validUntil && React.createElement(Text, { style: s.headerMetaAmber }, `Valid Until: ${validUntil}`),
      ),
    ),
    React.createElement(View, { style: s.accentLine }),
  )
}

function Footer() {
  return React.createElement(View, { style: s.footer },
    React.createElement(Image, { style: s.footerLogo, src: getPdfLogoSrc() }),
    React.createElement(Text, { style: s.footerTagline }, BRAND.tagline),
    React.createElement(Text, { style: s.footerRight }, BRAND.phone),
  )
}

function BillingSection({ estimate }: { estimate: any }) {
  const customer = estimate.customer || {}
  const custLines = [
    customer.name || 'Customer',
    customer.business_name || customer.company_name || '',
    customer.phone || '',
    customer.email || '',
  ].filter(Boolean)

  const brandLines = [
    BRAND.name,
    BRAND.address,
    BRAND.city,
    BRAND.phone,
    BRAND.email,
  ]

  return React.createElement(View, { style: s.billingRow },
    React.createElement(View, { style: s.billingCol },
      React.createElement(Text, { style: s.sectionLabel }, 'Prepared For'),
      React.createElement(Text, { style: s.billName }, custLines[0]),
      ...custLines.slice(1).map((line, i) =>
        React.createElement(Text, { key: i, style: line.includes('@') ? s.billEmail : s.billText }, line)
      ),
    ),
    React.createElement(View, { style: s.billingCol },
      React.createElement(Text, { style: s.sectionLabel }, 'From'),
      React.createElement(Text, { style: s.billName }, brandLines[0]),
      ...brandLines.slice(1).map((line, i) =>
        React.createElement(Text, { key: i, style: line.includes('@') ? s.billEmail : s.billText }, line)
      ),
    ),
  )
}

function VehicleCard({ estimate }: { estimate: any }) {
  const fd = estimate.form_data || {}
  const year = fd.vehicleYear || fd.year || ''
  const make = fd.vehicleMake || fd.make || ''
  const model = fd.vehicleModel || fd.model || ''
  const vin = fd.vin || fd.vehicleVin || ''
  const color = fd.vehicleColor || fd.color || ''
  const coverage = fd.wrapType || fd.coverageType || ''
  const vehicle = [year, make, model].filter(Boolean).join(' ') || 'Vehicle not specified'
  const details = [
    vin && `VIN: ${vin}`,
    color && `Color: ${color}`,
    coverage && `Coverage: ${coverage}`,
  ].filter(Boolean).join('  |  ')

  return React.createElement(View, { style: s.vehicleCard },
    React.createElement(View, null,
      React.createElement(Text, { style: s.vehicleMain }, vehicle),
      details ? React.createElement(Text, { style: s.vehicleMeta }, details) : null,
    ),
  )
}

function LineItemsTable({ lineItems }: { lineItems: any[] }) {
  return React.createElement(View, { style: { marginBottom: 4 } },
    React.createElement(View, { style: s.tableHeader },
      React.createElement(Text, { style: [s.tableHeaderCell, s.colDesc as any] }, 'Description'),
      React.createElement(Text, { style: [s.tableHeaderCell, s.colCoverage as any] }, 'Coverage / Details'),
      React.createElement(Text, { style: [s.tableHeaderCell, s.colMaterial as any] }, 'Material'),
      React.createElement(Text, { style: [s.tableHeaderCell, s.colHrs as any] }, 'Hrs'),
      React.createElement(Text, { style: [s.tableHeaderCell, s.colUnit as any] }, 'Unit Price'),
      React.createElement(Text, { style: [s.tableHeaderCell, s.colTotal as any] }, 'Total'),
    ),
    ...lineItems.map((item, i) => {
      const specs = item.specs || {}
      return React.createElement(View, {
        key: item.id || i,
        wrap: false,
        style: [s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}] as any,
      },
        React.createElement(View, { style: s.colDesc },
          React.createElement(View, { style: s.accentBar }),
          React.createElement(Text, { style: s.tableCellBold }, item.name || 'Item'),
          item.description ? React.createElement(Text, { style: s.tableCellGray }, item.description) : null,
        ),
        React.createElement(View, { style: s.colCoverage },
          React.createElement(Text, { style: s.tableCell },
            specs.wrapType || specs.coverageType || specs.customerDescription || '—'
          ),
        ),
        React.createElement(View, { style: s.colMaterial },
          React.createElement(Text, { style: s.tableCell },
            specs.vinylType || specs.material || '—'
          ),
        ),
        React.createElement(View, { style: s.colHrs },
          React.createElement(Text, { style: s.tableCell },
            specs.laborHours || specs.estimatedHours ? String(specs.laborHours || specs.estimatedHours) : '—'
          ),
        ),
        React.createElement(View, { style: s.colUnit },
          React.createElement(Text, { style: s.tableCell }, formatCurrency(item.unit_price || 0)),
        ),
        React.createElement(View, { style: s.colTotal },
          React.createElement(Text, { style: s.tableCellBold }, formatCurrency(item.total_price || 0)),
        ),
      )
    }),
  )
}

function TotalsBlock({ estimate }: { estimate: any }) {
  const subtotal = estimate.subtotal || 0
  const discount = estimate.discount || 0
  const taxAmt = estimate.tax_amount || 0
  const total = estimate.total || 0
  const deposit = total * 0.5
  const balance = total - deposit

  return React.createElement(View, { style: s.totalsBlock },
    React.createElement(View, { style: s.totalsRow },
      React.createElement(Text, { style: s.totalsLabel }, 'Subtotal'),
      React.createElement(Text, { style: s.totalsValue }, formatCurrency(subtotal)),
    ),
    discount > 0 && React.createElement(View, { style: s.totalsRow },
      React.createElement(Text, { style: s.totalsLabel }, 'Discount'),
      React.createElement(Text, { style: s.totalsDiscount }, `-${formatCurrency(discount)}`),
    ),
    React.createElement(View, { style: s.totalsRow },
      React.createElement(Text, { style: s.totalsLabel },
        `Tax (${((estimate.tax_rate || 0) * 100).toFixed(2)}%)`
      ),
      React.createElement(Text, { style: s.totalsValue }, formatCurrency(taxAmt)),
    ),
    React.createElement(View, { style: s.totalsLine }),
    React.createElement(View, { style: s.totalsFinalRow },
      React.createElement(Text, { style: s.totalsFinalLabel }, 'TOTAL'),
      React.createElement(Text, { style: s.totalsFinalValue }, formatCurrency(total)),
    ),
    React.createElement(View, { style: s.totalsLine }),
    React.createElement(View, { style: s.totalsDepositRow },
      React.createElement(Text, { style: s.totalsDepositLabel }, '50% Deposit Due'),
      React.createElement(Text, { style: s.totalsDepositValue }, formatCurrency(deposit)),
    ),
    React.createElement(View, { style: { ...s.totalsRow, marginTop: 2 } },
      React.createElement(Text, { style: s.totalsLabel }, 'Balance Due on Delivery'),
      React.createElement(Text, { style: s.totalsValue }, formatCurrency(balance)),
    ),
  )
}

function NextStepsSection({ estimate }: { estimate: any }) {
  const deposit = (estimate.total || 0) * 0.5
  return React.createElement(View, { style: s.nextStepsRow },
    React.createElement(View, { style: [s.card, s.cardGreen] as any },
      React.createElement(Text, { style: s.cardTitle }, 'Schedule With This Design'),
      React.createElement(Text, { style: s.cardText }, '50% deposit secures your install date'),
      React.createElement(Text, { style: s.cardText }, 'Fast turnaround — as little as 5 business days'),
      React.createElement(Text, { style: s.cardPrice }, formatCurrency(deposit)),
      React.createElement(Text, { style: s.cardLink }, 'Pay Online: usawrapco.com/pay'),
    ),
    React.createElement(View, { style: [s.card, s.cardPurple] as any },
      React.createElement(Text, { style: s.cardTitle }, 'Custom Design Package — $1,000'),
      React.createElement(Text, { style: s.cardText }, 'Work 1-on-1 with our designer + AI mockup creator'),
      React.createElement(Text, { style: s.cardText }, 'Applied toward your total if you book'),
      React.createElement(Text, { style: s.cardText }, '3 unique design concepts included'),
      React.createElement(Text, { style: s.cardLink }, 'sales@usawrapco.com'),
    ),
  )
}

function TermsSection() {
  return React.createElement(View, { style: { marginTop: 4 } },
    React.createElement(Text, { style: s.termText },
      'This estimate is valid for 30 days. A 50% deposit is required to schedule. Full terms & conditions will be provided at signing.'
    ),
  )
}

// ── Document ──────────────────────────────────────────────────────────────────
function EstimatePDF({ estimate, lineItems }: { estimate: any; lineItems: any[] }) {
  const estNumber = `EST-${String(estimate.estimate_number || '').padStart(4, '0')}`
  const date = formatDate(estimate.quote_date || estimate.created_at)
  const validUntil = estimate.due_date ? formatDate(estimate.due_date) : addDays(estimate.quote_date || estimate.created_at, 30)

  return React.createElement(Document, {
    title: `USA Wrap Co — ${estNumber}`,
    author: 'USA Wrap Co',
    subject: 'Vehicle Wrap Estimate',
  },
    React.createElement(Page, { size: 'LETTER', style: s.page },
      React.createElement(Header, { type: 'ESTIMATE', number: estNumber, date, validUntil }),
      React.createElement(View, { style: s.body },
        React.createElement(BillingSection, { estimate }),
        React.createElement(VehicleCard, { estimate }),
        React.createElement(LineItemsTable, { lineItems }),
        React.createElement(TotalsBlock, { estimate }),
        React.createElement(View, { style: s.divider }),
        React.createElement(NextStepsSection, { estimate }),
        React.createElement(TermsSection, null),
      ),
      React.createElement(View, { fixed: true, style: { position: 'absolute', bottom: 0, left: 0, right: 0 } },
        React.createElement(Footer, null),
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

    const { data: estimate, error } = await admin
      .from('estimates')
      .select('*, customer:customer_id(id, name, email, phone, business_name, company_name, address)')
      .eq('id', params.id)
      .single()

    if (error || !estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })
    }

    const { data: items } = await admin
      .from('line_items')
      .select('*')
      .eq('parent_type', 'estimate')
      .eq('parent_id', params.id)
      .order('sort_order', { ascending: true })

    const lineItems = items || []
    const estNumber = `EST-${String(estimate.estimate_number || '').padStart(4, '0')}`
    const safeName = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    const customerSlug = safeName((estimate.customer as any)?.name || '')

    const buffer = await renderToBuffer(
      React.createElement(EstimatePDF, { estimate, lineItems }) as any
    )

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="USA-Wrap-Co-Estimate-${estNumber}${customerSlug ? `-${customerSlug}` : ''}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: any) {
    console.error('[pdf/estimate] error:', err)
    return NextResponse.json({ error: err.message || 'PDF generation failed' }, { status: 500 })
  }
}
