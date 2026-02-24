import { NextRequest, NextResponse } from 'next/server'
import React from 'react'
import {
  Document, Page, Text, View, StyleSheet, Font, Image, renderToBuffer,
} from '@react-pdf/renderer'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import {
  BRAND, PDF_COLORS, PDF_TERMS,
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

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: { fontFamily: 'Inter', fontSize: 10, color: PDF_COLORS.textPrimary, backgroundColor: PDF_COLORS.white },
  // Header band
  headerBand: { backgroundColor: PDF_COLORS.dark, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 36, paddingVertical: 20 },
  logo: { width: 140, height: 45, objectFit: 'contain' },
  headerRight: { alignItems: 'flex-end' },
  headerTitle: { fontFamily: 'BarlowCondensed', fontSize: 26, fontWeight: 700, color: PDF_COLORS.white, letterSpacing: 3 },
  headerMeta: { color: '#94a3b8', fontSize: 10, marginTop: 2 },
  headerMetaBold: { color: PDF_COLORS.white, fontSize: 11, marginTop: 2, fontWeight: 600 },
  headerMetaAmber: { color: PDF_COLORS.amber, fontSize: 10, marginTop: 1 },
  accentLine: { height: 3, backgroundColor: PDF_COLORS.accent },
  // Body
  body: { padding: '24px 36px' },
  // Billing section
  billingRow: { flexDirection: 'row', marginBottom: 20 },
  billingCol: { flex: 1 },
  sectionLabel: { fontSize: 8, fontWeight: 700, color: PDF_COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 },
  billName: { fontSize: 16, fontWeight: 700, marginBottom: 2 },
  billSub: { fontSize: 12, fontWeight: 600, marginBottom: 1 },
  billText: { fontSize: 11, color: PDF_COLORS.textSecondary, marginBottom: 1 },
  billEmail: { fontSize: 11, color: PDF_COLORS.accent, marginBottom: 1 },
  divider: { borderBottomWidth: 1, borderBottomColor: PDF_COLORS.border, marginVertical: 16 },
  // Vehicle card
  vehicleCard: { backgroundColor: PDF_COLORS.lightGray, borderRadius: 8, padding: 14, marginBottom: 20 },
  vehicleRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  vehicleMain: { fontSize: 16, fontWeight: 700, marginTop: 4 },
  vehicleMeta: { fontSize: 11, color: PDF_COLORS.textSecondary, marginRight: 16, marginTop: 3 },
  // Table
  tableHeader: { flexDirection: 'row', backgroundColor: PDF_COLORS.darkAlt, paddingHorizontal: 8, paddingVertical: 7 },
  tableHeaderCell: { color: PDF_COLORS.white, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: PDF_COLORS.border },
  tableRowAlt: { backgroundColor: PDF_COLORS.lightGray },
  tableCell: { fontSize: 10 },
  tableCellBold: { fontSize: 10, fontWeight: 700 },
  tableCellGray: { fontSize: 9, color: PDF_COLORS.textSecondary, marginTop: 1 },
  accentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: PDF_COLORS.accent },
  // Col widths
  colDesc: { width: '30%', paddingLeft: 8, position: 'relative' },
  colCoverage: { width: '25%' },
  colMaterial: { width: '15%' },
  colHrs: { width: '8%', textAlign: 'center' },
  colUnit: { width: '12%', textAlign: 'right' },
  colTotal: { width: '10%', textAlign: 'right' },
  // Totals
  totalsBlock: { alignItems: 'flex-end', marginTop: 8, marginBottom: 20 },
  totalsRow: { flexDirection: 'row', width: 260, justifyContent: 'space-between', marginBottom: 4 },
  totalsLabel: { fontSize: 11, color: PDF_COLORS.textSecondary },
  totalsValue: { fontSize: 11, fontWeight: 600 },
  totalsDiscount: { fontSize: 11, color: PDF_COLORS.amber, fontWeight: 600 },
  totalsLine: { borderBottomWidth: 1, borderBottomColor: PDF_COLORS.border, width: 260, marginVertical: 6 },
  totalsFinalRow: { flexDirection: 'row', width: 260, justifyContent: 'space-between', marginBottom: 4 },
  totalsFinalLabel: { fontSize: 14, fontWeight: 700 },
  totalsFinalValue: { fontSize: 14, fontWeight: 700 },
  totalsDepositRow: { flexDirection: 'row', width: 260, justifyContent: 'space-between', marginTop: 6 },
  totalsDepositLabel: { fontSize: 11, color: PDF_COLORS.accent, fontWeight: 600 },
  totalsDepositValue: { fontSize: 11, color: PDF_COLORS.accent, fontWeight: 700 },
  totalsDepositNote: { fontSize: 8, color: PDF_COLORS.textMuted, marginLeft: 4, marginTop: 1 },
  // Next steps cards
  nextStepsRow: { flexDirection: 'row', marginTop: 16, marginBottom: 20 },
  card: { flex: 1, padding: 14, borderRadius: 6, borderWidth: 1, borderColor: PDF_COLORS.border, marginHorizontal: 4 },
  cardGreen: { borderLeftWidth: 4, borderLeftColor: PDF_COLORS.green },
  cardPurple: { borderLeftWidth: 4, borderLeftColor: PDF_COLORS.purple },
  cardTitle: { fontSize: 12, fontWeight: 700, marginBottom: 4 },
  cardText: { fontSize: 9, color: PDF_COLORS.textSecondary, marginBottom: 3, lineHeight: 1.4 },
  cardPrice: { fontSize: 18, fontWeight: 700, color: PDF_COLORS.accent, marginTop: 4 },
  cardLink: { fontSize: 9, color: PDF_COLORS.accent, marginTop: 2 },
  // Footer
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 36, paddingVertical: 10, borderTopWidth: 1, borderTopColor: PDF_COLORS.border },
  footerLogo: { width: 70, height: 22, objectFit: 'contain' },
  footerTagline: { fontSize: 8, color: PDF_COLORS.textMuted, fontStyle: 'italic' },
  footerRight: { fontSize: 8, color: PDF_COLORS.textSecondary, textAlign: 'right' },
  // Page 2
  aboutSection: { flexDirection: 'row', marginBottom: 20 },
  aboutLeft: { flex: 1, paddingRight: 16 },
  aboutRight: { width: 180 },
  aboutTitle: { fontFamily: 'BarlowCondensed', fontSize: 18, fontWeight: 700, marginBottom: 10 },
  bulletItem: { flexDirection: 'row', marginBottom: 5 },
  bulletDot: { fontSize: 10, color: PDF_COLORS.accent, marginRight: 6, fontWeight: 700 },
  bulletText: { fontSize: 10, color: PDF_COLORS.textSecondary, flex: 1, lineHeight: 1.4 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  photoBox: { width: 56, height: 42, backgroundColor: PDF_COLORS.lightGray, borderRadius: 4 },
  // Terms
  termsTitle: { fontFamily: 'BarlowCondensed', fontSize: 14, fontWeight: 700, marginBottom: 8, marginTop: 16 },
  termItem: { flexDirection: 'row', marginBottom: 4 },
  termText: { fontSize: 8.5, color: PDF_COLORS.textSecondary, flex: 1, lineHeight: 1.5 },
  // Signature
  sigSection: { marginTop: 20 },
  sigText: { fontSize: 9, color: PDF_COLORS.textSecondary, marginBottom: 16, lineHeight: 1.4 },
  sigRow: { flexDirection: 'row', marginBottom: 16 },
  sigBlock: { flex: 1, marginRight: 20 },
  sigLine: { borderBottomWidth: 1, borderBottomColor: PDF_COLORS.textPrimary, marginBottom: 4 },
  sigLabel: { fontSize: 8, color: PDF_COLORS.textMuted },
})

