import { NextRequest, NextResponse } from 'next/server'
import React from 'react'
import {
  Document, Page, Text, View, StyleSheet, Image, renderToBuffer,
} from '@react-pdf/renderer'
import { registerPdfFonts } from '@/lib/pdf/fonts'

registerPdfFonts()
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { BRAND, PDF_COLORS, formatDate } from '@/lib/pdf/brand'
import { getPdfLogoSrc } from '@/lib/pdf/logo'

export const maxDuration = 60
export const runtime = 'nodejs'

// ── Colors (work-order navy theme) ───────────────────────────────────────────
const WO = {
  navy: '#0e1a2b',
  navyLight: '#162234',
  steel: '#aa6a66',
  steelLight: '#c4857f',
  steelDark: '#8a4a47',
  steelBg: '#fdf5f5',
  green: '#3a8a5c',
  orange: '#c87020',
  orangeBg: '#fff8f0',
  secBg: '#f0eee9',
  off: '#f4f2ef',
  rule: '#e0dcd6',
  ink: '#1a1917',
  dkGray: '#5a5754',
  mdGray: '#b8b4ae',
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: { fontFamily: 'Inter', fontSize: 9, color: WO.ink, backgroundColor: '#ffffff', paddingBottom: 40 },
  // Header band
  headerBand: { backgroundColor: WO.navy, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 14 },
  logo: { width: 100, height: 32, objectFit: 'contain' },
  headerRight: { alignItems: 'flex-end' },
  headerTitle: { fontFamily: 'BarlowCondensed', fontSize: 22, fontWeight: 700, color: '#ffffff', letterSpacing: 3 },
  headerMeta: { color: '#5a7898', fontSize: 8, marginTop: 1 },
  headerMetaBold: { color: '#ffffff', fontSize: 9, marginTop: 1, fontWeight: 600 },
  // Sub-header strip
  subHeader: { backgroundColor: WO.navyLight, flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 6, justifyContent: 'space-between', alignItems: 'center' },
  subLabel: { color: '#5a7898', fontSize: 7, fontWeight: 700 },
  subValue: { color: '#ffffff', fontSize: 9, fontWeight: 700, marginLeft: 4 },
  subPair: { flexDirection: 'row', alignItems: 'center' },
  statusBadge: { backgroundColor: WO.green, borderRadius: 3, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { color: '#ffffff', fontSize: 7, fontWeight: 700 },
  accentLine: { height: 2, backgroundColor: WO.steel },
  // Body
  body: { padding: '12px 24px' },
  // Two-column row
  row: { flexDirection: 'row', marginBottom: 8 },
  colLeft: { width: '55%', paddingRight: 6 },
  colRight: { width: '45%', paddingLeft: 6 },
  // Cards
  card: { borderWidth: 1, borderColor: WO.rule, borderRadius: 4, padding: 8, marginBottom: 8 },
  cardAccent: { borderLeftWidth: 3, borderLeftColor: WO.navy },
  cardSteel: { borderLeftWidth: 3, borderLeftColor: WO.steel, backgroundColor: WO.steelBg },
  cardOrange: { borderLeftWidth: 3, borderLeftColor: WO.orange, backgroundColor: WO.orangeBg },
  // Section header
  secHeader: { backgroundColor: WO.secBg, borderLeftWidth: 3, borderLeftColor: WO.steelDark, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  secTitle: { fontSize: 7, fontWeight: 700, color: WO.dkGray, textTransform: 'uppercase', letterSpacing: 0.6 },
  secRight: { fontSize: 7, color: WO.mdGray },
  // Text variants
  labelSmall: { fontSize: 7, fontWeight: 700, color: WO.dkGray, textTransform: 'uppercase', marginBottom: 2 },
  textLarge: { fontSize: 11, fontWeight: 700, marginBottom: 1 },
  textMedium: { fontSize: 9, fontWeight: 600, marginBottom: 1 },
  textNormal: { fontSize: 8.5, color: WO.dkGray, marginBottom: 1 },
  textSteelLight: { fontSize: 9, fontWeight: 600, color: WO.steelLight },
  textOrangeBold: { fontSize: 8, fontWeight: 700, color: WO.orange },
  textOrange: { fontSize: 8, color: '#5a3000' },
  // Panels grid
  panelRow: { flexDirection: 'row', flexWrap: 'wrap' },
  panelItem: { width: '33%', flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  panelBullet: { fontSize: 9, fontWeight: 700, color: WO.steel, marginRight: 4 },
  panelText: { fontSize: 8.5, color: WO.ink },
  // Checklist
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  checkBox: { width: 10, height: 10, borderWidth: 1, borderColor: WO.mdGray, marginRight: 6, marginTop: 1 },
  checkLabel: { fontSize: 8, color: WO.ink, flex: 1 },
  checklistCol: { width: '50%', paddingRight: 4 },
  // Sign-off
  signOff: { backgroundColor: WO.off, borderLeftWidth: 3, borderLeftColor: WO.navy, borderWidth: 1, borderColor: WO.rule, borderRadius: 4, padding: 8, marginTop: 8 },
  signLabel: { fontSize: 7, fontWeight: 700, color: WO.dkGray, marginBottom: 4 },
  signLine: { fontSize: 8, color: WO.dkGray },
  // Footer
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 6, borderTopWidth: 1, borderTopColor: WO.rule },
  footerText: { fontSize: 7, color: WO.mdGray },
})

// ── Default checklists ───────────────────────────────────────────────────────
const DEFAULT_PRE = [
  'Vinyl roll condition verified (no damage, correct color)',
  'Color match confirmed against approved proof',
  'Panel measurements verified against estimate',
  'Vehicle surface prep completed (decon wash + IPA wipe)',
  'Pre-existing damage documented with photos',
]
const DEFAULT_POST = [
  'All panels applied — no missed sections',
  'Zero bubbles, fish eyes, or lifting edges',
  'All edges sealed and tucked — no exposed cut edges',
  'Seam placement acceptable — not on high-visibility lines',
  'Vehicle cleaned and debris removed from interior',
  'Customer walkthrough completed and signature obtained',
]

// ── Helper components ────────────────────────────────────────────────────────
function WOHeader({ ref, date }: { ref: string; date: string }) {
  return React.createElement(View, null,
    React.createElement(View, { style: s.headerBand },
      React.createElement(Image, { style: s.logo, src: getPdfLogoSrc() }),
      React.createElement(View, { style: s.headerRight },
        React.createElement(Text, { style: s.headerTitle }, 'WORK ORDER'),
        React.createElement(Text, { style: s.headerMetaBold }, ref),
        React.createElement(Text, { style: s.headerMeta }, `Date: ${date}`),
      ),
    ),
    React.createElement(View, { style: s.accentLine }),
  )
}

function SubHeaderStrip({ installer, bay, estHours, status }: {
  installer: string; bay: string; estHours: string; status: string
}) {
  const pair = (label: string, value: string) =>
    React.createElement(View, { style: s.subPair, key: label },
      React.createElement(Text, { style: s.subLabel }, label + ':'),
      React.createElement(Text, { style: s.subValue }, value || '—'),
    )

  return React.createElement(View, { style: s.subHeader },
    pair('INSTALLER', installer),
    pair('BAY', bay),
    pair('EST. HRS', estHours ? estHours + ' hrs' : '—'),
    React.createElement(View, { style: s.statusBadge },
      React.createElement(Text, { style: s.statusText }, status),
    ),
  )
}

function VehicleCard({ fd }: { fd: any }) {
  const year = fd.vehicleYear || fd.year || ''
  const make = fd.vehicleMake || fd.make || ''
  const model = fd.vehicleModel || fd.model || ''
  const color = fd.vehicleColor || fd.color || ''
  const vin = fd.vin || fd.vehicleVin || ''
  const plate = fd.plate || fd.licensePlate || ''
  const mileage = fd.mileage || ''
  const vehicle = [year, make].filter(Boolean).join(' ') || 'Vehicle'

  return React.createElement(View, { style: [s.card, s.cardAccent] as any },
    React.createElement(Text, { style: s.labelSmall }, 'VEHICLE'),
    React.createElement(Text, { style: s.textLarge }, vehicle),
    model ? React.createElement(Text, { style: s.textSteelLight }, model) : null,
    React.createElement(Text, { style: s.textNormal }, `Color: ${color || '—'}`),
    React.createElement(Text, { style: s.textNormal }, `VIN: ${vin || '—'}`),
    React.createElement(Text, { style: s.textNormal }, `Plate: ${plate || '—'}   Mileage: ${mileage || '—'}`),
  )
}

function ClientCard({ customer, fd }: { customer: any; fd: any }) {
  const name = customer?.name || ''
  const phone = customer?.phone || ''
  const contact = customer?.business_name || customer?.company_name || ''
  const dropOff = fd.dropOff || fd.drop_off || ''
  const pickUp = fd.pickUp || fd.pick_up || ''

  return React.createElement(View, { style: [s.card, s.cardSteel] as any },
    React.createElement(Text, { style: s.labelSmall }, 'CLIENT / PICKUP INFO'),
    React.createElement(Text, { style: s.textMedium }, name),
    contact ? React.createElement(Text, { style: s.textNormal }, `Contact: ${contact}`) : null,
    phone ? React.createElement(Text, { style: s.textNormal }, phone) : null,
    React.createElement(Text, { style: s.textNormal }, `Drop-off: ${dropOff || '—'}`),
    React.createElement(Text, { style: s.textNormal }, `Pick-up: ${pickUp || '—'}`),
  )
}

function ScopeSection({ fd, lineItems }: { fd: any; lineItems: any[] }) {
  const scope = fd.wrapType || fd.coverageType || fd.scope || ''
  const material = fd.vinylType || fd.material || ''
  const sqft = fd.sqft || fd.squareFeet || ''
  const linearFt = fd.linearFt || fd.linearFeet || ''

  // Gather panel names from line items
  const panels = lineItems
    .map(li => li.name || '')
    .filter(Boolean)

  return React.createElement(View, null,
    React.createElement(View, { style: s.secHeader },
      React.createElement(Text, { style: s.secTitle }, 'WRAP SCOPE & MATERIAL'),
      React.createElement(Text, { style: s.secRight },
        [sqft && `${sqft} sqft`, linearFt && `${linearFt} lin ft`].filter(Boolean).join('  —  ')
      ),
    ),
    React.createElement(View, { style: [s.card, { borderLeftWidth: 3, borderLeftColor: WO.steel }] as any },
      scope ? React.createElement(Text, { style: s.textLarge }, scope) : null,
      material ? React.createElement(Text, { style: s.textNormal }, `Material: ${material}`) : null,
      React.createElement(Text, { style: s.textNormal },
        `Coverage: ${sqft || '—'} sqft  —  ${linearFt || '—'} ordered`
      ),
    ),
    panels.length > 0 ? React.createElement(View, null,
      React.createElement(View, { style: s.secHeader },
        React.createElement(Text, { style: s.secTitle }, 'PANELS TO WRAP'),
      ),
      React.createElement(View, { style: [s.card, { backgroundColor: WO.off, borderLeftWidth: 3, borderLeftColor: WO.steel }] as any },
        React.createElement(View, { style: s.panelRow },
          ...panels.map((p, i) =>
            React.createElement(View, { style: s.panelItem, key: i },
              React.createElement(Text, { style: s.panelBullet }, '–'),
              React.createElement(Text, { style: s.panelText }, p),
            )
          ),
        ),
      ),
    ) : null,
  )
}

function SpecialNotes({ notes }: { notes: string }) {
  if (!notes) return null
  return React.createElement(View, { style: [s.card, s.cardOrange] as any },
    React.createElement(Text, { style: s.textOrangeBold }, '! SPECIAL INSTRUCTIONS'),
    React.createElement(Text, { style: s.textOrange }, notes),
  )
}

function Checklists({ preChecks, postChecks }: { preChecks: string[]; postChecks: string[] }) {
  const renderList = (title: string, items: string[]) =>
    React.createElement(View, { style: s.checklistCol },
      React.createElement(Text, { style: s.labelSmall }, title),
      ...items.map((item, i) =>
        React.createElement(View, { style: s.checkRow, key: i },
          React.createElement(View, { style: s.checkBox }),
          React.createElement(Text, { style: s.checkLabel }, item),
        )
      ),
    )

  return React.createElement(View, null,
    React.createElement(View, { style: s.secHeader },
      React.createElement(Text, { style: s.secTitle }, 'INSTALLATION CHECKLISTS'),
    ),
    React.createElement(View, { style: { flexDirection: 'row' } },
      renderList('PRE-INSTALL (before starting)', preChecks),
      renderList('POST-INSTALL (before releasing)', postChecks),
    ),
  )
}

function SignOff() {
  return React.createElement(View, { style: s.signOff },
    React.createElement(Text, { style: s.signLabel }, 'INSTALLER SIGN-OFF'),
    React.createElement(Text, { style: s.signLine },
      'By signing below, installer confirms all pre/post checklists complete and vehicle released to customer.'
    ),
    React.createElement(Text, { style: { ...s.signLine, marginTop: 8 } },
      'Installer Signature: ______________________   Date: ____________   Actual Hrs: _______   Start: _______   End: _______'
    ),
  )
}

function WOFooter({ ref }: { ref: string }) {
  return React.createElement(View, { style: s.footer },
    React.createElement(Text, { style: s.footerText },
      `Work Order ${ref}  —  ${BRAND.name}  —  ${BRAND.address}, ${BRAND.city}`
    ),
    React.createElement(Text, { style: s.footerText },
      'Installer keeps this form — Sign and return after completion'
    ),
  )
}

// ── Document ─────────────────────────────────────────────────────────────────
function WorkOrderPDF({ estimate, lineItems }: { estimate: any; lineItems: any[] }) {
  const estNumber = `WO-${String(estimate.estimate_number || '').padStart(4, '0')}`
  const date = formatDate(estimate.quote_date || estimate.created_at)
  const fd = estimate.form_data || {}
  const customer = estimate.customer || {}

  return React.createElement(Document, {
    title: `USA Wrap Co — ${estNumber}`,
    author: 'USA Wrap Co',
    subject: 'Work Order / Installer Brief',
  },
    React.createElement(Page, { size: 'LETTER', style: s.page },
      React.createElement(WOHeader, { ref: estNumber, date }),
      React.createElement(SubHeaderStrip, {
        installer: fd.installer || '—',
        bay: fd.bay || '—',
        estHours: fd.estHours || fd.est_hours || '',
        status: estimate.status?.toUpperCase() || 'READY TO INSTALL',
      }),
      React.createElement(View, { style: s.body },
        React.createElement(View, { style: s.row },
          React.createElement(View, { style: s.colLeft },
            React.createElement(VehicleCard, { fd }),
          ),
          React.createElement(View, { style: s.colRight },
            React.createElement(ClientCard, { customer, fd }),
          ),
        ),
        React.createElement(ScopeSection, { fd, lineItems }),
        React.createElement(SpecialNotes, { notes: estimate.notes || fd.special_notes || '' }),
        React.createElement(Checklists, {
          preChecks: fd.pre_checks || DEFAULT_PRE,
          postChecks: fd.post_checks || DEFAULT_POST,
        }),
        React.createElement(SignOff, null),
      ),
      React.createElement(View, { fixed: true, style: { position: 'absolute', bottom: 0, left: 0, right: 0 } },
        React.createElement(WOFooter, { ref: estNumber }),
      ),
    ),
  )
}

// ── Route Handler ────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Missing estimate id' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    const { data: estimate, error } = await admin
      .from('estimates')
      .select('*, customer:customer_id(id, name, email, phone, business_name, company_name)')
      .eq('id', id)
      .single()

    if (error || !estimate) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })
    }

    const { data: items } = await admin
      .from('line_items')
      .select('*')
      .eq('parent_type', 'estimate')
      .eq('parent_id', id)
      .order('sort_order', { ascending: true })

    const lineItems = items || []
    const estNumber = `WO-${String(estimate.estimate_number || '').padStart(4, '0')}`

    const buffer = await renderToBuffer(
      React.createElement(WorkOrderPDF, { estimate, lineItems }) as any
    )

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="USA-Wrap-Co-${estNumber}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: any) {
    console.error('[pdf/workorder] error:', err)
    return NextResponse.json({ error: err.message || 'PDF generation failed' }, { status: 500 })
  }
}
