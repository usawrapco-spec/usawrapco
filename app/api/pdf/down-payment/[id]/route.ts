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
  formatCurrency, formatDate,
} from '@/lib/pdf/brand'
import { getPdfLogoSrc } from '@/lib/pdf/logo'

export const maxDuration = 60
export const runtime = 'nodejs'




// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: { fontFamily: 'Inter', fontSize: 10, color: PDF_COLORS.textPrimary, backgroundColor: PDF_COLORS.white, paddingBottom: 46 },
  // Header band
  headerBand: { backgroundColor: PDF_COLORS.dark, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 36, paddingVertical: 20 },
  logo: { width: 140, height: 45, objectFit: 'contain' },
  headerRight: { alignItems: 'flex-end' },
  headerTitle: { fontFamily: 'BarlowCondensed', fontSize: 22, fontWeight: 700, color: PDF_COLORS.white, letterSpacing: 2 },
  headerSubtitle: { fontFamily: 'BarlowCondensed', fontSize: 14, fontWeight: 400, color: PDF_COLORS.amber, marginTop: 2 },
  headerNumber: { fontSize: 12, fontWeight: 600, color: '#94a3b8', marginTop: 4 },
  accentLine: { height: 3, backgroundColor: PDF_COLORS.accent },
  // Body
  body: { padding: '16px 36px' },
  // Billing
  billingRow: { flexDirection: 'row', marginBottom: 12 },
  billingCol: { flex: 1 },
  sectionLabel: { fontSize: 8, fontWeight: 700, color: PDF_COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 },
  billName: { fontSize: 14, fontWeight: 700, marginBottom: 2 },
  billText: { fontSize: 10, color: PDF_COLORS.textSecondary, marginBottom: 1 },
  billEmail: { fontSize: 10, color: PDF_COLORS.accent, marginBottom: 1 },
  divider: { borderBottomWidth: 1, borderBottomColor: PDF_COLORS.border, marginVertical: 10 },
  // Invoice details row
  detailRow: { flexDirection: 'row', marginBottom: 14, backgroundColor: PDF_COLORS.lightGray, borderRadius: 6, padding: 10 },
  detailCol: { flex: 1 },
  detailLabel: { fontSize: 7.5, fontWeight: 700, color: PDF_COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 3 },
  detailValue: { fontSize: 11, fontWeight: 600 },
  // Line item
  lineItemBox: { backgroundColor: PDF_COLORS.lightGray, borderRadius: 8, padding: 12, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: PDF_COLORS.accent },
  lineItemTitle: { fontSize: 13, fontWeight: 700, marginBottom: 4 },
  lineItemDesc: { fontSize: 10, color: PDF_COLORS.textSecondary, marginBottom: 8, lineHeight: 1.5 },
  // Amount
  amountBox: { alignItems: 'flex-end', marginTop: 4, marginBottom: 12 },
  amountRow: { flexDirection: 'row', width: 280, justifyContent: 'space-between', marginBottom: 4 },
  amountLabel: { fontSize: 11, color: PDF_COLORS.textSecondary },
  amountValue: { fontSize: 11, fontWeight: 600 },
  amountTotalRow: { flexDirection: 'row', width: 280, justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 2, borderTopColor: PDF_COLORS.dark, marginTop: 8 },
  amountTotalLabel: { fontSize: 16, fontWeight: 700 },
  amountTotalValue: { fontSize: 16, fontWeight: 700, color: PDF_COLORS.accent },
  // Balance note
  balanceNote: { marginTop: 10, padding: 10, backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 6, borderLeftWidth: 3, borderLeftColor: PDF_COLORS.amber },
  balanceTitle: { fontSize: 10, fontWeight: 700, color: PDF_COLORS.amber, marginBottom: 4 },
  balanceText: { fontSize: 10, color: PDF_COLORS.textSecondary, lineHeight: 1.5 },
  // Payment methods
  paymentBox: { marginTop: 10, padding: 10, backgroundColor: PDF_COLORS.lightGray, borderRadius: 6 },
  paymentTitle: { fontSize: 10, fontWeight: 700, marginBottom: 6 },
  paymentText: { fontSize: 9, color: PDF_COLORS.textSecondary, marginBottom: 2, lineHeight: 1.5 },
  // Signature
  sigSection: { marginTop: 16 },
  sigRow: { flexDirection: 'row', marginTop: 20 },
  sigBlock: { flex: 1, marginRight: 20 },
  sigLine: { borderBottomWidth: 1, borderBottomColor: PDF_COLORS.textPrimary, marginBottom: 4 },
  sigLabel: { fontSize: 8, color: PDF_COLORS.textMuted },
  // Footer
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 36, paddingVertical: 10, borderTopWidth: 1, borderTopColor: PDF_COLORS.border },
  footerLogo: { width: 60, height: 18, objectFit: 'contain' },
  footerText: { fontSize: 7.5, color: PDF_COLORS.textMuted },
})

