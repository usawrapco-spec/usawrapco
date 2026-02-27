import type { StdInstallRate, MaterialOption, PPFPackage, Coverage } from './types'

// ─── Van Pricing Matrix ────────────────────────────────────────────────────
// Maps van size + coverage → flat sale price
export const VAN_PRICING: Record<string, Record<Coverage, number>> = {
  medium:  { half: 2240, threequarter: 2980,  full: 4360  },
  large:   { half: 2760, threequarter: 3510,  full: 4600  },
  xlarge:  { half: 3390, threequarter: 4690,  full: 6450  },
  xxlarge: { half: 3700, threequarter: 5120,  full: 6990  },
}

// ─── Standard Install Rates ────────────────────────────────────────────────
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
