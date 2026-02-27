import { NextRequest, NextResponse } from 'next/server'
import React from 'react'
import {
  Document, Page, Text, View, StyleSheet, Font, Image, renderToBuffer,
} from '@react-pdf/renderer'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { BRAND, PDF_COLORS, formatCurrency, formatDate } from '@/lib/pdf/brand'

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
  page: { fontFamily: 'Inter', fontSize: 10, color: PDF_COLORS.textPrimary, backgroundColor: PDF_COLORS.white, padding: '0 0 60px 0' },
  // Section headers
  secHeaderSales: { backgroundColor: PDF_COLORS.dark, paddingHorizontal: 36, paddingVertical: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  secHeaderProd: { backgroundColor: '#78350f', paddingHorizontal: 36, paddingVertical: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  secHeaderInstall: { backgroundColor: '#14532d', paddingHorizontal: 36, paddingVertical: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  secTitle: { fontFamily: 'BarlowCondensed', fontSize: 22, fontWeight: 700, color: PDF_COLORS.white, letterSpacing: 2 },
  secMeta: { color: '#d1d5db', fontSize: 10, marginTop: 2 },
  secMetaRight: { alignItems: 'flex-end' },
  logo: { width: 110, height: 36, objectFit: 'contain' },
  accentLineBlue: { height: 3, backgroundColor: PDF_COLORS.accent },
  accentLineAmber: { height: 3, backgroundColor: PDF_COLORS.amber },
  accentLineGreen: { height: 3, backgroundColor: PDF_COLORS.green },
  body: { padding: '20px 36px' },
  sectionLabel: { fontSize: 8, fontWeight: 700, color: PDF_COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 },
  divider: { borderBottomWidth: 1, borderBottomColor: PDF_COLORS.border, marginVertical: 12 },
  // Info grid
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  infoCell: { width: '33%', marginBottom: 10, paddingRight: 12 },
  infoCellHalf: { width: '50%', marginBottom: 10, paddingRight: 12 },
  infoLabel: { fontSize: 8, color: PDF_COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  infoValue: { fontSize: 12, fontWeight: 600 },
  infoValueSm: { fontSize: 10 },
  // Vehicle card
  vehicleCard: { backgroundColor: PDF_COLORS.lightGray, borderRadius: 6, padding: 12, marginBottom: 16 },
  vehicleMain: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  vehicleRow: { flexDirection: 'row', flexWrap: 'wrap' },
  vehicleMeta: { fontSize: 10, color: PDF_COLORS.textSecondary, marginRight: 16 },
  // Table
  tableHeader: { flexDirection: 'row', backgroundColor: PDF_COLORS.darkAlt, paddingHorizontal: 8, paddingVertical: 6 },
  tableHeaderCell: { color: PDF_COLORS.white, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: PDF_COLORS.border },
  tableRowAlt: { backgroundColor: PDF_COLORS.lightGray },
  tableCell: { fontSize: 10 },
  tableCellBold: { fontSize: 10, fontWeight: 700 },
  // Line item cols
  colDesc: { width: '40%' },
  colDet: { width: '30%' },
  colQty: { width: '10%', textAlign: 'center' },
  colPrice: { width: '20%', textAlign: 'right' },
  // Totals
  totalsBlock: { alignItems: 'flex-end', marginTop: 8, marginBottom: 16 },
  totalsRow: { flexDirection: 'row', width: 240, justifyContent: 'space-between', marginBottom: 4 },
  totalsLabel: { fontSize: 10, color: PDF_COLORS.textSecondary },
  totalsValue: { fontSize: 10, fontWeight: 600 },
  totalsLine: { borderBottomWidth: 1, borderBottomColor: PDF_COLORS.border, width: 240, marginVertical: 5 },
  totalsFinalRow: { flexDirection: 'row', width: 240, justifyContent: 'space-between' },
  totalsFinalLabel: { fontSize: 13, fontWeight: 700 },
  totalsFinalValue: { fontSize: 13, fontWeight: 700 },
  // Production specs
  specTable: { marginBottom: 14 },
  specRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: PDF_COLORS.border, paddingVertical: 6, paddingHorizontal: 4 },
  specLabel: { width: '35%', fontSize: 9, color: PDF_COLORS.textSecondary, fontWeight: 600 },
  specValue: { flex: 1, fontSize: 10 },
  specValueBold: { flex: 1, fontSize: 10, fontWeight: 700 },
  // Panel table
  panelHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 6 },
  panelHeaderCell: { fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: PDF_COLORS.textSecondary },
  panelRow: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: PDF_COLORS.border },
  panelCell: { fontSize: 9 },
  colPanelName: { width: '25%' },
  colPanelW: { width: '12%', textAlign: 'center' },
  colPanelH: { width: '12%', textAlign: 'center' },
  colPanelSqft: { width: '14%', textAlign: 'center' },
  colPanelOrder: { width: '18%' },
  colPanelNotes: { width: '19%' },
  // Notes area
  notesBox: { borderWidth: 1, borderColor: PDF_COLORS.border, borderRadius: 4, padding: 10, marginBottom: 14, minHeight: 80 },
  notesTitle: { fontSize: 9, fontWeight: 700, color: PDF_COLORS.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
  notesLines: { borderBottomWidth: 1, borderBottomColor: '#e2e8f0', marginBottom: 10 },
  // Checklist
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  checkbox: { width: 14, height: 14, borderWidth: 1.5, borderColor: PDF_COLORS.textSecondary, borderRadius: 2, marginRight: 10, flexShrink: 0 },
  checkLabel: { fontSize: 11, flex: 1 },
  checkLabelBold: { fontSize: 11, fontWeight: 600, flex: 1 },
  checkMeta: { fontSize: 9, color: PDF_COLORS.textSecondary, marginLeft: 8 },
  // Signoff
  signoffRow: { flexDirection: 'row', marginTop: 16, marginBottom: 8 },
  signoffBlock: { flex: 1, marginRight: 20 },
  signoffLine: { borderBottomWidth: 1.5, borderBottomColor: PDF_COLORS.textPrimary, marginBottom: 4 },
  signoffLabel: { fontSize: 8, color: PDF_COLORS.textMuted },
  // Footer
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 36, paddingVertical: 10, borderTopWidth: 1, borderTopColor: PDF_COLORS.border, position: 'absolute', bottom: 0, left: 0, right: 0 },
  footerLogo: { width: 70, height: 22, objectFit: 'contain' },
  footerTagline: { fontSize: 8, color: PDF_COLORS.textMuted, fontStyle: 'italic' },
  footerRight: { fontSize: 8, color: PDF_COLORS.textSecondary, textAlign: 'right' },
})

