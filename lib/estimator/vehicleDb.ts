import type { StdInstallRate, MaterialOption, PPFPackage, Coverage } from './types'

// ─── Van Pricing Matrix ────────────────────────────────────────────────────
// Maps van size + coverage → flat sale price
export const VAN_PRICING: Record<string, Record<Coverage, number>> = {
  medium:  { half: 2240, threequarter: 2980,  full: 4360  },
  large:   { half: 2760, threequarter: 3510,  full: 4600  },
  xlarge:  { half: 3390, threequarter: 4690,  full: 6450  },
  xxlarge: { half: 3700, threequarter: 5120,  full: 6990  },
}

// ─── Install Cost Formula ───────────────────────────────────────────────────
// Replaces the old dual STD_INSTALL_RATES / FLAT_RATE_TIERS systems.
// Formula: hours = BASE + (wrap_sqft * RATE), pay = round(hours * HOURLY / 25) * 25
export const INSTALL_HOURLY_RATE = 35
export const INSTALL_BASE_HOURS = 11.5
export const INSTALL_HOURS_PER_SQFT = 0.015
export const INSTALL_PAY_ROUND_TO = 25

export interface InstallCalcResult {
  pay: number
  hours: number
  tierLabel: string
  hourlyRate: number
}

export function calculateInstallPay(wrapSqft: number): InstallCalcResult {
  if (wrapSqft <= 0) return { pay: 0, hours: 0, tierLabel: '--', hourlyRate: INSTALL_HOURLY_RATE }
  const hours = Math.round((INSTALL_BASE_HOURS + INSTALL_HOURS_PER_SQFT * wrapSqft) * 10) / 10
  const rawPay = hours * INSTALL_HOURLY_RATE
  const pay = Math.round(rawPay / INSTALL_PAY_ROUND_TO) * INSTALL_PAY_ROUND_TO

  let tierLabel = 'Custom'
  if (wrapSqft < 150) tierLabel = 'XS'
  else if (wrapSqft < 200) tierLabel = 'S'
  else if (wrapSqft < 250) tierLabel = 'M'
  else if (wrapSqft < 300) tierLabel = 'L'
  else if (wrapSqft < 400) tierLabel = 'XL'
  else if (wrapSqft < 500) tierLabel = 'XXL'
  else if (wrapSqft < 600) tierLabel = '3XL'
  else tierLabel = '4XL'

  return { pay, hours, tierLabel, hourlyRate: INSTALL_HOURLY_RATE }
}

// ─── Scaled Install Cost (for manual/custom sqft — base hours scale proportionally) ──
// Base hours scale with sqft relative to 250 sqft (typical full wrap), capped at 11.5.
// This prevents absurd install costs for small custom sqft values (e.g. 10 sqft).
export const INSTALL_REFERENCE_SQFT = 250

export function calculateInstallPayScaled(wrapSqft: number): InstallCalcResult {
  if (wrapSqft <= 0) return { pay: 0, hours: 0, tierLabel: '--', hourlyRate: INSTALL_HOURLY_RATE }
  const scaledBase = INSTALL_BASE_HOURS * Math.min(1, wrapSqft / INSTALL_REFERENCE_SQFT)
  const hours = Math.round((scaledBase + INSTALL_HOURS_PER_SQFT * wrapSqft) * 10) / 10
  const rawPay = hours * INSTALL_HOURLY_RATE
  const pay = Math.round(rawPay / INSTALL_PAY_ROUND_TO) * INSTALL_PAY_ROUND_TO

  let tierLabel = 'Custom'
  if (wrapSqft < 150) tierLabel = 'XS'
  else if (wrapSqft < 200) tierLabel = 'S'
  else if (wrapSqft < 250) tierLabel = 'M'
  else if (wrapSqft < 300) tierLabel = 'L'
  else if (wrapSqft < 400) tierLabel = 'XL'
  else if (wrapSqft < 500) tierLabel = 'XXL'
  else if (wrapSqft < 600) tierLabel = '3XL'
  else tierLabel = '4XL'

  return { pay, hours, tierLabel, hourlyRate: INSTALL_HOURLY_RATE }
}

export function calculateMarineInstallPayScaled(sqft: number): InstallCalcResult {
  const full = calculateInstallPayScaled(sqft)
  const hours = Math.round((full.hours / 2) * 10) / 10
  const pay = Math.round((hours * INSTALL_HOURLY_RATE) / INSTALL_PAY_ROUND_TO) * INSTALL_PAY_ROUND_TO
  return { pay, hours, tierLabel: full.tierLabel, hourlyRate: INSTALL_HOURLY_RATE }
}

export function calculateDeckingInstallPayScaled(sqft: number): InstallCalcResult {
  const full = calculateInstallPayScaled(sqft)
  const hours = Math.round((full.hours * DECKING_INSTALL_HOURS_FACTOR) * 10) / 10
  const pay = Math.round((hours * INSTALL_HOURLY_RATE) / INSTALL_PAY_ROUND_TO) * INSTALL_PAY_ROUND_TO
  return { pay, hours, tierLabel: full.tierLabel, hourlyRate: INSTALL_HOURLY_RATE }
}

// ─── Marine Install Cost (half hours & pay of commercial) ─────────────────
export function calculateMarineInstallPay(boatSqft: number): InstallCalcResult {
  const full = calculateInstallPay(boatSqft)
  const hours = Math.round((full.hours / 2) * 10) / 10
  const pay = Math.round((hours * INSTALL_HOURLY_RATE) / INSTALL_PAY_ROUND_TO) * INSTALL_PAY_ROUND_TO
  return { pay, hours, tierLabel: full.tierLabel, hourlyRate: INSTALL_HOURLY_RATE }
}

