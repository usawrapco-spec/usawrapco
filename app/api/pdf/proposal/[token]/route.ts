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
  // ── Cover Page ──
  coverPage: { fontFamily: 'Inter', backgroundColor: PDF_COLORS.dark, flex: 1 },
  coverContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 60 },
  coverLogo: { width: 200, height: 66, objectFit: 'contain', marginBottom: 40 },
  coverDividerTop: { width: 60, height: 3, backgroundColor: PDF_COLORS.accent, marginBottom: 32 },
  coverTitle: { fontFamily: 'BarlowCondensed', fontSize: 36, fontWeight: 700, color: PDF_COLORS.white, letterSpacing: 4, textAlign: 'center', marginBottom: 8 },
  coverSubtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 16 },
  coverCustomer: { fontSize: 22, fontWeight: 700, color: PDF_COLORS.white, textAlign: 'center', marginBottom: 6 },
  coverBusiness: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 32 },
  coverMeta: { flexDirection: 'row', marginTop: 20 },
  coverMetaItem: { alignItems: 'center', marginHorizontal: 24 },
  coverMetaLabel: { fontSize: 8, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  coverMetaValue: { fontSize: 12, color: '#94a3b8' },
  coverBottom: { backgroundColor: '#0a0f1a', paddingHorizontal: 40, paddingVertical: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  coverBottomLine: { height: 2, backgroundColor: PDF_COLORS.accent },
  coverTagline: { fontSize: 11, color: '#64748b', fontStyle: 'italic' },
  coverContact: { fontSize: 10, color: '#475569' },
  // ── Content pages ──
  page: { fontFamily: 'Inter', fontSize: 10, color: PDF_COLORS.textPrimary, backgroundColor: PDF_COLORS.white },
  headerBand: { backgroundColor: PDF_COLORS.dark, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 36, paddingVertical: 22 },
  logo: { width: 140, height: 45, objectFit: 'contain' },
  headerRight: { alignItems: 'flex-end' },
  headerTitle: { fontFamily: 'BarlowCondensed', fontSize: 26, fontWeight: 700, color: PDF_COLORS.white, letterSpacing: 3 },
  headerMeta: { color: '#94a3b8', fontSize: 10, marginTop: 2 },
  headerMetaBold: { color: PDF_COLORS.white, fontSize: 11, marginTop: 2, fontWeight: 600 },
  accentLine: { height: 3, backgroundColor: PDF_COLORS.accent },
  body: { padding: '28px 40px' },
  bodyWide: { padding: '28px 40px 80px 40px' },
  sectionLabel: { fontSize: 8, fontWeight: 700, color: PDF_COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },
  divider: { borderBottomWidth: 1, borderBottomColor: PDF_COLORS.border, marginVertical: 20 },
  // Billing
  billingRow: { flexDirection: 'row', marginBottom: 24 },
  billingCol: { flex: 1 },
  billName: { fontSize: 18, fontWeight: 700, marginBottom: 3 },
  billSub: { fontSize: 13, fontWeight: 600, marginBottom: 2 },
  billText: { fontSize: 11, color: PDF_COLORS.textSecondary, marginBottom: 2 },
  billEmail: { fontSize: 11, color: PDF_COLORS.accent, marginBottom: 2 },
  // Vehicle card
  vehicleCard: { backgroundColor: PDF_COLORS.lightGray, borderRadius: 8, padding: 18, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: PDF_COLORS.accent },
  vehicleMain: { fontSize: 20, fontWeight: 700, marginTop: 4, marginBottom: 6 },
  vehicleRow: { flexDirection: 'row', flexWrap: 'wrap' },
  vehicleMeta: { fontSize: 11, color: PDF_COLORS.textSecondary, marginRight: 20, marginTop: 2 },
  // Table
  tableHeader: { flexDirection: 'row', backgroundColor: PDF_COLORS.darkAlt, paddingHorizontal: 10, paddingVertical: 8 },
  tableHeaderCell: { color: PDF_COLORS.white, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: PDF_COLORS.border },
  tableRowAlt: { backgroundColor: PDF_COLORS.lightGray },
  tableCell: { fontSize: 10 },
  tableCellBold: { fontSize: 10, fontWeight: 700 },
  tableCellGray: { fontSize: 9, color: PDF_COLORS.textSecondary, marginTop: 2 },
  accentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: PDF_COLORS.accent },
  colDesc: { width: '35%', paddingLeft: 10, position: 'relative' },
  colCoverage: { width: '28%' },
  colMaterial: { width: '17%' },
  colUnit: { width: '10%', textAlign: 'right' },
  colTotal: { width: '10%', textAlign: 'right' },
  // Totals
  totalsBlock: { alignItems: 'flex-end', marginTop: 12, marginBottom: 24 },
  totalsRow: { flexDirection: 'row', width: 280, justifyContent: 'space-between', marginBottom: 5 },
  totalsLabel: { fontSize: 11, color: PDF_COLORS.textSecondary },
  totalsValue: { fontSize: 11, fontWeight: 600 },
  totalsLine: { borderBottomWidth: 1, borderBottomColor: PDF_COLORS.border, width: 280, marginVertical: 7 },
  totalsFinalRow: { flexDirection: 'row', width: 280, justifyContent: 'space-between', marginBottom: 5 },
  totalsFinalLabel: { fontSize: 15, fontWeight: 700 },
  totalsFinalValue: { fontSize: 15, fontWeight: 700 },
  totalsDepositRow: { flexDirection: 'row', width: 280, justifyContent: 'space-between', marginTop: 7 },
  totalsDepositLabel: { fontSize: 12, color: PDF_COLORS.accent, fontWeight: 700 },
  totalsDepositValue: { fontSize: 12, color: PDF_COLORS.accent, fontWeight: 700 },
  totalsDepositNote: { fontSize: 8, color: PDF_COLORS.textMuted, marginTop: 2 },
  // Social proof
  proofBox: { backgroundColor: PDF_COLORS.dark, borderRadius: 8, padding: 20, marginBottom: 24 },
  proofTitle: { fontFamily: 'BarlowCondensed', fontSize: 18, fontWeight: 700, color: PDF_COLORS.white, marginBottom: 6 },
  proofStars: { fontSize: 14, color: PDF_COLORS.amber, marginBottom: 8 },
  proofQuote: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', lineHeight: 1.6, marginBottom: 8 },
  proofAuthor: { fontSize: 9, color: '#64748b', fontWeight: 600 },
  proofStat: { flexDirection: 'row', marginTop: 12 },
  proofStatItem: { flex: 1, alignItems: 'center' },
  proofStatNum: { fontFamily: 'BarlowCondensed', fontSize: 24, fontWeight: 700, color: PDF_COLORS.accent },
  proofStatLabel: { fontSize: 8, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
  // Next steps cards
  nextStepsRow: { flexDirection: 'row', marginTop: 20, marginBottom: 24 },
  card: { flex: 1, padding: 18, borderRadius: 8, borderWidth: 1, borderColor: PDF_COLORS.border, marginHorizontal: 6 },
  cardGreen: { borderLeftWidth: 4, borderLeftColor: PDF_COLORS.green },
  cardPurple: { borderLeftWidth: 4, borderLeftColor: PDF_COLORS.purple },
  cardTitle: { fontSize: 13, fontWeight: 700, marginBottom: 6 },
  cardText: { fontSize: 10, color: PDF_COLORS.textSecondary, marginBottom: 4, lineHeight: 1.5 },
  cardPrice: { fontSize: 20, fontWeight: 700, color: PDF_COLORS.accent, marginTop: 6 },
  cardLink: { fontSize: 10, color: PDF_COLORS.accent, marginTop: 4 },
  // About
  aboutSection: { flexDirection: 'row', marginBottom: 24 },
  aboutLeft: { flex: 1, paddingRight: 20 },
  aboutRight: { width: 200 },
  aboutTitle: { fontFamily: 'BarlowCondensed', fontSize: 22, fontWeight: 700, marginBottom: 12 },
  bulletItem: { flexDirection: 'row', marginBottom: 7 },
  bulletDot: { fontSize: 11, color: PDF_COLORS.accent, marginRight: 8, fontWeight: 700 },
  bulletText: { fontSize: 11, color: PDF_COLORS.textSecondary, flex: 1, lineHeight: 1.5 },
  photoGrid: { flexDirection: 'column', gap: 8 },
  photoBox: { height: 60, backgroundColor: PDF_COLORS.lightGray, borderRadius: 6, borderWidth: 1, borderColor: PDF_COLORS.border },
  // Terms
  termsTitle: { fontFamily: 'BarlowCondensed', fontSize: 14, fontWeight: 700, marginBottom: 8 },
  termItem: { flexDirection: 'row', marginBottom: 5 },
  termText: { fontSize: 9, color: PDF_COLORS.textSecondary, flex: 1, lineHeight: 1.5 },
  // Signature
  sigSection: { marginTop: 20 },
  sigText: { fontSize: 10, color: PDF_COLORS.textSecondary, marginBottom: 20, lineHeight: 1.5 },
  sigRow: { flexDirection: 'row', marginBottom: 20 },
  sigBlock: { flex: 1, marginRight: 24 },
  sigLine: { borderBottomWidth: 1.5, borderBottomColor: PDF_COLORS.textPrimary, marginBottom: 5 },
  sigLabel: { fontSize: 9, color: PDF_COLORS.textMuted },
  // Footer
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 40, paddingVertical: 12, borderTopWidth: 1, borderTopColor: PDF_COLORS.border, position: 'absolute', bottom: 0, left: 0, right: 0 },
  footerLogo: { width: 70, height: 22, objectFit: 'contain' },
  footerTagline: { fontSize: 8, color: PDF_COLORS.textMuted, fontStyle: 'italic' },
  footerRight: { fontSize: 8, color: PDF_COLORS.textSecondary, textAlign: 'right' },
})