// ── Section A — Sales Order ────────────────────────────────────────────────────
function SalesOrderPage({ project, customer, lineItems }: any) {
  const jobNum = project.title || `JOB-${project.id?.slice(0, 8).toUpperCase()}`
  const fd = project.form_data || {}
  const fin = project.fin_data || {}
  const vehicleDesc = project.vehicle_desc || ''
  const year = fd.vehicleYear || fd.year || ''
  const make = fd.vehicleMake || fd.make || ''
  const model = fd.vehicleModel || fd.model || ''
  const vin = fd.vin || fd.vehicleVin || ''
  const color = fd.vehicleColor || fd.color || ''

  const subtotal = lineItems.reduce((s: number, i: any) => s + (i.total_price || 0), 0)
  const total = project.revenue || subtotal
  const deposit = fin.deposit || total * 0.5
  const balance = total - deposit

  return React.createElement(Page, { size: 'LETTER', style: s.page },
    // Header
    React.createElement(View, { style: s.secHeaderSales },
      React.createElement(View, null,
        React.createElement(Text, { style: s.secTitle }, 'SALES ORDER'),
        React.createElement(Text, { style: s.secMeta }, `Job: ${jobNum}  |  Date: ${formatDate(project.created_at)}`),
      ),
      React.createElement(Image, { style: s.logo, src: BRAND.logoUrl }),
    ),
    React.createElement(View, { style: s.accentLineBlue }),

    React.createElement(View, { style: s.body },
      // Customer + Vehicle info
      React.createElement(View, { style: s.infoGrid },
        React.createElement(View, { style: s.infoCellHalf },
          React.createElement(Text, { style: s.infoLabel }, 'Customer'),
          React.createElement(Text, { style: s.infoValue }, customer?.name || customer?.contact_name || '—'),
          customer?.business_name && React.createElement(Text, { style: s.infoValueSm }, customer.company),
          customer?.phone && React.createElement(Text, { style: s.infoValueSm }, customer.phone),
          customer?.email && React.createElement(Text, { style: { ...s.infoValueSm, color: PDF_COLORS.accent } }, customer.email),
        ),
        React.createElement(View, { style: s.infoCellHalf },
          React.createElement(Text, { style: s.infoLabel }, 'Sales Rep'),
          React.createElement(Text, { style: s.infoValue }, project.agent?.name || '—'),
          React.createElement(Text, { style: s.infoLabel }, 'Due Date'),
          React.createElement(Text, { style: s.infoValueSm }, formatDate(project.due_date)),
        ),
      ),

      // Vehicle card
      React.createElement(View, { style: s.vehicleCard },
        React.createElement(Text, { style: s.sectionLabel }, 'Vehicle'),
        React.createElement(Text, { style: s.vehicleMain },
          [year, make, model].filter(Boolean).join(' ') || vehicleDesc || 'Vehicle not specified'
        ),
        React.createElement(View, { style: s.vehicleRow },
          vin && React.createElement(Text, { style: s.vehicleMeta }, `VIN: ${vin}`),
          color && React.createElement(Text, { style: s.vehicleMeta }, `Color: ${color}`),
          fd.wrapType && React.createElement(Text, { style: s.vehicleMeta }, `Type: ${fd.wrapType}`),
        ),
      ),

      // Line items
      React.createElement(Text, { style: s.sectionLabel }, 'Line Items'),
      React.createElement(View, { style: s.tableHeader },
        React.createElement(Text, { style: [s.tableHeaderCell, s.colDesc as any] }, 'Description'),
        React.createElement(Text, { style: [s.tableHeaderCell, s.colDet as any] }, 'Details'),
        React.createElement(Text, { style: [s.tableHeaderCell, s.colQty as any] }, 'Qty'),
        React.createElement(Text, { style: [s.tableHeaderCell, s.colPrice as any] }, 'Total'),
      ),
      ...lineItems.map((item: any, i: number) =>
        React.createElement(View, {
          key: i,
          style: [s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}] as any,
        },
          React.createElement(Text, { style: [s.tableCellBold, s.colDesc as any] }, item.name || 'Item'),
          React.createElement(Text, { style: [s.tableCell, s.colDet as any] },
            item.specs?.wrapType || item.specs?.coverageType || item.description || '—'
          ),
          React.createElement(Text, { style: [s.tableCell, s.colQty as any] }, String(item.quantity || 1)),
          React.createElement(Text, { style: [s.tableCellBold, s.colPrice as any] }, formatCurrency(item.total_price || 0)),
        )
      ),

      // Totals
      React.createElement(View, { style: s.totalsBlock },
        React.createElement(View, { style: s.totalsRow },
          React.createElement(Text, { style: s.totalsLabel }, 'Subtotal'),
          React.createElement(Text, { style: s.totalsValue }, formatCurrency(subtotal)),
        ),
        React.createElement(View, { style: s.totalsLine }),
        React.createElement(View, { style: s.totalsFinalRow },
          React.createElement(Text, { style: s.totalsFinalLabel }, 'SALE PRICE'),
          React.createElement(Text, { style: s.totalsFinalValue }, formatCurrency(total)),
        ),
        React.createElement(View, { style: s.totalsRow },
          React.createElement(Text, { style: { ...s.totalsLabel, color: PDF_COLORS.green } }, 'Deposit Received'),
          React.createElement(Text, { style: { ...s.totalsValue, color: PDF_COLORS.green } }, formatCurrency(deposit)),
        ),
        React.createElement(View, { style: s.totalsLine }),
        React.createElement(View, { style: s.totalsFinalRow },
          React.createElement(Text, { style: { ...s.totalsFinalLabel, color: PDF_COLORS.red } }, 'BALANCE DUE'),
          React.createElement(Text, { style: { ...s.totalsFinalValue, color: PDF_COLORS.red } }, formatCurrency(balance)),
        ),
      ),

      // Special instructions
      fd.notes || project.notes
        ? React.createElement(View, null,
            React.createElement(View, { style: s.divider }),
            React.createElement(Text, { style: s.sectionLabel }, 'Special Instructions'),
            React.createElement(Text, { style: { fontSize: 10, lineHeight: 1.5 } }, fd.notes || project.notes),
          )
        : null,
    ),

    React.createElement(View, { style: s.footer },
      React.createElement(Text, { style: s.footerTagline }, `${BRAND.name}  |  ${BRAND.tagline}`),
      React.createElement(Text, { style: s.footerRight }, `SALES ORDER  |  ${BRAND.phone}`),
    ),
  )
}