// ─── Decking Install Cost (half hours, same as marine — flat surface) ─────
export const DECKING_INSTALL_HOURS_FACTOR = 0.5

export function calculateDeckingInstallPay(sqft: number): InstallCalcResult {
  const full = calculateInstallPay(sqft)
  const hours = Math.round((full.hours * DECKING_INSTALL_HOURS_FACTOR) * 10) / 10
  const pay = Math.round((hours * INSTALL_HOURLY_RATE) / INSTALL_PAY_ROUND_TO) * INSTALL_PAY_ROUND_TO
  return { pay, hours, tierLabel: full.tierLabel, hourlyRate: INSTALL_HOURLY_RATE }
}

// Tier reference for display (auto-generated from formula at representative sqft midpoints)
export const INSTALL_TIERS = [
  { label: 'XS',  sqftRange: '< 150',   ...calculateInstallPay(125) },
  { label: 'S',   sqftRange: '150-199',  ...calculateInstallPay(175) },
  { label: 'M',   sqftRange: '200-249',  ...calculateInstallPay(225) },
  { label: 'L',   sqftRange: '250-299',  ...calculateInstallPay(275) },
  { label: 'XL',  sqftRange: '300-399',  ...calculateInstallPay(350) },
  { label: 'XXL', sqftRange: '400-499',  ...calculateInstallPay(450) },
  { label: '3XL', sqftRange: '500-599',  ...calculateInstallPay(550) },
  { label: '4XL', sqftRange: '600+',     ...calculateInstallPay(650) },
] as const

// ─── Legacy: Standard Install Rates (reference only, replaced by formula) ──
/** @deprecated Use calculateInstallPay() instead */
export const STD_INSTALL_RATES: StdInstallRate[] = [
  { name: 'Small Car',   pay: 500,  hrs: 14, cat: 'Car' },
  { name: 'Med Car',     pay: 550,  hrs: 16, cat: 'Car' },
  { name: 'Full Car',    pay: 600,  hrs: 17, cat: 'Car' },
  { name: 'Sm Truck',    pay: 525,  hrs: 15, cat: 'Truck' },
  { name: 'Med Truck',   pay: 565,  hrs: 16, cat: 'Truck' },
  { name: 'Full Truck',  pay: 600,  hrs: 17, cat: 'Truck' },
  { name: 'Single Cab',  pay: 600,  hrs: 17, cat: 'Truck' },
  { name: 'Double Cab',  pay: 900,  hrs: 22, cat: 'Truck' },
  { name: 'Med Van',     pay: 525,  hrs: 15, cat: 'Van' },
  { name: 'Large Van',   pay: 600,  hrs: 17, cat: 'Van' },
  { name: 'XL Van',      pay: 625,  hrs: 18, cat: 'Van' },
  { name: 'XXL Van',     pay: 700,  hrs: 20, cat: 'Van' },
]

// ─── Material Options ──────────────────────────────────────────────────────
export const MATERIAL_OPTIONS: MaterialOption[] = [
  { id: 'avery1105',  name: 'Avery MPI 1105',    rate: 2.10 },
  { id: 'avery1005',  name: 'Avery MPI 1005',    rate: 1.85 },
  { id: '3m2080',     name: '3M 2080 Series',    rate: 2.50 },
  { id: '3mij180',    name: '3M IJ180',          rate: 2.30 },
  { id: 'averysupr',  name: 'Avery Supreme',     rate: 2.75 },
  { id: 'arlonslx',   name: 'Arlon SLX',         rate: 2.20 },
  { id: 'hexisskin',  name: 'Hexis Skintac',     rate: 2.00 },
]

// ─── PPF Packages ──────────────────────────────────────────────────────────
export const PPF_PACKAGES: PPFPackage[] = [
  { id: 'full_hood',     name: 'Full Hood',      sale: 650,  matCost: 200, yards: 4 },
  { id: 'partial_hood',  name: 'Partial Hood',   sale: 400,  matCost: 120, yards: 2.5 },
  { id: 'front_fenders', name: 'Front Fenders',  sale: 450,  matCost: 140, yards: 3 },
  { id: 'mirrors',       name: 'Mirrors (x2)',   sale: 150,  matCost: 30,  yards: 0.5 },
  { id: 'front_bumper',  name: 'Front Bumper',   sale: 550,  matCost: 160, yards: 3.5 },
  { id: 'rockers',       name: 'Rocker Panels',  sale: 550,  matCost: 150, yards: 3 },
  { id: 'a_pillars',     name: 'A-Pillars',      sale: 250,  matCost: 60,  yards: 1 },
  { id: 'full_front',    name: 'Full Front',     sale: 1850, matCost: 580, yards: 12 },
]

// ─── Product Type Labels ───────────────────────────────────────────────────
export const PRODUCT_TYPE_LABELS: Record<string, string> = {
  vehicle:   'Commercial Vehicle',
  boxtruck:  'Box Truck',
  trailer:   'Trailer',
  marine:    'Marine',
  ppf:       'PPF',
  decking:   'Boat Decking',
  wallwrap:  'Wall Wrap',
  signage:   'Signage',
  apparel:   'Apparel',
  print:     'Print',
  custom:    'Custom',
}

// ─── Coverage Labels ───────────────────────────────────────────────────────
export const COVERAGE_LABELS: Record<Coverage, string> = {
  half: '1/2 Wrap',
  threequarter: '3/4 Wrap',
  full: 'Full Wrap',
}
