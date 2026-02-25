import type React from 'react'

export const VEHICLE_PANELS: Record<string, { label: string; sqft: number }[]> = {
  'Pickup Truck Crew Cab': [
    { label: 'Driver Side', sqft: 65 },
    { label: 'Passenger Side', sqft: 65 },
    { label: 'Hood', sqft: 30 },
    { label: 'Roof', sqft: 22 },
    { label: 'Rear / Tailgate', sqft: 18 },
    { label: 'Front Bumper', sqft: 10 },
    { label: 'Rear Bumper', sqft: 8 },
    { label: 'Mirrors', sqft: 4 },
  ],
  'Pickup Truck Regular Cab': [
    { label: 'Driver Side', sqft: 48 },
    { label: 'Passenger Side', sqft: 48 },
    { label: 'Hood', sqft: 28 },
    { label: 'Roof', sqft: 16 },
    { label: 'Rear / Tailgate', sqft: 16 },
    { label: 'Front Bumper', sqft: 8 },
    { label: 'Rear Bumper', sqft: 7 },
    { label: 'Mirrors', sqft: 4 },
  ],
  'SUV Full Size': [
    { label: 'Driver Side', sqft: 62 },
    { label: 'Passenger Side', sqft: 62 },
    { label: 'Hood', sqft: 28 },
    { label: 'Roof', sqft: 26 },
    { label: 'Rear', sqft: 18 },
    { label: 'Front Bumper', sqft: 10 },
    { label: 'Rear Bumper', sqft: 8 },
    { label: 'Mirrors', sqft: 4 },
  ],
  'SUV Medium': [
    { label: 'Driver Side', sqft: 52 },
    { label: 'Passenger Side', sqft: 52 },
    { label: 'Hood', sqft: 24 },
    { label: 'Roof', sqft: 20 },
    { label: 'Rear', sqft: 16 },
    { label: 'Front Bumper', sqft: 8 },
    { label: 'Rear Bumper', sqft: 7 },
    { label: 'Mirrors', sqft: 3 },
  ],
  'Sedan': [
    { label: 'Driver Side', sqft: 45 },
    { label: 'Passenger Side', sqft: 45 },
    { label: 'Hood', sqft: 22 },
    { label: 'Roof', sqft: 18 },
    { label: 'Trunk', sqft: 14 },
    { label: 'Front Bumper', sqft: 8 },
    { label: 'Rear Bumper', sqft: 7 },
    { label: 'Mirrors', sqft: 3 },
  ],
  'Cargo Van Standard': [
    { label: 'Driver Side', sqft: 80 },
    { label: 'Passenger Side', sqft: 80 },
    { label: 'Rear Doors', sqft: 38 },
    { label: 'Hood', sqft: 22 },
    { label: 'Roof', sqft: 48 },
    { label: 'Front Bumper', sqft: 10 },
    { label: 'Mirrors', sqft: 4 },
  ],
  'Cargo Van High Roof': [
    { label: 'Driver Side', sqft: 110 },
    { label: 'Passenger Side', sqft: 110 },
    { label: 'Rear Doors', sqft: 48 },
    { label: 'Hood', sqft: 22 },
    { label: 'Roof', sqft: 55 },
    { label: 'Front Bumper', sqft: 10 },
    { label: 'Mirrors', sqft: 4 },
  ],
  'Sprinter Van': [
    { label: 'Driver Side', sqft: 120 },
    { label: 'Passenger Side', sqft: 120 },
    { label: 'Rear Doors', sqft: 50 },
    { label: 'Hood', sqft: 24 },
    { label: 'Roof', sqft: 60 },
    { label: 'Front Bumper', sqft: 10 },
    { label: 'Mirrors', sqft: 4 },
  ],
  'Box Truck 16ft': [
    { label: 'Driver Side', sqft: 140 },
    { label: 'Passenger Side', sqft: 140 },
    { label: 'Rear Doors', sqft: 65 },
    { label: 'Cab Hood', sqft: 20 },
    { label: 'Cab Roof', sqft: 18 },
    { label: 'Cab Sides', sqft: 40 },
    { label: 'Front', sqft: 30 },
  ],
  'Box Truck 24ft': [
    { label: 'Driver Side', sqft: 200 },
    { label: 'Passenger Side', sqft: 200 },
    { label: 'Rear Doors', sqft: 80 },
    { label: 'Cab Hood', sqft: 22 },
    { label: 'Cab Roof', sqft: 20 },
    { label: 'Cab Sides', sqft: 48 },
    { label: 'Front', sqft: 36 },
  ],
  'Semi Trailer 48ft': [
    { label: 'Driver Side', sqft: 680 },
    { label: 'Passenger Side', sqft: 680 },
    { label: 'Rear Doors', sqft: 120 },
    { label: 'Nose', sqft: 80 },
  ],
}