// ── Section B — Production Brief ──────────────────────────────────────────────
function ProductionBriefPage({ project, lineItems }: any) {
  const jobNum = project.title || `JOB-${project.id?.slice(0, 8).toUpperCase()}`
  const fd = project.form_data || {}
  const year = fd.vehicleYear || fd.year || ''
  const make = fd.vehicleMake || fd.make || ''
  const model = fd.vehicleModel || fd.model || ''

  // Gather sqft data from line items
  const totalSqft = lineItems.reduce((sum: number, item: any) => {
    return sum + (item.specs?.vinylArea || item.specs?.sqft || 0)
  }, 0)
  const bufferPct = 15
  const orderSqft = Math.ceil(totalSqft * (1 + bufferPct / 100))
  const rollWidth = 54 // inches
  const linearFeet = orderSqft > 0 ? Math.ceil((orderSqft * 144) / rollWidth / 12) : 0

  const panels = [
    { name: 'Driver Side', sqft: fd.driverSideSqft || '' },
    { name: 'Passenger Side', sqft: fd.passengerSideSqft || '' },
    { name: 'Hood', sqft: fd.hoodSqft || '' },
    { name: 'Roof', sqft: fd.roofSqft || '' },
    { name: 'Rear', sqft: fd.rearSqft || '' },
    { name: 'Trunk/Tailgate', sqft: fd.trunkSqft || '' },
    { name: 'Bumpers', sqft: fd.bumperSqft || '' },
    { name: 'Mirrors', sqft: fd.mirrorSqft || '' },
  ].filter(p => p.sqft || totalSqft === 0)

  return React.createElement(Page, { size: 'LETTER', style: s.page },
    React.createElement(View, { style: s.secHeaderProd },
      React.createElement(View, null,
        React.createElement(Text, { style: s.secTitle }, 'PRODUCTION BRIEF'),
        React.createElement(Text, { style: s.secMeta },
          `Job: ${jobNum}  |  ${[year, make, model].filter(Boolean).join(' ') || project.vehicle_desc || 'Vehicle'}  |  Due: ${formatDate(project.due_date)}`
        ),
      ),
      React.createElement(View, { style: s.secMetaRight },
        project.priority === 'urgent' && React.createElement(Text, {
          style: { backgroundColor: PDF_COLORS.red, color: 'white', fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 4 }
        }, 'URGENT'),
      ),
    ),
    React.createElement(View, { style: s.accentLineAmber }),

    React.createElement(View, { style: s.body },
      // Print specifications
      React.createElement(Text, { style: { fontFamily: 'BarlowCondensed', fontSize: 14, fontWeight: 700, marginBottom: 10, color: '#78350f' } },
        'Print Specifications'
      ),
      React.createElement(View, { style: s.specTable },
        React.createElement(View, { style: s.specRow },
          React.createElement(Text, { style: s.specLabel }, 'Material'),
          React.createElement(Text, { style: s.specValueBold },
            fd.vinylType || fd.material || lineItems[0]?.specs?.vinylType || 'See line items'
          ),
        ),
        React.createElement(View, { style: s.specRow },
          React.createElement(Text, { style: s.specLabel }, 'Sqft to Print'),
          React.createElement(Text, { style: s.specValue }, totalSqft > 0 ? `${totalSqft} sqft` : 'See panels'),
        ),
        React.createElement(View, { style: s.specRow },
          React.createElement(Text, { style: s.specLabel }, `Order (${bufferPct}% buffer)`),
          React.createElement(Text, { style: s.specValueBold }, orderSqft > 0 ? `${orderSqft} sqft` : '—'),
        ),
        React.createElement(View, { style: s.specRow },
          React.createElement(Text, { style: s.specLabel }, 'Roll Math (54" wide)'),
          React.createElement(Text, { style: s.specValue }, linearFeet > 0 ? `${orderSqft} sqft ÷ 54" = ${linearFeet} linear feet` : '—'),
        ),
        React.createElement(View, { style: s.specRow },
          React.createElement(Text, { style: s.specLabel }, 'Color / Finish'),
          React.createElement(Text, { style: s.specValue }, fd.vehicleColor || fd.colorName || fd.finish || '—'),
        ),
        React.createElement(View, { style: s.specRow },
          React.createElement(Text, { style: s.specLabel }, 'Coverage Type'),
          React.createElement(Text, { style: s.specValue }, fd.wrapType || fd.coverageType || '—'),
        ),
      ),

      React.createElement(View, { style: s.divider }),

      // Panel breakdown
      React.createElement(Text, { style: { ...s.sectionLabel, marginBottom: 6 } }, 'Panel Breakdown'),
      React.createElement(View, { style: s.panelHeader },
        React.createElement(Text, { style: [s.panelHeaderCell, s.colPanelName as any] }, 'Panel'),
        React.createElement(Text, { style: [s.panelHeaderCell, s.colPanelW as any] }, 'Width'),
        React.createElement(Text, { style: [s.panelHeaderCell, s.colPanelH as any] }, 'Height'),
        React.createElement(Text, { style: [s.panelHeaderCell, s.colPanelSqft as any] }, 'Sqft'),
        React.createElement(Text, { style: [s.panelHeaderCell, s.colPanelOrder as any] }, 'Print Order'),
        React.createElement(Text, { style: [s.panelHeaderCell, s.colPanelNotes as any] }, 'Notes'),
      ),
      ...panels.map((panel, i) =>
        React.createElement(View, { key: i, style: [s.panelRow, i % 2 === 1 ? s.tableRowAlt : {}] as any },
          React.createElement(Text, { style: [s.panelCell, s.colPanelName as any] }, panel.name),
          React.createElement(Text, { style: [s.panelCell, s.colPanelW as any] }, '—'),
          React.createElement(Text, { style: [s.panelCell, s.colPanelH as any] }, '—'),
          React.createElement(Text, { style: [s.panelCell, s.colPanelSqft as any] }, panel.sqft ? String(panel.sqft) : '—'),
          React.createElement(Text, { style: [s.panelCell, s.colPanelOrder as any] }, ''),
          React.createElement(Text, { style: [s.panelCell, s.colPanelNotes as any] }, ''),
        )
      ),

      React.createElement(View, { style: s.divider }),

      // Design files
      React.createElement(Text, { style: { fontFamily: 'BarlowCondensed', fontSize: 14, fontWeight: 700, marginBottom: 6, color: '#78350f' } },
        'Design Files'
      ),
      React.createElement(View, { style: s.specTable },
        React.createElement(View, { style: s.specRow },
          React.createElement(Text, { style: s.specLabel }, 'Design Studio'),
          React.createElement(Text, { style: s.specValue }, 'Design Studio → see linked project'),
        ),
        React.createElement(View, { style: s.specRow },
          React.createElement(Text, { style: s.specLabel }, 'Print-Ready'),
          React.createElement(Text, { style: s.specValue }, '☐ Yes  ☐ No  ☐ Pending'),
        ),
        React.createElement(View, { style: s.specRow },
          React.createElement(Text, { style: s.specLabel }, 'Designer Notes'),
          React.createElement(Text, { style: s.specValue }, fd.designNotes || '—'),
        ),
      ),

      React.createElement(View, { style: s.divider }),

      // Production notes
      React.createElement(View, { style: s.notesBox },
        React.createElement(Text, { style: s.notesTitle }, 'Production Notes'),
        ...[0, 1, 2, 3, 4, 5, 6, 7].map(i =>
          React.createElement(View, { key: i, style: s.notesLines })
        ),
      ),

      // Sign-off line
      React.createElement(View, { style: s.signoffRow },
        React.createElement(View, { style: { ...s.signoffBlock, flex: 2 } },
          React.createElement(View, { style: s.signoffLine }),
          React.createElement(Text, { style: s.signoffLabel }, 'Production Manager'),
        ),
        React.createElement(View, { style: { ...s.signoffBlock, flex: 1 } },
          React.createElement(View, { style: s.signoffLine }),
          React.createElement(Text, { style: s.signoffLabel }, 'Date'),
        ),
      ),
    ),

    React.createElement(View, { style: s.footer },
      React.createElement(Text, { style: s.footerTagline }, `${BRAND.name}  |  ${BRAND.tagline}`),
      React.createElement(Text, { style: s.footerRight }, `PRODUCTION BRIEF  |  ${BRAND.phone}`),
    ),
  )
}

