/**
 * Product-type specific proposal template data.
 * Used by the PDF renderer to switch cover images, copy, terms, and branding
 * per product type: commercial_wrap, marine_decking, ppf.
 */

import { PDF_COLORS, PDF_TERMS, BOAT_PDF_TERMS } from './brand'

export type ProposalProductType = 'commercial_wrap' | 'marine_decking' | 'ppf'

interface ProposalTemplate {
  coverTitle: string
  coverSubtitle: string
  tagline: string
  heroImageUrl: string  // high-res real photo URL
  accentColor: string
  accentGradient: [string, string]
  whyUs: { title: string; text: string }[]
  materials: { brand: string; desc: string }[]
  warranty: { title: string; desc: string }
  stats: { value: string; label: string }[]
  testimonial: { quote: string; author: string }
  terms: readonly string[]
  processSteps: { step: string; title: string; desc: string }[]
}

export const PROPOSAL_TEMPLATES: Record<ProposalProductType, ProposalTemplate> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // COMMERCIAL VEHICLE WRAPS
  // ═══════════════════════════════════════════════════════════════════════════
  commercial_wrap: {
    coverTitle: 'COMMERCIAL WRAP PROPOSAL',
    coverSubtitle: 'Transform Your Fleet Into a Moving Billboard',
    tagline: 'Premium Vehicle Wraps — Designed, Printed & Installed In-House',
    heroImageUrl: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=1200&q=85&fm=jpg',
    accentColor: '#3b82f6',
    accentGradient: ['#3b82f6', '#2563eb'],
    whyUs: [
      { title: 'Full In-House Production', text: 'Design, print, laminate, and install — all under one roof. No outsourcing, no delays, no finger-pointing.' },
      { title: '3M & Avery Certified', text: 'We use only tier-1 cast vinyl from 3M, Avery Dennison, and Arlon — the same materials trusted by Fortune 500 fleets.' },
      { title: 'Fleet-Ready Turnaround', text: 'Volume pricing and staggered scheduling keep your vehicles on the road while we wrap them one by one.' },
      { title: '3-Year Installation Warranty', text: 'Every wrap backed by our comprehensive warranty covering lifting, peeling, and fading under normal use.' },
      { title: '$44K+ Impressions Daily', text: 'The Outdoor Advertising Association of America reports a single wrapped vehicle generates 30,000–70,000 daily impressions.' },
      { title: 'Brand Consistency Guaranteed', text: 'Pantone-matched colors, vector-precise logos, and templated layouts ensure every vehicle looks identical.' },
    ],
    materials: [
      { brand: '3M IJ180Cv3 + 8519', desc: 'Cast vinyl with gloss overlaminate — 7-year durability, industry gold standard for fleet wraps' },
      { brand: 'Avery Dennison MPI 1105', desc: 'Supreme wrapping film with DOL 6460 laminate — exceptional conformability and vivid color' },
      { brand: 'Arlon SLX Cast', desc: 'Premium cast film — superior repositionability and long-term adhesion on compound curves' },
    ],
    warranty: { title: '3-YEAR WARRANTY', desc: 'Full coverage on materials and installation. Peeling, lifting, and fading — we fix it at no cost.' },
    stats: [
      { value: '500+', label: 'Vehicles Wrapped' },
      { value: '5-Day', label: 'Avg Turnaround' },
      { value: '95+', label: '5-Star Reviews' },
      { value: '3yr', label: 'Warranty' },
    ],
    testimonial: {
      quote: 'USA Wrap Co did an incredible job on our fleet of 12 service vans. The wraps are flawless, the colors pop, and the turnaround was faster than quoted. Our phone rings more than ever — these trucks are our best marketing investment.',
      author: '— Fleet Manager, Pacific Northwest HVAC Company',
    },
    terms: PDF_TERMS,
    processSteps: [
      { step: '01', title: 'Design & Approve', desc: 'AI-powered mockups on your actual vehicle. Revise until perfect, then approve for print.' },
      { step: '02', title: 'Print & Laminate', desc: 'Printed on our wide-format HP Latex printers, then overlaminated for UV and scratch protection.' },
      { step: '03', title: 'Prep & Install', desc: 'Vehicle cleaned, surfaces prepped, then wrapped by our certified install team.' },
      { step: '04', title: 'Quality Check & Deliver', desc: 'Final inspection, heat post for longevity, and a walkthrough before you drive away.' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MARINE WRAPS & BOAT DECKING
  // ═══════════════════════════════════════════════════════════════════════════
  marine_decking: {
    coverTitle: 'MARINE WRAP & DECKING PROPOSAL',
    coverSubtitle: 'Elevate Your Vessel With Premium Graphics & Custom Decking',
    tagline: 'Marine-Grade Wraps & Synthetic Decking — Built for the Water',
    heroImageUrl: 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=1200&q=85&fm=jpg',
    accentColor: '#0891b2',
    accentGradient: ['#06b6d4', '#0891b2'],
    whyUs: [
      { title: 'Marine-Grade Materials', text: 'We use 3M marine vinyl and SeaDek/Dekwave EVA foam — engineered specifically for saltwater, UV, and marine environments.' },
      { title: 'Precision 3D Scanning', text: 'Laser-scanned templates ensure a perfect fit on every hull contour, hatch, and deck surface.' },
      { title: 'Saltwater Tested', text: 'Our materials and adhesives are rated for continuous saltwater exposure, sun, fuel, and marine cleaning chemicals.' },
      { title: 'Custom Design Studio', text: 'From racing stripes to full hull art — our designers create head-turning graphics that look as good at the marina as they do at speed.' },
      { title: 'Anti-Fatigue Decking', text: 'Closed-cell EVA foam decking provides cushion, grip, and thermal insulation — comfortable in bare feet all day.' },
      { title: 'Non-Skid Safety', text: 'Diamond and sheet textures provide reliable traction when wet, reducing slip hazards for crew and passengers.' },
    ],
    materials: [
      { brand: '3M Scotchcal Marine', desc: 'Cast vinyl rated for below-waterline application — 5+ year marine durability' },
      { brand: 'SeaDek / Dekwave EVA', desc: '6mm closed-cell EVA foam — UV-stable, non-absorbent, anti-fatigue comfort' },
      { brand: '3M Marine Adhesive', desc: 'Industrial-grade marine adhesive — bonds permanently to gelcoat, aluminum, and fiberglass' },
    ],
    warranty: { title: '3-YEAR MARINE WARRANTY', desc: 'Materials and workmanship warranted for marine environments. Excludes neglect and pressure washing.' },
    stats: [
      { value: '200+', label: 'Boats Serviced' },
      { value: '7-Day', label: 'Avg Install' },
      { value: '5-Star', label: 'Google Rating' },
      { value: '3yr', label: 'Marine Warranty' },
    ],
    testimonial: {
      quote: 'The decking on my center console is incredible. Comfortable, grippy, and it looks like a factory option. The hull graphics transformed the boat — I get compliments at every marina. Best upgrade I\'ve ever done.',
      author: '— Boat Owner, Gig Harbor Marina',
    },
    terms: BOAT_PDF_TERMS,
    processSteps: [
      { step: '01', title: 'Survey & Scan', desc: 'We visit your vessel, take measurements, photograph all surfaces, and 3D scan the deck layout.' },
      { step: '02', title: 'Design & Template', desc: 'Custom graphics designed and decking patterns templated. You approve the digital proof before production.' },
      { step: '03', title: 'Production', desc: 'Graphics printed on marine-rated vinyl. Decking CNC-cut from scanned templates for perfect fit.' },
      { step: '04', title: 'Install & Seal', desc: 'Professional installation at our shop or your marina. All edges sealed for permanent marine adhesion.' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PAINT PROTECTION FILM (PPF)
  // ═══════════════════════════════════════════════════════════════════════════
  ppf: {
    coverTitle: 'PAINT PROTECTION FILM PROPOSAL',
    coverSubtitle: 'Invisible Armor for Your Vehicle\'s Finish',
    tagline: 'Self-Healing PPF — Protect Your Paint From Day One',
    heroImageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&q=85&fm=jpg',
    accentColor: '#8b5cf6',
    accentGradient: ['#8b5cf6', '#7c3aed'],
    whyUs: [
      { title: 'XPEL Ultimate Plus PPF', text: 'The world\'s most trusted paint protection film — self-healing, optically clear, and backed by a 10-year manufacturer warranty.' },
      { title: 'DAP (Design Access Program)', text: 'We use XPEL\'s precision-cut DAP templates for thousands of vehicles — computer-cut for exact panel coverage.' },
      { title: 'Self-Healing Technology', text: 'Light scratches and swirls disappear with heat exposure. Your car\'s paint stays showroom-fresh for years.' },
      { title: 'Invisible Protection', text: 'Optically clear film with zero orange peel. Once installed, nobody knows it\'s there — until a rock hits your hood.' },
      { title: 'Ceramic Coating Compatible', text: 'Layer ceramic coating on top of PPF for the ultimate protection stack — hydrophobic, UV-resistant, and self-cleaning.' },
      { title: 'Resale Value Preservation', text: 'Protected paint means no rock chips, no staining, and no clear coat failure — vehicles with PPF retain significantly higher resale value.' },
    ],
    materials: [
      { brand: 'XPEL Ultimate Plus', desc: '8.5 mil self-healing TPU — 10-year warranty, optically clear, industry-leading hydrophobic top coat' },
      { brand: 'XPEL Stealth', desc: 'Satin-finish PPF that converts gloss paint to a matte/satin look while maintaining full self-healing protection' },
      { brand: 'SunTek Ultra', desc: 'Premium PPF with advanced self-healing and stain resistance — an excellent value alternative' },
    ],
    warranty: { title: '10-YEAR MANUFACTURER WARRANTY', desc: 'XPEL\'s industry-leading warranty covers yellowing, cracking, peeling, staining, and delamination.' },
    stats: [
      { value: '300+', label: 'PPF Installs' },
      { value: '10yr', label: 'Film Warranty' },
      { value: '99%', label: 'Customer Satisfaction' },
      { value: 'XPEL', label: 'Certified Installer' },
    ],
    testimonial: {
      quote: 'I just drove from Seattle to LA and back. The hood is pristine — not a single rock chip. The PPF paid for itself on that one trip alone. Should have done this the day I bought the car.',
      author: '— Tesla Model 3 Owner, Tacoma WA',
    },
    terms: [
      'Vehicle must be clean and free of wax, sealant, and ceramic coating on protected areas. Contamination reduces adhesion — $150 decontamination fee if surface prep is required.',
      'Existing rock chips, scratches, or paint defects will be visible under the film. PPF does not repair paint — it protects from future damage.',
      'Edges are tucked where possible. On some panels, a visible edge line is normal and expected. Factory paint edges are wrapped for maximum coverage.',
      'Self-healing activates with heat (sun, warm water, heat gun). Deep gouges or cuts through the film are not self-healing.',
      'Ceramic coating over PPF is recommended but billed separately. Allow 24-48 hours cure time before coating application.',
      'Removal is available at $100/hour. USA Wrap Co is not responsible for paint condition under removed film on vehicles older than 3 years or with aftermarket paint.',
      '50% deposit required to schedule. Remaining balance due at pickup. Card on file charged after 10 days if unpaid.',
      'Cancellations within 24 hours of scheduled appointment subject to a $150 fee for pre-cut film waste.',
      'This proposal is valid for 30 days. Governing law: State of Washington. Disputes resolved by binding arbitration in Pierce County, WA.',
    ],
    processSteps: [
      { step: '01', title: 'Vehicle Assessment', desc: 'Paint condition inspected, existing damage documented, and coverage plan confirmed.' },
      { step: '02', title: 'Precision Cut', desc: 'Film pre-cut from XPEL\'s DAP database — computer-templated for your exact year, make, and model.' },
      { step: '03', title: 'Clean Room Install', desc: 'Applied in our controlled environment — dust-free, temperature-regulated, and properly lit for perfection.' },
      { step: '04', title: 'Cure & Inspect', desc: '24-hour cure period, then a final edge-to-edge inspection before delivery. Absolutely no bubbles or debris.' },
    ],
  },
}

/**
 * Determine the product type from estimate form_data or proposal metadata.
 * Falls back to 'commercial_wrap' if unknown.
 */
export function resolveProductType(formData?: any, proposalMeta?: any): ProposalProductType {
  // Check proposal-level product_type first
  const pt = proposalMeta?.product_type || formData?.product_type || formData?.productType || ''
  const lower = String(pt).toLowerCase()
  if (lower.includes('marine') || lower.includes('boat') || lower.includes('deck')) return 'marine_decking'
  if (lower.includes('ppf') || lower.includes('protection') || lower.includes('clear bra') || lower.includes('paint protection')) return 'ppf'
  // Check line item hints
  if (formData?.wrapType) {
    const wt = String(formData.wrapType).toLowerCase()
    if (wt.includes('ppf') || wt.includes('protection')) return 'ppf'
    if (wt.includes('marine') || wt.includes('boat') || wt.includes('deck')) return 'marine_decking'
  }
  return 'commercial_wrap'
}
