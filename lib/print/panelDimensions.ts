export interface PanelDimension {
  name: string
  widthInches: number
  heightInches: number
  zone: string
}

export function getVehiclePanels(
  vehicleType: 'car' | 'van' | 'truck' | 'box_truck' | 'trailer' | 'suv',
  _make?: string,
  _model?: string,
  selectedZones?: string[]
): PanelDimension[] {
  const allPanels = VEHICLE_PANEL_TEMPLATES[vehicleType] || VEHICLE_PANEL_TEMPLATES.car
  if (!selectedZones || selectedZones.length === 0) return allPanels
  return allPanels.filter(p => selectedZones.includes(p.zone))
}

const VEHICLE_PANEL_TEMPLATES: Record<string, PanelDimension[]> = {
  car: [
    { name: 'Hood',           zone: 'hood',           widthInches: 66,  heightInches: 54 },
    { name: 'Roof',           zone: 'roof',           widthInches: 60,  heightInches: 54 },
    { name: 'Trunk',          zone: 'trunk',          widthInches: 54,  heightInches: 48 },
    { name: 'Driver Side',    zone: 'driver_side',    widthInches: 180, heightInches: 54 },
    { name: 'Passenger Side', zone: 'passenger_side', widthInches: 180, heightInches: 54 },
    { name: 'Front Bumper',   zone: 'front_bumper',   widthInches: 72,  heightInches: 24 },
    { name: 'Rear Bumper',    zone: 'rear_bumper',    widthInches: 72,  heightInches: 24 },
    { name: 'Mirrors',        zone: 'mirrors',        widthInches: 24,  heightInches: 18 },
  ],
  suv: [
    { name: 'Hood',           zone: 'hood',           widthInches: 72,  heightInches: 60 },
    { name: 'Roof',           zone: 'roof',           widthInches: 72,  heightInches: 60 },
    { name: 'Trunk',          zone: 'trunk',          widthInches: 60,  heightInches: 54 },
    { name: 'Driver Side',    zone: 'driver_side',    widthInches: 204, heightInches: 60 },
    { name: 'Passenger Side', zone: 'passenger_side', widthInches: 204, heightInches: 60 },
    { name: 'Front Bumper',   zone: 'front_bumper',   widthInches: 78,  heightInches: 30 },
    { name: 'Rear Bumper',    zone: 'rear_bumper',    widthInches: 78,  heightInches: 30 },
    { name: 'Mirrors',        zone: 'mirrors',        widthInches: 30,  heightInches: 20 },
  ],
  van: [
    { name: 'Hood',             zone: 'hood',           widthInches: 72,  heightInches: 54 },
    { name: 'Roof',             zone: 'roof',           widthInches: 108, heightInches: 72 },
    { name: 'Driver Side',      zone: 'driver_side',    widthInches: 240, heightInches: 72 },
    { name: 'Passenger Side',   zone: 'passenger_side', widthInches: 240, heightInches: 72 },
    { name: 'Rear Doors',       zone: 'rear',           widthInches: 60,  heightInches: 72 },
    { name: 'Front Bumper',     zone: 'front_bumper',   widthInches: 84,  heightInches: 30 },
  ],
  truck: [
    { name: 'Hood',             zone: 'hood',           widthInches: 78,  heightInches: 60 },
    { name: 'Cab Driver Side',  zone: 'driver_side',    widthInches: 108, heightInches: 66 },
    { name: 'Cab Pass Side',    zone: 'passenger_side', widthInches: 108, heightInches: 66 },
    { name: 'Bed Driver Side',  zone: 'bed_driver',     widthInches: 96,  heightInches: 48 },
    { name: 'Bed Pass Side',    zone: 'bed_passenger',  widthInches: 96,  heightInches: 48 },
    { name: 'Tailgate',         zone: 'tailgate',       widthInches: 72,  heightInches: 24 },
    { name: 'Front Bumper',     zone: 'front_bumper',   widthInches: 84,  heightInches: 24 },
  ],
  box_truck: [
    { name: 'Driver Side Box',    zone: 'driver_box',    widthInches: 288, heightInches: 96 },
    { name: 'Passenger Side Box', zone: 'passenger_box', widthInches: 288, heightInches: 96 },
    { name: 'Rear Door',          zone: 'rear',          widthInches: 96,  heightInches: 96 },
    { name: 'Cab Hood',           zone: 'cab_hood',      widthInches: 84,  heightInches: 54 },
    { name: 'Cab Driver Side',    zone: 'cab_driver',    widthInches: 96,  heightInches: 66 },
    { name: 'Cab Pass Side',      zone: 'cab_passenger', widthInches: 96,  heightInches: 66 },
  ],
  trailer: [
    { name: 'Driver Side',    zone: 'driver_side',    widthInches: 600, heightInches: 96 },
    { name: 'Passenger Side', zone: 'passenger_side', widthInches: 600, heightInches: 96 },
    { name: 'Rear',           zone: 'rear',           widthInches: 120, heightInches: 96 },
    { name: 'Front / V-Nose', zone: 'front',          widthInches: 120, heightInches: 96 },
  ],
}

export function getPanelSeams(widthInches: number, materialWidthInches = 54): number {
  return Math.ceil(widthInches / materialWidthInches) - 1
}

export function getLinearFeetForPanel(panel: PanelDimension, materialWidthInches = 54): number {
  const passes = Math.ceil(panel.widthInches / materialWidthInches)
  return (panel.heightInches / 12) * passes
}
