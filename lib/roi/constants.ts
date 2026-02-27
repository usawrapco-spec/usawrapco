// Shared ROI constants used by both public funnel and internal calculator

export const INDUSTRIES: {
  label: string
  ltvMin: number
  ltvMax: number
  conversionRate: number
}[] = [
  { label: 'Plumber', ltvMin: 600, ltvMax: 1500, conversionRate: 0.012 },
  { label: 'HVAC', ltvMin: 1200, ltvMax: 2500, conversionRate: 0.010 },
  { label: 'Roofer', ltvMin: 1500, ltvMax: 3500, conversionRate: 0.008 },
  { label: 'Electrician', ltvMin: 500, ltvMax: 1300, conversionRate: 0.013 },
  { label: 'Landscaper', ltvMin: 400, ltvMax: 1100, conversionRate: 0.015 },
  { label: 'Painter', ltvMin: 800, ltvMax: 1600, conversionRate: 0.011 },
  { label: 'General Contractor', ltvMin: 2000, ltvMax: 5000, conversionRate: 0.007 },
  { label: 'Custom', ltvMin: 500, ltvMax: 5000, conversionRate: 0.010 },
]

export const CPM_COMPARISONS = [
  { channel: 'Vehicle Wrap', cpm: 0.77, color: 'var(--green)' },
  { channel: 'Billboard', cpm: 3.56, color: 'var(--amber)' },
  { channel: 'Google Display', cpm: 2.80, color: 'var(--accent)' },
  { channel: 'Radio', cpm: 13.00, color: 'var(--purple)' },
  { channel: 'Direct Mail', cpm: 19.00, color: 'var(--red)' },
]

export const VEHICLE_MULTIPLIERS: Record<string, number> = {
  van: 1.4,
  truck: 1.3,
  suv: 1.1,
  car: 1.0,
  trailer: 1.6,
  box_truck: 1.8,
}

export const CITY_DENSITY: Record<string, number> = {
  'new york': 3.2, 'los angeles': 2.8, 'chicago': 2.5, 'houston': 2.3,
  'phoenix': 2.0, 'philadelphia': 2.2, 'san antonio': 1.8, 'san diego': 2.1,
  'dallas': 2.3, 'san jose': 2.4, 'austin': 2.1, 'jacksonville': 1.7,
  'fort worth': 1.9, 'columbus': 1.8, 'charlotte': 1.9, 'san francisco': 2.6,
  'indianapolis': 1.7, 'seattle': 2.3, 'denver': 2.1, 'nashville': 2.0,
  'oklahoma city': 1.6, 'el paso': 1.5, 'boston': 2.4, 'portland': 2.0,
  'las vegas': 2.2, 'memphis': 1.6, 'louisville': 1.6, 'baltimore': 2.0,
  'milwaukee': 1.7, 'albuquerque': 1.5, 'tucson': 1.5, 'fresno': 1.6,
  'sacramento': 1.8, 'mesa': 1.7, 'kansas city': 1.7, 'atlanta': 2.4,
  'omaha': 1.5, 'colorado springs': 1.6, 'raleigh': 1.8, 'long beach': 2.2,
  'virginia beach': 1.6, 'miami': 2.5, 'oakland': 2.3, 'minneapolis': 2.0,
  'tampa': 2.0, 'tulsa': 1.5, 'arlington': 1.9, 'new orleans': 1.8,
}

export const CITY_TYPE_VEHICLES_PER_MILE: Record<string, number> = {
  urban: 800,
  suburban: 400,
  rural: 100,
}