export const VEHICLE_TYPES = Object.keys(VEHICLE_PANELS)

export const STYLE_CARDS = [
  'Bold & Aggressive', 'Corporate Professional', 'Minimalist Clean',
  'Racing Livery', 'Chrome & Metallic', 'Color Fade/Gradient',
  'Matte & Stealthy', 'Bright & Playful', 'Luxury Premium',
  'Industrial Rugged', 'Nature/Outdoors', 'Tech/Digital',
]

export const COVERAGE_LABEL = (panels: string[], allPanels: string[]): string => {
  if (panels.length === 0) return 'No Coverage'
  if (panels.length === allPanels.length) return 'Full Wrap'
  const hasSides = panels.some(p => p.includes('Side'))
  const hasRoof = panels.some(p => p.includes('Roof'))
  const hasHood = panels.some(p => p.includes('Hood'))
  if (hasSides && hasRoof) return '3/4 Wrap'
  if (hasSides && !hasRoof && !hasHood) return 'Partial Wrap'
  if (hasHood && panels.length === 1) return 'Hood Wrap'
  return 'Custom Coverage'
}

export const PRINT_CHECKS = [
  { key: 'bleed', label: 'Bleed added (0.125" all sides)', default: true },
  { key: 'resolution', label: 'Resolution ≥ 150 DPI at print size', default: false },
  { key: 'colorMode', label: 'Color mode CMYK', default: false },
  { key: 'fontOutline', label: 'No unoutlined fonts detected', default: true },
  { key: 'panelWidth', label: 'Panels within 54" material width', default: true },
  { key: 'seams', label: 'Seam marks placed correctly', default: true },
  { key: 'approved', label: 'Customer approved this design', default: false },
  { key: 'sqftMatch', label: 'Sqft matches estimate line item', default: false },
]

export const VEHICLE_SILHOUETTES: Record<string, string> = {
  'pickup_crew': 'Pickup Truck — Crew Cab',
  'cargo_van_standard': 'Cargo Van — Standard',
  'cargo_van_high_roof': 'Cargo Van — High Roof',
  'box_truck_16': 'Box Truck — 16ft',
  'sedan': 'Sedan',
  'suv_mid': 'SUV — Mid Size',
}

export const topBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '6px 8px', borderRadius: 8, border: 'none',
  background: 'transparent', color: '#9299b5', cursor: 'pointer', fontSize: 12,
}

export const accentBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '6px 14px', borderRadius: 8, border: 'none',
  cursor: 'pointer', fontSize: 12, fontWeight: 700, flexShrink: 0,
  whiteSpace: 'nowrap' as const,
}

export const chipStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '3px 8px', borderRadius: 20, border: '1px solid #1a1d27',
  background: '#13151c', fontSize: 10, color: '#9299b5', cursor: 'default',
  fontFamily: 'JetBrains Mono, monospace',
}

export const panelTitleStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 900, color: '#5a6080',
  textTransform: 'uppercase' as const, letterSpacing: '0.08em',
  fontFamily: 'Barlow Condensed, sans-serif', marginBottom: 8,
}

export const miniBtn: React.CSSProperties = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  color: '#9299b5', display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 4, borderRadius: 4,
}

export const labelSt: React.CSSProperties = {
  display: 'block', fontSize: 10, fontWeight: 700, color: '#5a6080',
  textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 6,
}

export const inputSt: React.CSSProperties = {
  width: '100%', padding: '8px 10px', background: '#0d0f14',
  border: '1px solid #1a1d27', borderRadius: 8, color: '#e8eaed',
  fontSize: 12, outline: 'none', boxSizing: 'border-box' as const,
}

export const selectSt: React.CSSProperties = {
  width: '100%', padding: '8px 10px', background: '#0d0f14',
  border: '1px solid #1a1d27', borderRadius: 8, color: '#e8eaed',
  fontSize: 12, outline: 'none', boxSizing: 'border-box' as const,
  appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%235a6080' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
  backgroundPosition: 'right 8px center',
  backgroundRepeat: 'no-repeat',
  backgroundSize: '16px 16px',
  paddingRight: 28,
}

export const smallBtnStyle: React.CSSProperties = {
  padding: '4px 10px', background: '#1a1d27', border: 'none',
  borderRadius: 6, color: '#9299b5', fontSize: 11, cursor: 'pointer',
}
