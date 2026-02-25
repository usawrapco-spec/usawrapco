export type VehicleCategory = 'sprinter_van' | 'transit_van' | 'pickup_truck' | 'sedan' | 'suv' | 'box_truck'

export interface VehicleModelDef {
  label: string
  panels: string[]
  defaultCamera: { x: number; y: number; z: number }
  dimensions?: { length: number; width: number; height: number }
}

export const VEHICLE_MODELS: Record<VehicleCategory, VehicleModelDef> = {
  sprinter_van: {
    label: 'Sprinter Van',
    panels: ['body', 'hood', 'roof', 'front_bumper', 'rear_bumper'],
    defaultCamera: { x: 4, y: 1.5, z: 4 },
    dimensions: { length: 5.9, width: 1.99, height: 2.6 },
  },
  transit_van: {
    label: 'Transit Van',
    panels: ['body', 'hood', 'roof', 'front_bumper', 'rear_bumper'],
    defaultCamera: { x: 4, y: 1.5, z: 4 },
  },
  pickup_truck: {
    label: 'Pickup Truck',
    panels: ['cab', 'hood', 'bed', 'front_bumper', 'rear_bumper'],
    defaultCamera: { x: 4.5, y: 1.5, z: 4 },
  },
  sedan: {
    label: 'Sedan / Car',
    panels: ['body', 'hood', 'roof', 'trunk', 'front_bumper', 'rear_bumper'],
    defaultCamera: { x: 3.5, y: 1.2, z: 3.5 },
  },
  suv: {
    label: 'SUV / Crossover',
    panels: ['body', 'hood', 'roof', 'front_bumper', 'rear_bumper'],
    defaultCamera: { x: 4, y: 1.4, z: 4 },
  },
  box_truck: {
    label: 'Box Truck',
    panels: ['cab_body', 'box_body', 'box_roof'],
    defaultCamera: { x: 5, y: 2, z: 5 },
  },
}

export const PANEL_LABELS: Record<string, string> = {
  body: 'Body',
  hood: 'Hood',
  roof: 'Roof',
  trunk: 'Trunk',
  front_bumper: 'Front Bumper',
  rear_bumper: 'Rear Bumper',
  cab: 'Cab',
  bed: 'Truck Bed',
  cab_body: 'Cab Body',
  box_body: 'Box Body',
  box_roof: 'Box Roof',
}

export function getVehicleCategory(make: string, model: string): VehicleCategory {
  const m = model.toLowerCase()
  if (m.includes('sprinter') || m.includes('promaster') || (m.includes('transit') && !m.includes('transit connect'))) return 'sprinter_van'
  if (m.includes('van') || m.includes('express') || m.includes('savana')) return 'transit_van'
  if (m.includes('f-150') || m.includes('f150') || m.includes('silverado') || m.includes('sierra') || m.includes('ram') || m.includes('tundra') || m.includes('tacoma') || m.includes('ranger') || m.includes('colorado') || m.includes('canyon')) return 'pickup_truck'
  if (m.includes('explorer') || m.includes('tahoe') || m.includes('suburban') || m.includes('yukon') || m.includes('navigator') || m.includes('expedition') || m.includes('4runner') || m.includes('highlander') || m.includes('pilot') || m.includes('pathfinder') || m.includes('escalade') || m.includes('traverse') || m.includes('durango')) return 'suv'
  if (m.includes('box') || m.includes('e350') || m.includes('e450') || m.includes('cutaway')) return 'box_truck'
  return 'sedan'
}

export const VEHICLE_CATEGORY_OPTIONS: { value: VehicleCategory; label: string }[] = [
  { value: 'sprinter_van',  label: 'Sprinter / Promaster Van' },
  { value: 'transit_van',   label: 'Transit / Express Van' },
  { value: 'pickup_truck',  label: 'Pickup Truck' },
  { value: 'suv',           label: 'SUV / Crossover' },
  { value: 'sedan',         label: 'Sedan / Car' },
  { value: 'box_truck',     label: 'Box Truck' },
]