function CoverPage({ estimate, customer }: { estimate: any; customer: any }) {
  const estNumber = `EST-${String(estimate.estimate_number || '').padStart(4, '0')}`
  const date = formatDate(estimate.quote_date || estimate.created_at)

  return React.createElement(Page, { size: 'LETTER', style: s.coverPage },
    React.createElement(View, { style: s.coverContent },
      React.createElement(Image, { style: s.coverLogo, src: BRAND.logoUrl }),
      React.createElement(View, { style: s.coverDividerTop }),
      React.createElement(Text, { style: s.coverTitle }, 'VEHICLE WRAP PROPOSAL'),
      React.createElement(Text, { style: s.coverSubtitle }, 'Prepared exclusively for'),
      React.createElement(Text, { style: s.coverCustomer },
        customer?.name || customer?.contact_name || 'Valued Customer'
      ),
      customer?.company && React.createElement(Text, { style: s.coverBusiness }, customer.company),
      React.createElement(View, { style: s.coverMeta },
        React.createElement(View, { style: s.coverMetaItem },
          React.createElement(Text, { style: s.coverMetaLabel }, 'Proposal #'),
          React.createElement(Text, { style: s.coverMetaValue }, estNumber),
        ),
        React.createElement(View, { style: s.coverMetaItem },
          React.createElement(Text, { style: s.coverMetaLabel }, 'Date Prepared'),
          React.createElement(Text, { style: s.coverMetaValue }, date),
        ),
        React.createElement(View, { style: s.coverMetaItem },
          React.createElement(Text, { style: s.coverMetaLabel }, 'Valid Until'),
          React.createElement(Text, { style: s.coverMetaValue }, addDays(estimate.quote_date || estimate.created_at, 30)),
        ),
      ),
    ),
    React.createElement(View, { style: s.coverBottomLine }),
    React.createElement(View, { style: s.coverBottom },
      React.createElement(Text, { style: s.coverTagline }, BRAND.tagline),
      React.createElement(Text, { style: s.coverContact },
        `${BRAND.phone}  |  ${BRAND.email}  |  ${BRAND.website}`
      ),
    ),
  )
}

