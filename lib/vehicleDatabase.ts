// ─── Vehicle Panel Database ─────────────────────────────────────────────────
// Comprehensive vehicle lookup with per-panel sqft data for wrap calculators.
// All sqft values are realistic estimates based on industry standards.

export interface PanelData {
  id: string
  label: string
  sqft: number
  group: 'exterior' | 'trim' | 'structural'
}

export interface VehiclePanelSpec {
  make: string
  model: string
  variant?: string
  yearStart: number
  yearEnd: number
  category: 'sedan' | 'coupe' | 'suv' | 'crossover' | 'truck' | 'van' | 'commercial' | 'box_truck' | 'minivan'
  panels: PanelData[]
  totalSqft: number
  installHours: number
}

export interface WrapTier {
  id: 'good' | 'better' | 'best'
  name: string
  label: string
  description: string
  panelIds: string[] | 'ALL'
}

// ─── Panel Definitions ──────────────────────────────────────────────────────

export const PANEL_DEFINITIONS: Record<string, { label: string; group: 'exterior' | 'trim' | 'structural' }> = {
  hood:                   { label: 'Hood',                   group: 'exterior' },
  roof:                   { label: 'Roof',                   group: 'exterior' },
  trunk:                  { label: 'Trunk / Tailgate',       group: 'exterior' },
  full_driver_side:       { label: 'Full Driver Side',       group: 'exterior' },
  full_passenger_side:    { label: 'Full Passenger Side',    group: 'exterior' },
  driver_front_door:      { label: 'Driver Front Door',      group: 'exterior' },
  driver_rear_door:       { label: 'Driver Rear Door',       group: 'exterior' },
  passenger_front_door:   { label: 'Passenger Front Door',   group: 'exterior' },
  passenger_rear_door:    { label: 'Passenger Rear Door',    group: 'exterior' },
  front_bumper:           { label: 'Front Bumper',           group: 'trim' },
  rear_bumper:            { label: 'Rear Bumper',            group: 'trim' },
  driver_mirror:          { label: 'Driver Mirror',          group: 'trim' },
  passenger_mirror:       { label: 'Passenger Mirror',       group: 'trim' },
  driver_rocker:          { label: 'Driver Rocker Panel',    group: 'trim' },
  passenger_rocker:       { label: 'Passenger Rocker Panel', group: 'trim' },
  a_pillars:              { label: 'A-Pillars',              group: 'structural' },
  b_pillars:              { label: 'B-Pillars',              group: 'structural' },
  c_pillars:              { label: 'C-Pillars',              group: 'structural' },
  spoiler:                { label: 'Spoiler',                group: 'trim' },
  fender_front_driver:    { label: 'Front Fender (Driver)',  group: 'exterior' },
  fender_front_passenger: { label: 'Front Fender (Pass.)',   group: 'exterior' },
  quarter_rear_driver:    { label: 'Quarter Panel (Driver)', group: 'exterior' },
  quarter_rear_passenger: { label: 'Quarter Panel (Pass.)',  group: 'exterior' },
  // Commercial-specific
  cargo_driver_side:      { label: 'Cargo Driver Side',      group: 'exterior' },
  cargo_passenger_side:   { label: 'Cargo Passenger Side',   group: 'exterior' },
  cargo_rear_doors:       { label: 'Cargo Rear Doors',       group: 'exterior' },
  cargo_roof:             { label: 'Cargo Roof',             group: 'exterior' },
  box_driver_side:        { label: 'Box Driver Side',        group: 'exterior' },
  box_passenger_side:     { label: 'Box Passenger Side',     group: 'exterior' },
  box_rear:               { label: 'Box Rear',               group: 'exterior' },
  box_roof:               { label: 'Box Roof',               group: 'exterior' },
  cab_driver_side:        { label: 'Cab Driver Side',        group: 'exterior' },
  cab_passenger_side:     { label: 'Cab Passenger Side',     group: 'exterior' },
  bed_driver_side:        { label: 'Bed Driver Side',        group: 'exterior' },
  bed_passenger_side:     { label: 'Bed Passenger Side',     group: 'exterior' },
}

// ─── Default Wrap Tiers ─────────────────────────────────────────────────────

export const WRAP_TIERS: WrapTier[] = [
  {
    id: 'good',
    name: 'Good',
    label: 'Partial Accent',
    description: 'Hood, roof, and mirrors — accent wrap for branding visibility',
    panelIds: ['hood', 'roof', 'driver_mirror', 'passenger_mirror'],
  },
  {
    id: 'better',
    name: 'Better',
    label: 'Half / Commercial',
    description: 'All doors, hood, roof — ideal for commercial fleet branding',
    panelIds: [
      'hood', 'roof', 'driver_front_door', 'driver_rear_door',
      'passenger_front_door', 'passenger_rear_door',
      'driver_mirror', 'passenger_mirror',
    ],
  },
  {
    id: 'best',
    name: 'Best',
    label: 'Full Wrap',
    description: 'Every panel — complete color change or full commercial wrap',
    panelIds: ['ALL'],
  },
]