// ── Section C — Install Order ─────────────────────────────────────────────────
function InstallOrderPage({ project }: any) {
  const jobNum = project.title || `JOB-${project.id?.slice(0, 8).toUpperCase()}`
  const fd = project.form_data || {}
  const checkout = project.checkout || {}
  const year = fd.vehicleYear || fd.year || ''
  const make = fd.vehicleMake || fd.make || ''
  const model = fd.vehicleModel || fd.model || ''

  const panels = [
    { label: 'Driver Side', sqft: fd.driverSideSqft || '' },
    { label: 'Passenger Side', sqft: fd.passengerSideSqft || '' },
    { label: 'Hood', sqft: fd.hoodSqft || '' },
    { label: 'Roof', sqft: fd.roofSqft || '' },
    { label: 'Rear', sqft: fd.rearSqft || '' },
    { label: 'Trunk / Tailgate', sqft: fd.trunkSqft || '' },
    { label: 'Bumpers', sqft: '' },
    { label: 'Mirrors', sqft: '' },
    { label: 'Pillars', sqft: '' },
    { label: 'Other', sqft: '' },
  ]

  const preInstallChecks = [
    'Materials confirmed on hand',
    'Vehicle clean and ready',
    'Design file confirmed — print-ready',
    'Bay prepped and cleared',
  ]

  const postInstallChecks = [
    'All panels smooth — no bubbles or lifting edges',
    'Edges sealed and tucked',
    'Vehicle cleaned and wiped down',
    'Photos taken for portfolio',
  ]

  return React.createElement(Page, { size: 'LETTER', style: s.page },
    React.createElement(View, { style: s.secHeaderInstall },
      React.createElement(View, null,
        React.createElement(Text, { style: s.secTitle }, 'INSTALL ORDER'),
        React.createElement(Text, { style: s.secMeta },
          `Job: ${jobNum}  |  Install Date: ${formatDate(project.install_date)}  |  Installer: ${project.installer?.name || 'TBD'}`
        ),
      ),
    ),
    React.createElement(View, { style: s.accentLineGreen }),

    React.createElement(View, { style: s.body },
      // Vehicle info
      React.createElement(View, { style: s.vehicleCard },
        React.createElement(Text, { style: s.sectionLabel }, 'Vehicle'),
        React.createElement(Text, { style: s.vehicleMain },
          [year, make, model].filter(Boolean).join(' ') || project.vehicle_desc || 'Vehicle not specified'
        ),
        React.createElement(View, { style: s.vehicleRow },
          fd.vin && React.createElement(Text, { style: s.vehicleMeta }, `VIN: ${fd.vin}`),
          fd.vehicleColor && React.createElement(Text, { style: s.vehicleMeta }, `Color: ${fd.vehicleColor}`),
        ),
        React.createElement(View, { style: { ...s.vehicleRow, marginTop: 6 } },
          React.createElement(Text, { style: s.vehicleMeta }, `Drop-off: ${formatDate(fd.dropoffDate || project.created_at)}`),
          React.createElement(Text, { style: s.vehicleMeta }, `Pickup: ${formatDate(fd.pickupDate || project.due_date)}`),
          React.createElement(Text, { style: s.vehicleMeta }, `Location: ${fd.installLocation || 'Shop'}`),
        ),
      ),

      // Panels checklist
      React.createElement(Text, { style: s.sectionLabel }, 'Panels to Install'),
      React.createElement(View, { style: { marginBottom: 12 } },
        ...panels.map((panel, i) =>
          React.createElement(View, { key: i, style: s.checkRow },
            React.createElement(View, { style: s.checkbox }),
            React.createElement(Text, { style: s.checkLabelBold }, panel.label),
            panel.sqft && React.createElement(Text, { style: s.checkMeta }, `${panel.sqft} sqft`),
          )
        ),
      ),

      React.createElement(View, { style: s.divider }),

      // Special instructions
      React.createElement(View, { style: s.notesBox },
        React.createElement(Text, { style: s.notesTitle }, 'Special Instructions'),
        fd.installNotes
          ? React.createElement(Text, { style: { fontSize: 10, lineHeight: 1.6 } }, fd.installNotes)
          : React.createElement(View, null,
              ...[0, 1, 2].map(i =>
                React.createElement(View, { key: i, style: s.notesLines })
              ),
            ),
      ),

      // Pre-install checklist
      React.createElement(Text, { style: s.sectionLabel }, 'Pre-Install Checklist'),
      ...preInstallChecks.map((check, i) =>
        React.createElement(View, { key: i, style: s.checkRow },
          React.createElement(View, { style: s.checkbox }),
          React.createElement(Text, { style: s.checkLabel }, check),
        )
      ),

      React.createElement(View, { style: s.divider }),

      // Post-install sign-off
      React.createElement(Text, { style: s.sectionLabel }, 'Post-Install Sign-Off'),
      ...postInstallChecks.map((check, i) =>
        React.createElement(View, { key: i, style: s.checkRow },
          React.createElement(View, { style: s.checkbox }),
          React.createElement(Text, { style: s.checkLabel }, check),
        )
      ),

      React.createElement(View, { style: s.signoffRow },
        React.createElement(View, { style: { ...s.signoffBlock, flex: 2 } },
          React.createElement(View, { style: s.signoffLine }),
          React.createElement(Text, { style: s.signoffLabel }, 'Installer Signature'),
        ),
        React.createElement(View, { style: { ...s.signoffBlock, flex: 1 } },
          React.createElement(View, { style: s.signoffLine }),
          React.createElement(Text, { style: s.signoffLabel }, 'Hours'),
        ),
        React.createElement(View, { style: { ...s.signoffBlock, flex: 1 } },
          React.createElement(View, { style: s.signoffLine }),
          React.createElement(Text, { style: s.signoffLabel }, 'Date'),
        ),
      ),
    ),

    React.createElement(View, { style: s.footer },
      React.createElement(Text, { style: s.footerTagline }, `${BRAND.name}  |  ${BRAND.tagline}`),
      React.createElement(Text, { style: s.footerRight }, `INSTALL ORDER  |  ${BRAND.phone}`),
    ),
  )
}