function ProposalDetailsPage({ estimate, lineItems }: { estimate: any; lineItems: any[] }) {
  const customer = estimate.customer || {}
  const fd = estimate.form_data || {}
  const estNumber = `EST-${String(estimate.estimate_number || '').padStart(4, '0')}`
  const date = formatDate(estimate.quote_date || estimate.created_at)
  const subtotal = estimate.subtotal || 0
  const discount = estimate.discount || 0
  const taxAmt = estimate.tax_amount || 0
  const total = estimate.total || 0
  const deposit = total * 0.5
  const balance = total - deposit

  const year = fd.vehicleYear || fd.year || ''
  const make = fd.vehicleMake || fd.make || ''
  const model = fd.vehicleModel || fd.model || ''
  const vin = fd.vin || fd.vehicleVin || ''
  const color = fd.vehicleColor || fd.color || ''

  return React.createElement(Page, { size: 'LETTER', style: s.page },
    // Header
    React.createElement(View, { style: s.headerBand },
      React.createElement(Image, { style: s.logo, src: BRAND.logoUrl }),
      React.createElement(View, { style: s.headerRight },
        React.createElement(Text, { style: s.headerTitle }, 'VEHICLE WRAP PROPOSAL'),
        React.createElement(Text, { style: s.headerMetaBold }, estNumber),
        React.createElement(Text, { style: s.headerMeta }, date),
      ),
    ),
    React.createElement(View, { style: s.accentLine }),

    React.createElement(View, { style: s.bodyWide },
      // Billing
      React.createElement(View, { style: s.billingRow },
        React.createElement(View, { style: s.billingCol },
          React.createElement(Text, { style: s.sectionLabel }, 'Prepared For'),
          React.createElement(Text, { style: s.billName }, customer.name || customer.contact_name || 'Customer'),
          customer.company && React.createElement(Text, { style: s.billSub }, customer.company),
          customer.phone && React.createElement(Text, { style: s.billText }, customer.phone),
          customer.email && React.createElement(Text, { style: s.billEmail }, customer.email),
        ),
        React.createElement(View, { style: s.billingCol },
          React.createElement(Text, { style: s.sectionLabel }, 'Prepared By'),
          React.createElement(Text, { style: s.billName }, BRAND.name),
          React.createElement(Text, { style: s.billText }, BRAND.address),
          React.createElement(Text, { style: s.billText }, BRAND.city),
          React.createElement(Text, { style: s.billText }, BRAND.phone),
          React.createElement(Text, { style: s.billEmail }, BRAND.email),
        ),
      ),

      React.createElement(View, { style: s.divider }),

      // Vehicle card
      React.createElement(View, { style: s.vehicleCard },
        React.createElement(Text, { style: s.sectionLabel }, 'Your Vehicle'),
        React.createElement(Text, { style: s.vehicleMain },
          [year, make, model].filter(Boolean).join(' ') || 'Vehicle not specified'
        ),
        React.createElement(View, { style: s.vehicleRow },
          vin && React.createElement(Text, { style: s.vehicleMeta }, `VIN: ${vin}`),
          color && React.createElement(Text, { style: s.vehicleMeta }, `Color: ${color}`),
          fd.wrapType && React.createElement(Text, { style: s.vehicleMeta }, `Wrap Type: ${fd.wrapType}`),
          fd.vinylType && React.createElement(Text, { style: s.vehicleMeta }, `Material: ${fd.vinylType}`),
        ),
      ),

      // Line items table
      React.createElement(View, { style: { marginBottom: 20 } },
        React.createElement(View, { style: s.tableHeader },
          React.createElement(Text, { style: [s.tableHeaderCell, s.colDesc as any] }, 'Service / Package'),
          React.createElement(Text, { style: [s.tableHeaderCell, s.colCoverage as any] }, 'Coverage & Details'),
          React.createElement(Text, { style: [s.tableHeaderCell, s.colMaterial as any] }, 'Material'),
          React.createElement(Text, { style: [s.tableHeaderCell, s.colUnit as any] }, 'Price'),
          React.createElement(Text, { style: [s.tableHeaderCell, s.colTotal as any] }, 'Total'),
        ),
        ...lineItems.map((item, i) => {
          const specs = item.specs || {}
          const vehicle = [specs.vehicleYear, specs.vehicleMake, specs.vehicleModel].filter(Boolean).join(' ')
          return React.createElement(View, {
            key: i,
            style: [s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}] as any,
          },
            React.createElement(View, { style: s.colDesc },
              React.createElement(View, { style: s.accentBar }),
              React.createElement(Text, { style: s.tableCellBold }, item.name || 'Item'),
              vehicle && React.createElement(Text, { style: s.tableCellGray }, vehicle),
              item.description && React.createElement(Text, { style: s.tableCellGray }, item.description),
            ),
            React.createElement(Text, { style: [s.tableCell, s.colCoverage as any] },
              specs.wrapType || specs.coverageType || specs.customerDescription || '—'
            ),
            React.createElement(Text, { style: [s.tableCell, s.colMaterial as any] },
              specs.vinylType || specs.material || '—'
            ),
            React.createElement(Text, { style: [s.tableCell, s.colUnit as any] },
              formatCurrency(item.unit_price || 0)
            ),
            React.createElement(Text, { style: [s.tableCellBold, s.colTotal as any] },
              formatCurrency(item.total_price || 0)
            ),
          )
        }),
      ),

      // Totals
      React.createElement(View, { style: s.totalsBlock },
        React.createElement(View, { style: s.totalsRow },
          React.createElement(Text, { style: s.totalsLabel }, 'Subtotal'),
          React.createElement(Text, { style: s.totalsValue }, formatCurrency(subtotal)),
        ),
        discount > 0 && React.createElement(View, { style: s.totalsRow },
          React.createElement(Text, { style: { ...s.totalsLabel, color: PDF_COLORS.amber } }, 'Discount'),
          React.createElement(Text, { style: { ...s.totalsValue, color: PDF_COLORS.amber } }, `-${formatCurrency(discount)}`),
        ),
        React.createElement(View, { style: s.totalsRow },
          React.createElement(Text, { style: s.totalsLabel },
            `Tax (${((estimate.tax_rate || 0) * 100).toFixed(2)}%)`
          ),
          React.createElement(Text, { style: s.totalsValue }, formatCurrency(taxAmt)),
        ),
        React.createElement(View, { style: s.totalsLine }),
        React.createElement(View, { style: s.totalsFinalRow },
          React.createElement(Text, { style: s.totalsFinalLabel }, 'PROPOSAL TOTAL'),
          React.createElement(Text, { style: s.totalsFinalValue }, formatCurrency(total)),
        ),
        React.createElement(View, { style: s.totalsLine }),
        React.createElement(View, { style: s.totalsDepositRow },
          React.createElement(View, null,
            React.createElement(Text, { style: s.totalsDepositLabel }, '50% Deposit to Schedule'),
            React.createElement(Text, { style: s.totalsDepositNote }, 'Secures your install date'),
          ),
          React.createElement(Text, { style: s.totalsDepositValue }, formatCurrency(deposit)),
        ),
        React.createElement(View, { style: { ...s.totalsRow, marginTop: 5 } },
          React.createElement(Text, { style: s.totalsLabel }, 'Balance at Pickup'),
          React.createElement(Text, { style: s.totalsValue }, formatCurrency(balance)),
        ),
      ),

      // Social proof
      React.createElement(View, { style: s.proofBox },
        React.createElement(Text, { style: s.proofTitle }, "95+ Five-Star Reviews on Google"),
        React.createElement(Text, { style: s.proofStars }, "★★★★★"),
        React.createElement(Text, { style: s.proofQuote },
          '"USA Wrap Co did an absolutely incredible job on my truck. The wrap is flawless — perfect edges, zero bubbles. They were professional from start to finish. Highly recommend to anyone in the Pacific Northwest!"'
        ),
        React.createElement(Text, { style: s.proofAuthor }, '— Verified Google Review · Gig Harbor, WA'),
        React.createElement(View, { style: s.proofStat },
          React.createElement(View, { style: s.proofStatItem },
            React.createElement(Text, { style: s.proofStatNum }, '95+'),
            React.createElement(Text, { style: s.proofStatLabel }, '5-Star Reviews'),
          ),
          React.createElement(View, { style: s.proofStatItem },
            React.createElement(Text, { style: s.proofStatNum }, '5'),
            React.createElement(Text, { style: s.proofStatLabel }, 'Days Avg Turnaround'),
          ),
          React.createElement(View, { style: s.proofStatItem },
            React.createElement(Text, { style: s.proofStatNum }, '500+'),
            React.createElement(Text, { style: s.proofStatLabel }, 'Vehicles Wrapped'),
          ),
          React.createElement(View, { style: s.proofStatItem },
            React.createElement(Text, { style: s.proofStatNum }, '3yr'),
            React.createElement(Text, { style: s.proofStatLabel }, 'Warranty Included'),
          ),
        ),
      ),

      // Next steps
      React.createElement(View, null,
        React.createElement(Text, { style: s.sectionLabel }, 'Your Next Step'),
        React.createElement(View, { style: s.nextStepsRow },
          React.createElement(View, { style: [s.card, s.cardGreen] as any },
            React.createElement(Text, { style: s.cardTitle }, 'Book This Proposal'),
            React.createElement(Text, { style: s.cardText }, '50% deposit secures your install slot'),
            React.createElement(Text, { style: s.cardText }, 'Fast production — as little as 5 business days'),
            React.createElement(Text, { style: s.cardText }, 'Full warranty on all work'),
            React.createElement(Text, { style: s.cardPrice }, formatCurrency(deposit)),
            React.createElement(Text, { style: s.cardLink }, 'Pay Online: usawrapco.com/pay'),
          ),
          React.createElement(View, { style: [s.card, s.cardPurple] as any },
            React.createElement(Text, { style: s.cardTitle }, 'Custom Design Package — $1,000'),
            React.createElement(Text, { style: s.cardText }, 'Work 1-on-1 with our in-house designer'),
            React.createElement(Text, { style: s.cardText }, 'AI mockup rendering — see it before we print'),
            React.createElement(Text, { style: s.cardText }, '3 unique design concepts included'),
            React.createElement(Text, { style: s.cardText }, 'Applied toward your total if you book'),
            React.createElement(Text, { style: s.cardLink }, 'sales@usawrapco.com'),
          ),
        ),
      ),
    ),

    React.createElement(View, { style: s.footer },
      React.createElement(Image, { style: s.footerLogo, src: BRAND.logoUrl }),
      React.createElement(Text, { style: s.footerTagline }, BRAND.tagline),
      React.createElement(Text, { style: s.footerRight }, `${BRAND.phone}  |  ${BRAND.email}`),
    ),
  )
}