// ── Helper components ─────────────────────────────────────────────────────────
function Header({ type, number, date, validUntil }: {
  type: string; number: string; date: string; validUntil?: string
}) {
  return React.createElement(View, null,
    React.createElement(View, { style: s.headerBand },
      React.createElement(Image, { style: s.logo, src: BRAND.logoUrl }),
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

function Footer({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) {
  return React.createElement(View, { style: s.footer },
    React.createElement(Image, { style: s.footerLogo, src: BRAND.logoUrl }),
    React.createElement(Text, { style: s.footerTagline }, BRAND.tagline),
    React.createElement(Text, { style: s.footerRight },
      `Page ${pageNumber} of ${totalPages}  |  ${BRAND.phone}`
    ),
  )
}

function BillingSection({ estimate }: { estimate: any }) {
  const customer = estimate.customer || {}
  return React.createElement(View, { style: s.billingRow },
    // LEFT — Prepared For
    React.createElement(View, { style: s.billingCol },
      React.createElement(Text, { style: s.sectionLabel }, 'Prepared For'),
      React.createElement(Text, { style: s.billName }, customer.name || customer.contact_name || 'Customer'),
      customer.company || customer.company_name
        ? React.createElement(Text, { style: s.billSub }, customer.company || customer.company_name)
        : null,
      customer.phone && React.createElement(Text, { style: s.billText }, customer.phone),
      customer.email && React.createElement(Text, { style: s.billEmail }, customer.email),
      customer.address && React.createElement(Text, { style: s.billText }, customer.address),
    ),
    // RIGHT — From
    React.createElement(View, { style: s.billingCol },
      React.createElement(Text, { style: s.sectionLabel }, 'From'),
      React.createElement(Text, { style: s.billName }, BRAND.name),
      React.createElement(Text, { style: s.billText }, BRAND.address),
      React.createElement(Text, { style: s.billText }, BRAND.city),
      React.createElement(Text, { style: s.billText }, BRAND.phone),
      React.createElement(Text, { style: s.billEmail }, BRAND.email),
      React.createElement(Text, { style: s.billText }, BRAND.website),
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
  const material = fd.vinylType || fd.material || ''
  const sqft = fd.vinylArea || fd.sqft || ''

  return React.createElement(View, { style: s.vehicleCard },
    React.createElement(Text, { style: s.sectionLabel }, 'Vehicle Details'),
    React.createElement(Text, { style: s.vehicleMain },
      [year, make, model].filter(Boolean).join(' ') || 'Vehicle not specified'
    ),
    React.createElement(View, { style: s.vehicleRow },
      vin && React.createElement(Text, { style: s.vehicleMeta }, `VIN: ${vin}`),
      color && React.createElement(Text, { style: s.vehicleMeta }, `Color: ${color}`),
      coverage && React.createElement(Text, { style: s.vehicleMeta }, `Coverage: ${coverage}`),
    ),
    React.createElement(View, { style: s.vehicleRow },
      material && React.createElement(Text, { style: s.vehicleMeta }, `Material: ${material}`),
      sqft && React.createElement(Text, { style: s.vehicleMeta }, `Est. Sqft: ${sqft}`),
    ),
  )
}

function LineItemsTable({ lineItems }: { lineItems: any[] }) {
  return React.createElement(View, { style: { marginBottom: 16 } },
    // Table header
    React.createElement(View, { style: s.tableHeader },
      React.createElement(Text, { style: [s.tableHeaderCell, s.colDesc as any] }, 'Description'),
      React.createElement(Text, { style: [s.tableHeaderCell, s.colCoverage as any] }, 'Coverage / Details'),
      React.createElement(Text, { style: [s.tableHeaderCell, s.colMaterial as any] }, 'Material'),
      React.createElement(Text, { style: [s.tableHeaderCell, s.colHrs as any] }, 'Hrs'),
      React.createElement(Text, { style: [s.tableHeaderCell, s.colUnit as any] }, 'Unit Price'),
      React.createElement(Text, { style: [s.tableHeaderCell, s.colTotal as any] }, 'Total'),
    ),
    // Rows
    ...lineItems.map((item, i) => {
      const specs = item.specs || {}
      const vehicle = [specs.vehicleYear, specs.vehicleMake, specs.vehicleModel].filter(Boolean).join(' ')
      return React.createElement(View, {
        key: item.id || i,
        style: [s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}] as any,
      },
        React.createElement(View, { style: s.colDesc },
          React.createElement(View, { style: s.accentBar }),
          React.createElement(Text, { style: s.tableCellBold }, item.name || 'Item'),
          vehicle ? React.createElement(Text, { style: s.tableCellGray }, vehicle) : null,
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
      React.createElement(View, null,
        React.createElement(Text, { style: s.totalsDepositLabel }, '50% Deposit Due'),
        React.createElement(Text, { style: s.totalsDepositNote }, 'Required to schedule'),
      ),
      React.createElement(Text, { style: s.totalsDepositValue }, formatCurrency(deposit)),
    ),
    React.createElement(View, { style: { ...s.totalsRow, marginTop: 4 } },
      React.createElement(Text, { style: s.totalsLabel }, 'Balance at Pickup'),
      React.createElement(Text, { style: s.totalsValue }, formatCurrency(balance)),
    ),
  )
}

function NextStepsSection({ estimate }: { estimate: any }) {
  const deposit = (estimate.total || 0) * 0.5
  return React.createElement(View, null,
    React.createElement(Text, { style: { ...s.sectionLabel, marginBottom: 8 } }, 'Next Steps'),
    React.createElement(View, { style: s.nextStepsRow },
      // Card A
      React.createElement(View, { style: [s.card, s.cardGreen] as any },
        React.createElement(Text, { style: s.cardTitle }, 'Schedule With This Design'),
        React.createElement(Text, { style: s.cardText }, '50% deposit secures your install date'),
        React.createElement(Text, { style: s.cardText }, 'Fast turnaround — as little as 5 business days'),
        React.createElement(Text, { style: s.cardPrice }, formatCurrency(deposit)),
        React.createElement(Text, { style: s.cardLink }, 'Pay Online: usawrapco.com/pay'),
      ),
      // Card B
      React.createElement(View, { style: [s.card, s.cardPurple] as any },
        React.createElement(Text, { style: s.cardTitle }, 'Custom Design Package — $1,000'),
        React.createElement(Text, { style: s.cardText }, 'Work 1-on-1 with our designer + AI mockup creator'),
        React.createElement(Text, { style: s.cardText }, 'Applied toward your total if you book'),
        React.createElement(Text, { style: s.cardText }, '3 unique design concepts included'),
        React.createElement(Text, { style: s.cardLink }, 'sales@usawrapco.com'),
      ),
    ),
  )
}

function AboutSection() {
  const bullets = [
    'Premium materials — Avery, 3M, and Arlon vinyl',
    "Expert installation team — Pacific Northwest's #1",
    'Design-to-installation in as little as 5 business days',
    '5-star rated on Google — 95+ reviews',
    'Locally owned and operated in Gig Harbor, WA',
    'Full warranty on all installations',
  ]
  return React.createElement(View, { style: s.aboutSection },
    React.createElement(View, { style: s.aboutLeft },
      React.createElement(Text, { style: s.aboutTitle }, 'Why USA Wrap Co?'),
      ...bullets.map((b, i) =>
        React.createElement(View, { key: i, style: s.bulletItem },
          React.createElement(Text, { style: s.bulletDot }, '•'),
          React.createElement(Text, { style: s.bulletText }, b),
        )
      ),
    ),
    React.createElement(View, { style: s.aboutRight },
      React.createElement(Text, { style: { ...s.sectionLabel, marginBottom: 6 } }, 'Our Work'),
      React.createElement(View, { style: s.photoGrid },
        ...[0, 1, 2].map(i =>
          React.createElement(View, { key: i, style: s.photoBox })
        ),
      ),
    ),
  )
}

function TermsSection() {
  return React.createElement(View, null,
    React.createElement(View, { style: s.divider }),
    React.createElement(Text, { style: s.termsTitle }, 'Terms & Conditions'),
    ...PDF_TERMS.map((term, i) =>
      React.createElement(View, { key: i, style: s.termItem },
        React.createElement(Text, { style: { ...s.termText, marginRight: 4, color: PDF_COLORS.accent } }, '•'),
        React.createElement(Text, { style: s.termText }, term),
      )
    ),
  )
}

function SignatureSection() {
  return React.createElement(View, { style: s.sigSection },
    React.createElement(View, { style: s.divider }),
    React.createElement(Text, { style: s.sigText },
      'By signing below, customer acknowledges and agrees to the above terms.'
    ),
    React.createElement(View, { style: s.sigRow },
      React.createElement(View, { style: s.sigBlock },
        React.createElement(View, { style: { ...s.sigLine, marginBottom: 4 } }),
        React.createElement(Text, { style: s.sigLabel }, 'Customer Signature'),
      ),
      React.createElement(View, { style: { ...s.sigBlock, flex: 0.4 } },
        React.createElement(View, { style: { ...s.sigLine, marginBottom: 4 } }),
        React.createElement(Text, { style: s.sigLabel }, 'Date'),
      ),
    ),
    React.createElement(View, { style: { ...s.sigBlock, width: '45%' } },
      React.createElement(View, { style: { ...s.sigLine, marginBottom: 4 } }),
      React.createElement(Text, { style: s.sigLabel }, 'Printed Name'),
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
    // Page 1
    React.createElement(Page, { size: 'LETTER', style: s.page },
      React.createElement(Header, { type: 'ESTIMATE', number: estNumber, date, validUntil }),
      React.createElement(View, { style: s.body },
        React.createElement(BillingSection, { estimate }),
        React.createElement(View, { style: s.divider }),
        React.createElement(VehicleCard, { estimate }),
        React.createElement(LineItemsTable, { lineItems }),
        React.createElement(TotalsBlock, { estimate }),
        React.createElement(View, { style: s.divider }),
        React.createElement(NextStepsSection, { estimate }),
      ),
      React.createElement(View, { fixed: true, style: { position: 'absolute', bottom: 0, left: 0, right: 0 } },
        React.createElement(Footer, { pageNumber: 1, totalPages: 2 }),
      ),
    ),
    // Page 2 — About + Terms
    React.createElement(Page, { size: 'LETTER', style: s.page },
      React.createElement(Header, { type: 'ESTIMATE', number: estNumber, date }),
      React.createElement(View, { style: s.body },
        React.createElement(AboutSection, null),
        React.createElement(TermsSection, null),
        React.createElement(SignatureSection, null),
      ),
      React.createElement(View, { fixed: true, style: { position: 'absolute', bottom: 0, left: 0, right: 0 } },
        React.createElement(Footer, { pageNumber: 2, totalPages: 2 }),
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
      .select('*, customer:customer_id(id, name, email, phone, company, company_name, contact_name, address)')
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

    const buffer = await renderToBuffer(
      React.createElement(EstimatePDF, { estimate, lineItems })
    )

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="USA-Wrap-Co-Estimate-${estNumber}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: any) {
    console.error('[pdf/estimate] error:', err)
    return NextResponse.json({ error: err.message || 'PDF generation failed' }, { status: 500 })
  }
}