// ── Job Packet Document ────────────────────────────────────────────────────────
function JobPacketPDF({ project, customer, lineItems, section }: {
  project: any; customer: any; lineItems: any[]; section?: string
}) {
  const includeSales = !section || section === 'all' || section === 'sales'
  const includeProd = !section || section === 'all' || section === 'production'
  const includeInstall = !section || section === 'all' || section === 'install'

  return React.createElement(Document, {
    title: `USA Wrap Co — Job Packet ${project.title || project.id}`,
    author: 'USA Wrap Co',
  },
    includeSales && React.createElement(SalesOrderPage, { project, customer, lineItems }),
    includeProd && React.createElement(ProductionBriefPage, { project, lineItems }),
    includeInstall && React.createElement(InstallOrderPage, { project }),
  )
}

// ── Route Handler ─────────────────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const section = req.nextUrl.searchParams.get('section') || 'all'
    const admin = getSupabaseAdmin()

    const { data: project, error } = await admin
      .from('projects')
      .select('*, agent:agent_id(id, name, email), installer:installer_id(id, name), customer:customer_id(id, name, email, phone, business_name, company_name)')
      .eq('id', params.id)
      .single()

    if (error || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const { data: items } = await admin
      .from('line_items')
      .select('*')
      .eq('parent_id', params.id)
      .order('sort_order', { ascending: true })

    const customer = project.customer || {}
    const lineItems = items || []
    const jobNum = project.title || `JOB-${params.id.slice(0, 8).toUpperCase()}`

    const sectionLabel = section === 'production' ? '-Production' : section === 'install' ? '-Install' : ''

    const buffer = await renderToBuffer(
      React.createElement(JobPacketPDF, { project, customer, lineItems, section }) as any
    )

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="USA-Wrap-Co-Job-Packet${sectionLabel}-${jobNum}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: any) {
    console.error('[pdf/job-packet] error:', err)
    return NextResponse.json({ error: err.message || 'PDF generation failed' }, { status: 500 })
  }
}