// ── Document ────────────────────────────────────────────────────────────────
function DownPaymentPDF({ salesOrder, customer }: {
  salesOrder: any; customer: any
}) {
  const soNum = `SO-${String(salesOrder.so_number || '').padStart(4, '0')}`
  const invNum = `DP-${String(salesOrder.so_number || '').padStart(4, '0')}`
  const date = formatDate(salesOrder.so_date || salesOrder.created_at)
  const total = salesOrder.total || 0
  const depositAmt = 250
  const balance = total - depositAmt
  const jobDesc = salesOrder.title || 'Vehicle Wrap Service'

  return React.createElement(Document, {
    title: `USA Wrap Co — Down Payment Invoice ${invNum}`,
    author: 'USA Wrap Co',
    subject: 'Down Payment Invoice',
  },
    React.createElement(Page, { size: 'LETTER', style: s.page },
      // Header
      React.createElement(View, { style: s.headerBand },
        React.createElement(Image, { style: s.logo, src: getPdfLogoSrc() }),
        React.createElement(View, { style: s.headerRight },
          React.createElement(Text, { style: s.headerTitle }, 'DOWN PAYMENT INVOICE'),
          React.createElement(Text, { style: s.headerSubtitle }, 'Deposit Required'),
          React.createElement(Text, { style: s.headerNumber }, invNum),
        ),
      ),
      React.createElement(View, { style: s.accentLine }),

      React.createElement(View, { style: s.body },
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

        // Details
        React.createElement(View, { style: s.detailRow },
          React.createElement(View, { style: s.detailCol },
            React.createElement(Text, { style: s.detailLabel }, 'Invoice Number'),
            React.createElement(Text, { style: s.detailValue }, invNum),
          ),
          React.createElement(View, { style: s.detailCol },
            React.createElement(Text, { style: s.detailLabel }, 'Invoice Date'),
            React.createElement(Text, { style: s.detailValue }, date),
          ),
          React.createElement(View, { style: s.detailCol },
            React.createElement(Text, { style: s.detailLabel }, 'Related SO'),
            React.createElement(Text, { style: s.detailValue }, soNum),
          ),
          React.createElement(View, { style: s.detailCol },
            React.createElement(Text, { style: s.detailLabel }, 'Terms'),
            React.createElement(Text, { style: s.detailValue }, 'DUE ON RECEIPT'),
          ),
        ),

        React.createElement(View, { style: s.divider }),

        // Single line item: Deposit
        React.createElement(View, { style: s.lineItemBox },
          React.createElement(Text, { style: s.lineItemTitle },
            `Deposit for ${jobDesc}`
          ),
          React.createElement(Text, { style: s.lineItemDesc },
            'Initial deposit to secure your project slot and begin production scheduling. This amount will be applied toward the total project cost.'
          ),
        ),

        // Amount
        React.createElement(View, { style: s.amountBox },
          React.createElement(View, { style: s.amountRow },
            React.createElement(Text, { style: s.amountLabel }, 'Deposit Amount'),
            React.createElement(Text, { style: s.amountValue }, formatCurrency(depositAmt)),
          ),
          React.createElement(View, { style: s.amountTotalRow },
            React.createElement(Text, { style: s.amountTotalLabel }, 'Amount Due'),
            React.createElement(Text, { style: s.amountTotalValue }, formatCurrency(depositAmt)),
          ),
        ),

        // Balance note
        React.createElement(View, { style: s.balanceNote },
          React.createElement(Text, { style: s.balanceTitle }, 'Balance Due at Completion'),
          React.createElement(Text, { style: s.balanceText },
            `Project Total: ${formatCurrency(total)}\nDeposit: ${formatCurrency(depositAmt)}\nRemaining Balance: ${formatCurrency(balance)}\n\nThe remaining balance of ${formatCurrency(balance)} is due on delivery.`
          ),
        ),

        // Payment methods
        React.createElement(View, { style: s.paymentBox },
          React.createElement(Text, { style: s.paymentTitle }, 'Payment Methods'),
          React.createElement(Text, { style: s.paymentText },
            `Online: Visit usawrapco.com/pay\nCredit Card: Call ${BRAND.phone}\nCheck: Payable to "USA Wrap Co"\nZelle / Venmo: ${BRAND.email}`
          ),
        ),

        // Signature
        React.createElement(View, { style: s.sigSection },
          React.createElement(View, { style: s.divider }),
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
      ),

      // Footer
      React.createElement(View, { fixed: true, style: s.footer },
        React.createElement(Image, { style: s.footerLogo, src: getPdfLogoSrc() }),
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

    const customer = salesOrder.customer || {}
    const invNum = `DP-${String(salesOrder.so_number || '').padStart(4, '0')}`

    const buffer = await renderToBuffer(
      React.createElement(DownPaymentPDF, { salesOrder, customer }) as any
    )

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="USA-Wrap-Co-Deposit-Invoice-${invNum}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: any) {
    console.error('[pdf/down-payment] error:', err)
    return NextResponse.json({ error: err.message || 'PDF generation failed' }, { status: 500 })
  }
}