// ─── Waste Buffer Options ───────────────────────────────────────────────────

export const WASTE_BUFFER_OPTIONS = [
  { value: 5, label: '5%' },
  { value: 10, label: '10%' },
  { value: 15, label: '15%' },
  { value: 20, label: '20%' },
]

// ─── Helper: build panels array ─────────────────────────────────────────────

function p(id: string, sqft: number): PanelData {
  const def = PANEL_DEFINITIONS[id]
  return { id, label: def?.label || id, sqft, group: def?.group || 'exterior' }
}

// ─── Vehicle Database ───────────────────────────────────────────────────────

export const VEHICLE_DATABASE: VehiclePanelSpec[] = [
  // ── SEDANS ────────────────────────────────────────────────────────────────
  {
    make: 'Honda', model: 'Civic', yearStart: 2016, yearEnd: 2026,
    category: 'sedan', installHours: 14,
    panels: [
      p('hood', 14), p('roof', 16), p('trunk', 10),
      p('driver_front_door', 14), p('driver_rear_door', 12),
      p('passenger_front_door', 14), p('passenger_rear_door', 12),
      p('front_bumper', 10), p('rear_bumper', 9),
      p('driver_mirror', 1), p('passenger_mirror', 1),
      p('driver_rocker', 4), p('passenger_rocker', 4),
      p('a_pillars', 2), p('b_pillars', 2), p('c_pillars', 2),
      p('spoiler', 2),
      p('fender_front_driver', 8), p('fender_front_passenger', 8),
      p('quarter_rear_driver', 10), p('quarter_rear_passenger', 10),
    ],
    totalSqft: 165,
  },
  {
    make: 'Honda', model: 'Accord', yearStart: 2018, yearEnd: 2026,
    category: 'sedan', installHours: 16,
    panels: [
      p('hood', 16), p('roof', 18), p('trunk', 11),
      p('driver_front_door', 15), p('driver_rear_door', 13),
      p('passenger_front_door', 15), p('passenger_rear_door', 13),
      p('front_bumper', 11), p('rear_bumper', 10),
      p('driver_mirror', 1.5), p('passenger_mirror', 1.5),
      p('driver_rocker', 5), p('passenger_rocker', 5),
      p('a_pillars', 2.5), p('b_pillars', 2.5), p('c_pillars', 2.5),
      p('spoiler', 2.5),
      p('fender_front_driver', 9), p('fender_front_passenger', 9),
      p('quarter_rear_driver', 11), p('quarter_rear_passenger', 11),
    ],
    totalSqft: 185,
  },
  {
    make: 'Toyota', model: 'Camry', yearStart: 2018, yearEnd: 2026,
    category: 'sedan', installHours: 16,
    panels: [
      p('hood', 16), p('roof', 18), p('trunk', 12),
      p('driver_front_door', 15), p('driver_rear_door', 13),
      p('passenger_front_door', 15), p('passenger_rear_door', 13),
      p('front_bumper', 11), p('rear_bumper', 10),
      p('driver_mirror', 1.5), p('passenger_mirror', 1.5),
      p('driver_rocker', 5), p('passenger_rocker', 5),
      p('a_pillars', 2.5), p('b_pillars', 2.5), p('c_pillars', 2.5),
      p('spoiler', 2),
      p('fender_front_driver', 9), p('fender_front_passenger', 9),
      p('quarter_rear_driver', 11), p('quarter_rear_passenger', 11),
    ],
    totalSqft: 186,
  },
  {
    make: 'Toyota', model: 'Corolla', yearStart: 2019, yearEnd: 2026,
    category: 'sedan', installHours: 14,
    panels: [
      p('hood', 14), p('roof', 16), p('trunk', 10),
      p('driver_front_door', 13), p('driver_rear_door', 11),
      p('passenger_front_door', 13), p('passenger_rear_door', 11),
      p('front_bumper', 10), p('rear_bumper', 9),
      p('driver_mirror', 1), p('passenger_mirror', 1),
      p('driver_rocker', 4), p('passenger_rocker', 4),
      p('a_pillars', 2), p('b_pillars', 2), p('c_pillars', 2),
      p('spoiler', 2),
      p('fender_front_driver', 8), p('fender_front_passenger', 8),
      p('quarter_rear_driver', 9), p('quarter_rear_passenger', 9),
    ],
    totalSqft: 160,
  },
  {
    make: 'Tesla', model: 'Model 3', yearStart: 2017, yearEnd: 2026,
    category: 'sedan', installHours: 16,
    panels: [
      p('hood', 18), p('roof', 20), p('trunk', 12),
      p('driver_front_door', 14), p('driver_rear_door', 12),
      p('passenger_front_door', 14), p('passenger_rear_door', 12),
      p('front_bumper', 12), p('rear_bumper', 10),
      p('driver_mirror', 1), p('passenger_mirror', 1),
      p('driver_rocker', 5), p('passenger_rocker', 5),
      p('a_pillars', 2), p('b_pillars', 2), p('c_pillars', 2),
      p('fender_front_driver', 9), p('fender_front_passenger', 9),
      p('quarter_rear_driver', 10), p('quarter_rear_passenger', 10),
    ],
    totalSqft: 180,
  },

  // ── CROSSOVERS / SUVs ─────────────────────────────────────────────────────
  {
    make: 'Honda', model: 'CR-V', yearStart: 2017, yearEnd: 2026,
    category: 'crossover', installHours: 17,
    panels: [
      p('hood', 17), p('roof', 22), p('trunk', 14),
      p('driver_front_door', 16), p('driver_rear_door', 14),
      p('passenger_front_door', 16), p('passenger_rear_door', 14),
      p('front_bumper', 12), p('rear_bumper', 11),
      p('driver_mirror', 1.5), p('passenger_mirror', 1.5),
      p('driver_rocker', 5), p('passenger_rocker', 5),
      p('a_pillars', 3), p('b_pillars', 3), p('c_pillars', 3),
      p('fender_front_driver', 10), p('fender_front_passenger', 10),
      p('quarter_rear_driver', 12), p('quarter_rear_passenger', 12),
    ],
    totalSqft: 212,
  },
  {
    make: 'Toyota', model: 'RAV4', yearStart: 2019, yearEnd: 2026,
    category: 'crossover', installHours: 17,
    panels: [
      p('hood', 17), p('roof', 22), p('trunk', 14),
      p('driver_front_door', 16), p('driver_rear_door', 14),
      p('passenger_front_door', 16), p('passenger_rear_door', 14),
      p('front_bumper', 12), p('rear_bumper', 11),
      p('driver_mirror', 1.5), p('passenger_mirror', 1.5),
      p('driver_rocker', 5), p('passenger_rocker', 5),
      p('a_pillars', 3), p('b_pillars', 3), p('c_pillars', 3),
      p('fender_front_driver', 10), p('fender_front_passenger', 10),
      p('quarter_rear_driver', 12), p('quarter_rear_passenger', 12),
    ],
    totalSqft: 212,
  },
  {
    make: 'Tesla', model: 'Model Y', yearStart: 2020, yearEnd: 2026,
    category: 'crossover', installHours: 18,
    panels: [
      p('hood', 20), p('roof', 26), p('trunk', 16),
      p('driver_front_door', 16), p('driver_rear_door', 14),
      p('passenger_front_door', 16), p('passenger_rear_door', 14),
      p('front_bumper', 13), p('rear_bumper', 11),
      p('driver_mirror', 1.5), p('passenger_mirror', 1.5),
      p('driver_rocker', 5), p('passenger_rocker', 5),
      p('a_pillars', 3), p('b_pillars', 3), p('c_pillars', 3),
      p('fender_front_driver', 10), p('fender_front_passenger', 10),
      p('quarter_rear_driver', 13), p('quarter_rear_passenger', 13),
    ],
    totalSqft: 224,
  },
  {
    make: 'Tesla', model: 'Model X', yearStart: 2016, yearEnd: 2026,
    category: 'suv', installHours: 22,
    panels: [
      p('hood', 22), p('roof', 30), p('trunk', 18),
      p('driver_front_door', 18), p('driver_rear_door', 16),
      p('passenger_front_door', 18), p('passenger_rear_door', 16),
      p('front_bumper', 14), p('rear_bumper', 12),
      p('driver_mirror', 2), p('passenger_mirror', 2),
      p('driver_rocker', 6), p('passenger_rocker', 6),
      p('a_pillars', 3), p('b_pillars', 3), p('c_pillars', 3),
      p('fender_front_driver', 12), p('fender_front_passenger', 12),
      p('quarter_rear_driver', 14), p('quarter_rear_passenger', 14),
    ],
    totalSqft: 262,
  },
  {
    make: 'Subaru', model: 'Outback', yearStart: 2015, yearEnd: 2026,
    category: 'crossover', installHours: 17,
    panels: [
      p('hood', 17), p('roof', 24), p('trunk', 14),
      p('driver_front_door', 15), p('driver_rear_door', 14),
      p('passenger_front_door', 15), p('passenger_rear_door', 14),
      p('front_bumper', 12), p('rear_bumper', 11),
      p('driver_mirror', 1.5), p('passenger_mirror', 1.5),
      p('driver_rocker', 5), p('passenger_rocker', 5),
      p('a_pillars', 2.5), p('b_pillars', 2.5), p('c_pillars', 2.5),
      p('fender_front_driver', 9), p('fender_front_passenger', 9),
      p('quarter_rear_driver', 11), p('quarter_rear_passenger', 11),
    ],
    totalSqft: 207,
  },
  {
    make: 'Subaru', model: 'Forester', yearStart: 2019, yearEnd: 2026,
    category: 'crossover', installHours: 17,
    panels: [
      p('hood', 16), p('roof', 22), p('trunk', 14),
      p('driver_front_door', 15), p('driver_rear_door', 13),
      p('passenger_front_door', 15), p('passenger_rear_door', 13),
      p('front_bumper', 12), p('rear_bumper', 11),
      p('driver_mirror', 1.5), p('passenger_mirror', 1.5),
      p('driver_rocker', 5), p('passenger_rocker', 5),
      p('a_pillars', 3), p('b_pillars', 3), p('c_pillars', 3),
      p('fender_front_driver', 9), p('fender_front_passenger', 9),
      p('quarter_rear_driver', 11), p('quarter_rear_passenger', 11),
    ],
    totalSqft: 204,
  },
  {
    make: 'Jeep', model: 'Wrangler', yearStart: 2018, yearEnd: 2026,
    category: 'suv', installHours: 18,
    panels: [
      p('hood', 18), p('roof', 16), p('trunk', 10),
      p('driver_front_door', 14), p('driver_rear_door', 13),
      p('passenger_front_door', 14), p('passenger_rear_door', 13),
      p('front_bumper', 10), p('rear_bumper', 10),
      p('driver_mirror', 1.5), p('passenger_mirror', 1.5),
      p('driver_rocker', 5), p('passenger_rocker', 5),
      p('a_pillars', 3), p('b_pillars', 3), p('c_pillars', 2),
      p('fender_front_driver', 12), p('fender_front_passenger', 12),
      p('quarter_rear_driver', 14), p('quarter_rear_passenger', 14),
    ],
    totalSqft: 191,
  },
  {
    make: 'Jeep', model: 'Gladiator', yearStart: 2020, yearEnd: 2026,
    category: 'truck', installHours: 20,
    panels: [
      p('hood', 18), p('roof', 16),
      p('driver_front_door', 14), p('driver_rear_door', 13),
      p('passenger_front_door', 14), p('passenger_rear_door', 13),
      p('front_bumper', 10), p('rear_bumper', 10),
      p('driver_mirror', 1.5), p('passenger_mirror', 1.5),
      p('driver_rocker', 6), p('passenger_rocker', 6),
      p('a_pillars', 3), p('b_pillars', 3), p('c_pillars', 2),
      p('fender_front_driver', 12), p('fender_front_passenger', 12),
      p('quarter_rear_driver', 14), p('quarter_rear_passenger', 14),
      p('bed_driver_side', 16), p('bed_passenger_side', 16),
      p('trunk', 8),
    ],
    totalSqft: 224,
  },

  // ── TRUCKS ────────────────────────────────────────────────────────────────
  {
    make: 'Ford', model: 'F-150', yearStart: 2015, yearEnd: 2026,
    category: 'truck', installHours: 20,
    panels: [
      p('hood', 22), p('roof', 28),
      p('driver_front_door', 17), p('driver_rear_door', 15),
      p('passenger_front_door', 17), p('passenger_rear_door', 15),
      p('front_bumper', 14), p('rear_bumper', 12),
      p('driver_mirror', 2), p('passenger_mirror', 2),
      p('driver_rocker', 7), p('passenger_rocker', 7),
      p('a_pillars', 3), p('b_pillars', 3), p('c_pillars', 2),
      p('fender_front_driver', 12), p('fender_front_passenger', 12),
      p('quarter_rear_driver', 14), p('quarter_rear_passenger', 14),
      p('bed_driver_side', 18), p('bed_passenger_side', 18),
      p('trunk', 10),
    ],
    totalSqft: 284,
  },
  {
    make: 'Ford', model: 'F-250', yearStart: 2017, yearEnd: 2026,
    category: 'truck', installHours: 24,
    panels: [
      p('hood', 24), p('roof', 32),
      p('driver_front_door', 19), p('driver_rear_door', 17),
      p('passenger_front_door', 19), p('passenger_rear_door', 17),
      p('front_bumper', 16), p('rear_bumper', 14),
      p('driver_mirror', 2.5), p('passenger_mirror', 2.5),
      p('driver_rocker', 8), p('passenger_rocker', 8),
      p('a_pillars', 3.5), p('b_pillars', 3.5), p('c_pillars', 2.5),
      p('fender_front_driver', 14), p('fender_front_passenger', 14),
      p('quarter_rear_driver', 16), p('quarter_rear_passenger', 16),
      p('bed_driver_side', 20), p('bed_passenger_side', 20),
      p('trunk', 12),
    ],
    totalSqft: 320,
  },
  {
    make: 'Chevrolet', model: 'Silverado', yearStart: 2019, yearEnd: 2026,
    category: 'truck', installHours: 20,
    panels: [
      p('hood', 22), p('roof', 28),
      p('driver_front_door', 17), p('driver_rear_door', 15),
      p('passenger_front_door', 17), p('passenger_rear_door', 15),
      p('front_bumper', 14), p('rear_bumper', 12),
      p('driver_mirror', 2), p('passenger_mirror', 2),
      p('driver_rocker', 7), p('passenger_rocker', 7),
      p('a_pillars', 3), p('b_pillars', 3), p('c_pillars', 2),
      p('fender_front_driver', 12), p('fender_front_passenger', 12),
      p('quarter_rear_driver', 14), p('quarter_rear_passenger', 14),
      p('bed_driver_side', 18), p('bed_passenger_side', 18),
      p('trunk', 10),
    ],
    totalSqft: 284,
  },
  {
    make: 'GMC', model: 'Sierra', yearStart: 2019, yearEnd: 2026,
    category: 'truck', installHours: 20,
    panels: [
      p('hood', 22), p('roof', 28),
      p('driver_front_door', 17), p('driver_rear_door', 15),
      p('passenger_front_door', 17), p('passenger_rear_door', 15),
      p('front_bumper', 14), p('rear_bumper', 12),
      p('driver_mirror', 2), p('passenger_mirror', 2),
      p('driver_rocker', 7), p('passenger_rocker', 7),
      p('a_pillars', 3), p('b_pillars', 3), p('c_pillars', 2),
      p('fender_front_driver', 12), p('fender_front_passenger', 12),
      p('quarter_rear_driver', 14), p('quarter_rear_passenger', 14),
      p('bed_driver_side', 18), p('bed_passenger_side', 18),
      p('trunk', 10),
    ],
    totalSqft: 284,
  },
  {
    make: 'Toyota', model: 'Tacoma', yearStart: 2016, yearEnd: 2026,
    category: 'truck', installHours: 17,
    panels: [
      p('hood', 18), p('roof', 22),
      p('driver_front_door', 15), p('driver_rear_door', 13),
      p('passenger_front_door', 15), p('passenger_rear_door', 13),
      p('front_bumper', 12), p('rear_bumper', 10),
      p('driver_mirror', 1.5), p('passenger_mirror', 1.5),
      p('driver_rocker', 6), p('passenger_rocker', 6),
      p('a_pillars', 2.5), p('b_pillars', 2.5), p('c_pillars', 2),
      p('fender_front_driver', 10), p('fender_front_passenger', 10),
      p('quarter_rear_driver', 12), p('quarter_rear_passenger', 12),
      p('bed_driver_side', 14), p('bed_passenger_side', 14),
      p('trunk', 8),
    ],
    totalSqft: 240,
  },
  {
    make: 'Toyota', model: 'Tundra', yearStart: 2022, yearEnd: 2026,
    category: 'truck', installHours: 22,
    panels: [
      p('hood', 24), p('roof', 30),
      p('driver_front_door', 18), p('driver_rear_door', 16),
      p('passenger_front_door', 18), p('passenger_rear_door', 16),
      p('front_bumper', 15), p('rear_bumper', 13),
      p('driver_mirror', 2), p('passenger_mirror', 2),
      p('driver_rocker', 7), p('passenger_rocker', 7),
      p('a_pillars', 3), p('b_pillars', 3), p('c_pillars', 2.5),
      p('fender_front_driver', 13), p('fender_front_passenger', 13),
      p('quarter_rear_driver', 15), p('quarter_rear_passenger', 15),
      p('bed_driver_side', 18), p('bed_passenger_side', 18),
      p('trunk', 10),
    ],
    totalSqft: 298,
  },
  {
    make: 'RAM', model: '1500', yearStart: 2019, yearEnd: 2026,
    category: 'truck', installHours: 20,
    panels: [
      p('hood', 22), p('roof', 28),
      p('driver_front_door', 17), p('driver_rear_door', 15),
      p('passenger_front_door', 17), p('passenger_rear_door', 15),
      p('front_bumper', 14), p('rear_bumper', 12),
      p('driver_mirror', 2), p('passenger_mirror', 2),
      p('driver_rocker', 7), p('passenger_rocker', 7),
      p('a_pillars', 3), p('b_pillars', 3), p('c_pillars', 2),
      p('fender_front_driver', 12), p('fender_front_passenger', 12),
      p('quarter_rear_driver', 14), p('quarter_rear_passenger', 14),
      p('bed_driver_side', 18), p('bed_passenger_side', 18),
      p('trunk', 10),
    ],
    totalSqft: 284,
  },
  {
    make: 'RAM', model: '2500', yearStart: 2019, yearEnd: 2026,
    category: 'truck', installHours: 24,
    panels: [
      p('hood', 24), p('roof', 32),
      p('driver_front_door', 19), p('driver_rear_door', 17),
      p('passenger_front_door', 19), p('passenger_rear_door', 17),
      p('front_bumper', 16), p('rear_bumper', 14),
      p('driver_mirror', 2.5), p('passenger_mirror', 2.5),
      p('driver_rocker', 8), p('passenger_rocker', 8),
      p('a_pillars', 3.5), p('b_pillars', 3.5), p('c_pillars', 2.5),
      p('fender_front_driver', 14), p('fender_front_passenger', 14),
      p('quarter_rear_driver', 16), p('quarter_rear_passenger', 16),
      p('bed_driver_side', 20), p('bed_passenger_side', 20),
      p('trunk', 12),
    ],
    totalSqft: 320,
  },

  // ── VANS ──────────────────────────────────────────────────────────────────
  {
    make: 'Ford', model: 'Transit', variant: 'Low Roof',
    yearStart: 2015, yearEnd: 2026,
    category: 'van', installHours: 22,
    panels: [
      p('hood', 18), p('roof', 35),
      p('driver_front_door', 14), p('passenger_front_door', 14),
      p('cargo_driver_side', 42), p('cargo_passenger_side', 42),
      p('cargo_rear_doors', 28),
      p('front_bumper', 14), p('rear_bumper', 12),
      p('driver_mirror', 2), p('passenger_mirror', 2),
      p('driver_rocker', 8), p('passenger_rocker', 8),
      p('a_pillars', 3), p('b_pillars', 3),
      p('fender_front_driver', 10), p('fender_front_passenger', 10),
    ],
    totalSqft: 265,
  },
  {
    make: 'Ford', model: 'Transit', variant: 'Med Roof',
    yearStart: 2015, yearEnd: 2026,
    category: 'van', installHours: 26,
    panels: [
      p('hood', 18), p('roof', 40),
      p('driver_front_door', 14), p('passenger_front_door', 14),
      p('cargo_driver_side', 52), p('cargo_passenger_side', 52),
      p('cargo_rear_doors', 32),
      p('front_bumper', 14), p('rear_bumper', 12),
      p('driver_mirror', 2), p('passenger_mirror', 2),
      p('driver_rocker', 8), p('passenger_rocker', 8),
      p('a_pillars', 3), p('b_pillars', 3),
      p('fender_front_driver', 10), p('fender_front_passenger', 10),
    ],
    totalSqft: 304,
  },
  {
    make: 'Ford', model: 'Transit', variant: 'High Roof',
    yearStart: 2015, yearEnd: 2026,
    category: 'van', installHours: 30,
    panels: [
      p('hood', 18), p('roof', 48),
      p('driver_front_door', 14), p('passenger_front_door', 14),
      p('cargo_driver_side', 64), p('cargo_passenger_side', 64),
      p('cargo_rear_doors', 38),
      p('front_bumper', 14), p('rear_bumper', 12),
      p('driver_mirror', 2), p('passenger_mirror', 2),
      p('driver_rocker', 8), p('passenger_rocker', 8),
      p('a_pillars', 3), p('b_pillars', 3),
      p('fender_front_driver', 10), p('fender_front_passenger', 10),
    ],
    totalSqft: 352,
  },
  {
    make: 'Ford', model: 'E-Series', yearStart: 2008, yearEnd: 2026,
    category: 'van', installHours: 22,
    panels: [
      p('hood', 20), p('roof', 38),
      p('driver_front_door', 14), p('passenger_front_door', 14),
      p('cargo_driver_side', 45), p('cargo_passenger_side', 45),
      p('cargo_rear_doors', 30),
      p('front_bumper', 14), p('rear_bumper', 12),
      p('driver_mirror', 2), p('passenger_mirror', 2),
      p('driver_rocker', 7), p('passenger_rocker', 7),
      p('a_pillars', 3), p('b_pillars', 3),
      p('fender_front_driver', 10), p('fender_front_passenger', 10),
    ],
    totalSqft: 276,
  },
  {
    make: 'Chevrolet', model: 'Express', yearStart: 2003, yearEnd: 2026,
    category: 'van', installHours: 22,
    panels: [
      p('hood', 20), p('roof', 38),
      p('driver_front_door', 14), p('passenger_front_door', 14),
      p('cargo_driver_side', 45), p('cargo_passenger_side', 45),
      p('cargo_rear_doors', 30),
      p('front_bumper', 14), p('rear_bumper', 12),
      p('driver_mirror', 2), p('passenger_mirror', 2),
      p('driver_rocker', 7), p('passenger_rocker', 7),
      p('a_pillars', 3), p('b_pillars', 3),
      p('fender_front_driver', 10), p('fender_front_passenger', 10),
    ],
    totalSqft: 276,
  },
  {
    make: 'GMC', model: 'Savana', yearStart: 2003, yearEnd: 2026,
    category: 'van', installHours: 22,
    panels: [
      p('hood', 20), p('roof', 38),
      p('driver_front_door', 14), p('passenger_front_door', 14),
      p('cargo_driver_side', 45), p('cargo_passenger_side', 45),
      p('cargo_rear_doors', 30),
      p('front_bumper', 14), p('rear_bumper', 12),
      p('driver_mirror', 2), p('passenger_mirror', 2),
      p('driver_rocker', 7), p('passenger_rocker', 7),
      p('a_pillars', 3), p('b_pillars', 3),
      p('fender_front_driver', 10), p('fender_front_passenger', 10),
    ],
    totalSqft: 276,
  },
  {
    make: 'Mercedes-Benz', model: 'Sprinter', variant: '144" WB',
    yearStart: 2019, yearEnd: 2026,
    category: 'van', installHours: 26,
    panels: [
      p('hood', 16), p('roof', 42),
      p('driver_front_door', 14), p('passenger_front_door', 14),
      p('cargo_driver_side', 48), p('cargo_passenger_side', 48),
      p('cargo_rear_doors', 34),
      p('front_bumper', 14), p('rear_bumper', 12),
      p('driver_mirror', 2), p('passenger_mirror', 2),
      p('driver_rocker', 8), p('passenger_rocker', 8),
      p('a_pillars', 3), p('b_pillars', 3),
      p('fender_front_driver', 9), p('fender_front_passenger', 9),
    ],
    totalSqft: 286,
  },
  {
    make: 'Mercedes-Benz', model: 'Sprinter', variant: '170" WB',
    yearStart: 2019, yearEnd: 2026,
    category: 'van', installHours: 32,
    panels: [
      p('hood', 16), p('roof', 52),
      p('driver_front_door', 14), p('passenger_front_door', 14),
      p('cargo_driver_side', 62), p('cargo_passenger_side', 62),
      p('cargo_rear_doors', 38),
      p('front_bumper', 14), p('rear_bumper', 12),
      p('driver_mirror', 2), p('passenger_mirror', 2),
      p('driver_rocker', 9), p('passenger_rocker', 9),
      p('a_pillars', 3), p('b_pillars', 3),
      p('fender_front_driver', 9), p('fender_front_passenger', 9),
    ],
    totalSqft: 340,
  },
  {
    make: 'Mercedes-Benz', model: 'Metris', yearStart: 2016, yearEnd: 2026,
    category: 'van', installHours: 18,
    panels: [
      p('hood', 14), p('roof', 28),
      p('driver_front_door', 12), p('passenger_front_door', 12),
      p('cargo_driver_side', 32), p('cargo_passenger_side', 32),
      p('cargo_rear_doors', 22),
      p('front_bumper', 12), p('rear_bumper', 10),
      p('driver_mirror', 1.5), p('passenger_mirror', 1.5),
      p('driver_rocker', 6), p('passenger_rocker', 6),
      p('a_pillars', 2.5), p('b_pillars', 2.5),
      p('fender_front_driver', 8), p('fender_front_passenger', 8),
    ],
    totalSqft: 210,
  },
  {
    make: 'RAM', model: 'ProMaster', yearStart: 2014, yearEnd: 2026,
    category: 'van', installHours: 28,
    panels: [
      p('hood', 16), p('roof', 46),
      p('driver_front_door', 14), p('passenger_front_door', 14),
      p('cargo_driver_side', 56), p('cargo_passenger_side', 56),
      p('cargo_rear_doors', 36),
      p('front_bumper', 16), p('rear_bumper', 12),
      p('driver_mirror', 2), p('passenger_mirror', 2),
      p('driver_rocker', 8), p('passenger_rocker', 8),
      p('a_pillars', 3), p('b_pillars', 3),
      p('fender_front_driver', 10), p('fender_front_passenger', 10),
    ],
    totalSqft: 322,
  },
  {
    make: 'Toyota', model: 'Sienna', yearStart: 2021, yearEnd: 2026,
    category: 'minivan', installHours: 18,
    panels: [
      p('hood', 16), p('roof', 24),
      p('driver_front_door', 15), p('driver_rear_door', 16),
      p('passenger_front_door', 15), p('passenger_rear_door', 16),
      p('trunk', 14),
      p('front_bumper', 12), p('rear_bumper', 11),
      p('driver_mirror', 1.5), p('passenger_mirror', 1.5),
      p('driver_rocker', 6), p('passenger_rocker', 6),
      p('a_pillars', 3), p('b_pillars', 3), p('c_pillars', 3),
      p('fender_front_driver', 10), p('fender_front_passenger', 10),
      p('quarter_rear_driver', 12), p('quarter_rear_passenger', 12),
    ],
    totalSqft: 218,
  },

  // ── COMMERCIAL / BOX TRUCKS ───────────────────────────────────────────────
  {
    make: 'Isuzu', model: 'NPR', yearStart: 2016, yearEnd: 2026,
    category: 'box_truck', installHours: 24,
    panels: [
      p('hood', 14), p('cab_driver_side', 18), p('cab_passenger_side', 18),
      p('box_driver_side', 80), p('box_passenger_side', 80),
      p('box_rear', 48), p('box_roof', 75),
      p('front_bumper', 10),
      p('driver_mirror', 2), p('passenger_mirror', 2),
    ],
    totalSqft: 347,
  },
  {
    make: 'Isuzu', model: 'NQR', yearStart: 2016, yearEnd: 2026,
    category: 'box_truck', installHours: 28,
    panels: [
      p('hood', 14), p('cab_driver_side', 18), p('cab_passenger_side', 18),
      p('box_driver_side', 96), p('box_passenger_side', 96),
      p('box_rear', 56), p('box_roof', 90),
      p('front_bumper', 10),
      p('driver_mirror', 2), p('passenger_mirror', 2),
    ],
    totalSqft: 402,
  },
  {
    make: 'Freightliner', model: 'M2', variant: '20ft Box',
    yearStart: 2012, yearEnd: 2026,
    category: 'box_truck', installHours: 28,
    panels: [
      p('hood', 16), p('cab_driver_side', 20), p('cab_passenger_side', 20),
      p('box_driver_side', 100), p('box_passenger_side', 100),
      p('box_rear', 56), p('box_roof', 95),
      p('front_bumper', 12),
      p('driver_mirror', 2), p('passenger_mirror', 2),
    ],
    totalSqft: 423,
  },
  {
    make: 'Freightliner', model: 'M2', variant: '24ft Box',
    yearStart: 2012, yearEnd: 2026,
    category: 'box_truck', installHours: 32,
    panels: [
      p('hood', 16), p('cab_driver_side', 20), p('cab_passenger_side', 20),
      p('box_driver_side', 120), p('box_passenger_side', 120),
      p('box_rear', 56), p('box_roof', 114),
      p('front_bumper', 12),
      p('driver_mirror', 2), p('passenger_mirror', 2),
    ],
    totalSqft: 482,
  },
  {
    make: 'Freightliner', model: 'M2', variant: '26ft Box',
    yearStart: 2012, yearEnd: 2026,
    category: 'box_truck', installHours: 36,
    panels: [
      p('hood', 16), p('cab_driver_side', 20), p('cab_passenger_side', 20),
      p('box_driver_side', 130), p('box_passenger_side', 130),
      p('box_rear', 56), p('box_roof', 124),
      p('front_bumper', 12),
      p('driver_mirror', 2), p('passenger_mirror', 2),
    ],
    totalSqft: 512,
  },
]