function ProposalTermsPage({ estimate }: { estimate: any }) {
  const estNumber = `EST-${String(estimate.estimate_number || '').padStart(4, '0')}`
  const date = formatDate(estimate.quote_date || estimate.created_at)

  const bullets = [
    'Premium materials — Avery, 3M, and Arlon vinyl — the industry\'s best',
    "Expert installation team — Pacific Northwest's most trusted vehicle wrap shop",
    'Design-to-installation in as little as 5 business days',
    '5-star rated on Google — 95+ verified reviews',
    'Locally owned and operated in Gig Harbor, WA since 2018',
    'Full 3-year warranty on all installations',
  ]

  return React.createElement(Page, { size: 'LETTER', style: s.page },
    React.createElement(View, { style: s.headerBand },
      React.createElement(Image, { style: s.logo, src: BRAND.logoUrl }),
      React.createElement(View, { style: s.headerRight },
        React.createElement(Text, { style: s.headerTitle }, 'PROPOSAL'),
        React.createElement(Text, { style: s.headerMetaBold }, estNumber),
        React.createElement(Text, { style: s.headerMeta }, date),
      ),
    ),
    React.createElement(View, { style: s.accentLine }),

    React.createElement(View, { style: { padding: '28px 40px 80px 40px' } },
      // About
      React.createElement(View, { style: s.aboutSection },
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
          React.createElement(Text, { style: { ...s.sectionLabel, marginBottom: 8 } }, 'Our Portfolio'),
          React.createElement(View, { style: s.photoGrid },
            React.createElement(View, { style: s.photoBox }),
            React.createElement(View, { style: s.photoBox }),
            React.createElement(View, { style: s.photoBox }),
          ),
          React.createElement(Text, { style: { fontSize: 8, color: PDF_COLORS.textMuted, marginTop: 6, textAlign: 'center' } },
            'View more at usawrapco.com'
          ),
        ),
      ),

      React.createElement(View, { style: s.divider }),

      // Terms
      React.createElement(Text, { style: s.termsTitle }, 'Terms & Conditions'),
      ...PDF_TERMS.map((term, i) =>
        React.createElement(View, { key: i, style: s.termItem },
          React.createElement(Text, { style: { ...s.termText, marginRight: 6, color: PDF_COLORS.accent } }, '•'),
          React.createElement(Text, { style: s.termText }, term),
        )
      ),

      // Signature
      React.createElement(View, { style: s.sigSection },
        React.createElement(View, { style: s.divider }),
        React.createElement(Text, { style: s.sigText },
          'By signing below, customer acknowledges receipt of this proposal and agrees to the terms and conditions stated above.'
        ),
        React.createElement(View, { style: s.sigRow },
          React.createElement(View, { style: s.sigBlock },
            React.createElement(View, { style: s.sigLine }),
            React.createElement(Text, { style: s.sigLabel }, 'Customer Signature'),
          ),
          React.createElement(View, { style: { ...s.sigBlock, flex: 0.5 } },
            React.createElement(View, { style: s.sigLine }),
            React.createElement(Text, { style: s.sigLabel }, 'Date'),
          ),
        ),
        React.createElement(View, { style: { ...s.sigBlock, width: '50%' } },
          React.createElement(View, { style: s.sigLine }),
          React.createElement(Text, { style: s.sigLabel }, 'Printed Name'),
        ),
      ),
    ),

    React.createElement(View, { style: s.footer },
      React.createElement(Image, { style: s.footerLogo, src: BRAND.logoUrl }),
      React.createElement(Text, { style: s.footerTagline }, BRAND.tagline),
      React.createElement(Text, { style: s.footerRight }, `${BRAND.phone}  |  ${BRAND.email}`),
    ),
  )
}