// ─── Lookup Helpers ─────────────────────────────────────────────────────────

/** Get unique makes from the database */
export function getAvailableMakes(): string[] {
  return [...new Set(VEHICLE_DATABASE.map(v => v.make))].sort()
}

/** Get models for a given make */
export function getModelsForMake(make: string): { model: string; variant?: string }[] {
  const seen = new Set<string>()
  const result: { model: string; variant?: string }[] = []
  VEHICLE_DATABASE
    .filter(v => v.make === make)
    .forEach(v => {
      const key = v.variant ? `${v.model}|${v.variant}` : v.model
      if (!seen.has(key)) {
        seen.add(key)
        result.push({ model: v.model, variant: v.variant })
      }
    })
  return result.sort((a, b) => a.model.localeCompare(b.model))
}

/** Find a vehicle spec by make, model, variant, and optionally year */
export function findVehicleSpec(
  make: string,
  model: string,
  variant?: string,
  year?: number,
): VehiclePanelSpec | null {
  return VEHICLE_DATABASE.find(v => {
    if (v.make !== make || v.model !== model) return false
    if (variant && v.variant !== variant) return false
    if (!variant && v.variant) return false
    if (year && (year < v.yearStart || year > v.yearEnd)) return false
    return true
  }) || VEHICLE_DATABASE.find(v => {
    if (v.make !== make || v.model !== model) return false
    if (variant && v.variant !== variant) return false
    if (!variant && v.variant) return false
    return true
  }) || null
}

/** Calculate total sqft for selected panels */
export function calcSelectedSqft(panels: PanelData[], selectedIds: string[]): number {
  return panels
    .filter(p => selectedIds.includes(p.id))
    .reduce((sum, p) => sum + p.sqft, 0)
}

/** Calculate sqft with waste buffer */
export function calcWithWaste(sqft: number, wastePercent: number): number {
  return Math.ceil(sqft * (1 + wastePercent / 100))
}

/** Convert sqft to linear feet (standard 54" / 4.5ft material width) */
export function sqftToLinearFeet(sqft: number): number {
  return Math.ceil(sqft / 4.5 * 10) / 10
}

/** Get panel IDs for a tier */
export function getTierPanelIds(tier: WrapTier, allPanels: PanelData[]): string[] {
  if (tier.panelIds === 'ALL') return allPanels.map(p => p.id)
  return tier.panelIds.filter(id => allPanels.some(p => p.id === id))
}