function ProposalPDF({ estimate, lineItems }: { estimate: any; lineItems: any[] }) {
  const customer = estimate.customer || {}
  return React.createElement(Document, {
    title: `USA Wrap Co — Proposal ${estimate.estimate_number || ''}`,
    author: 'USA Wrap Co',
    subject: 'Vehicle Wrap Proposal',
  },
    React.createElement(CoverPage, { estimate, customer }),
    React.createElement(ProposalDetailsPage, { estimate, lineItems }),
    React.createElement(ProposalTermsPage, { estimate }),
  )
}

// ── Route Handler ─────────────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const admin = getSupabaseAdmin()

    // token can be either a UUID (estimate id) or a token string
    // Try by id first, then by form_data token
    let estimate: any = null

    const { data: byId } = await admin
      .from('estimates')
      .select('*, customer:customer_id(id, name, email, phone, company, company_name, contact_name, address)')
      .eq('id', params.token)
      .single()

    if (byId) {
      estimate = byId
    } else {
      // fallback: token stored in form_data.proposalToken
      const { data: byToken } = await admin
        .from('estimates')
        .select('*, customer:customer_id(id, name, email, phone, company, company_name, contact_name, address)')
        .eq('form_data->>proposalToken', params.token)
        .single()
      estimate = byToken
    }

    if (!estimate) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }

    const { data: items } = await admin
      .from('line_items')
      .select('*')
      .eq('parent_type', 'estimate')
      .eq('parent_id', estimate.id)
      .order('sort_order', { ascending: true })

    const estNumber = `EST-${String(estimate.estimate_number || '').padStart(4, '0')}`

    const buffer = await renderToBuffer(
      React.createElement(ProposalPDF, { estimate, lineItems: items || [] }) as any
    )

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="USA-Wrap-Co-Proposal-${estNumber}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: any) {
    console.error('[pdf/proposal] error:', err)
    return NextResponse.json({ error: err.message || 'PDF generation failed' }, { status: 500 })
  }
}
