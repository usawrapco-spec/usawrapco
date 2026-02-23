// Default products catalog for USA Wrap Co
// calculator_type: 'vehicle' | 'box-truck' | 'trailer' | 'marine' | 'ppf' | 'decking' | 'simple'

export interface ProductDef {
  name: string
  category: string
  description: string
  defaultPrice: number
  defaultHours: number
  calculatorType: string
  taxable: boolean
  sortOrder: number
}

export const DEFAULT_PRODUCTS: ProductDef[] = [
  // ── WRAP & PPF ──────────────────────────────────────────
  { name: 'Full Car Wrap', category: 'wrap', description: 'Full wrap for a car', defaultPrice: 0, defaultHours: 0, calculatorType: 'vehicle', taxable: true, sortOrder: 1 },
  { name: 'Partial Car Wrap', category: 'wrap', description: 'Partial wrap for a car', defaultPrice: 0, defaultHours: 0, calculatorType: 'vehicle', taxable: true, sortOrder: 2 },
  { name: 'Hood Wrap', category: 'wrap', description: 'Hood-only wrap', defaultPrice: 500, defaultHours: 3, calculatorType: 'simple', taxable: true, sortOrder: 3 },
  { name: 'Roof Wrap', category: 'wrap', description: 'Roof-only wrap', defaultPrice: 400, defaultHours: 3, calculatorType: 'simple', taxable: true, sortOrder: 4 },
  { name: 'Trunk Wrap', category: 'wrap', description: 'Trunk-only wrap', defaultPrice: 350, defaultHours: 2, calculatorType: 'simple', taxable: true, sortOrder: 5 },
  { name: 'Doors Only Wrap', category: 'wrap', description: 'Door panels wrap', defaultPrice: 0, defaultHours: 0, calculatorType: 'simple', taxable: true, sortOrder: 6 },
  { name: 'Sides Only Wrap', category: 'wrap', description: 'Sides-only wrap', defaultPrice: 0, defaultHours: 0, calculatorType: 'simple', taxable: true, sortOrder: 7 },
  { name: 'Rear Wrap', category: 'wrap', description: 'Rear-only wrap', defaultPrice: 300, defaultHours: 2, calculatorType: 'simple', taxable: true, sortOrder: 8 },
  { name: 'Full Truck Wrap', category: 'wrap', description: 'Full wrap for a truck', defaultPrice: 0, defaultHours: 0, calculatorType: 'vehicle', taxable: true, sortOrder: 9 },
  { name: 'Full Van Wrap', category: 'wrap', description: 'Full wrap for a van', defaultPrice: 0, defaultHours: 0, calculatorType: 'vehicle', taxable: true, sortOrder: 10 },
  { name: 'Full SUV Wrap', category: 'wrap', description: 'Full wrap for an SUV', defaultPrice: 0, defaultHours: 0, calculatorType: 'vehicle', taxable: true, sortOrder: 11 },
  { name: 'Box Truck Full Wrap', category: 'wrap', description: 'Full commercial box truck wrap', defaultPrice: 0, defaultHours: 0, calculatorType: 'box-truck', taxable: true, sortOrder: 12 },
  { name: 'Box Truck Sides Only', category: 'wrap', description: 'Box truck sides-only wrap', defaultPrice: 0, defaultHours: 0, calculatorType: 'box-truck', taxable: true, sortOrder: 13 },
  { name: 'Box Truck Rear Only', category: 'wrap', description: 'Box truck rear panel wrap', defaultPrice: 300, defaultHours: 2, calculatorType: 'simple', taxable: true, sortOrder: 14 },
  { name: 'Trailer Full Wrap', category: 'wrap', description: 'Full trailer wrap', defaultPrice: 0, defaultHours: 0, calculatorType: 'trailer', taxable: true, sortOrder: 15 },
  { name: 'Trailer Sides Only', category: 'wrap', description: 'Trailer sides-only wrap', defaultPrice: 0, defaultHours: 0, calculatorType: 'trailer', taxable: true, sortOrder: 16 },
  { name: 'Trailer Rear Panel', category: 'wrap', description: 'Trailer rear panel wrap', defaultPrice: 350, defaultHours: 2, calculatorType: 'simple', taxable: true, sortOrder: 17 },
  { name: 'Boat Hull Wrap', category: 'marine', description: 'Full boat hull wrap', defaultPrice: 0, defaultHours: 0, calculatorType: 'marine', taxable: true, sortOrder: 18 },
  { name: 'Boat Partial Wrap', category: 'marine', description: 'Partial boat wrap', defaultPrice: 0, defaultHours: 0, calculatorType: 'marine', taxable: true, sortOrder: 19 },
  { name: 'Boat Transom Only', category: 'marine', description: 'Boat transom wrap only', defaultPrice: 400, defaultHours: 2, calculatorType: 'simple', taxable: true, sortOrder: 20 },
  { name: 'PPF Full Car', category: 'ppf', description: 'Full car paint protection film', defaultPrice: 7000, defaultHours: 16, calculatorType: 'ppf', taxable: true, sortOrder: 21 },
  { name: 'PPF Full Front', category: 'ppf', description: 'Full front PPF package', defaultPrice: 2500, defaultHours: 6, calculatorType: 'ppf', taxable: true, sortOrder: 22 },
  { name: 'PPF Hood Only', category: 'ppf', description: 'Hood-only paint protection film', defaultPrice: 800, defaultHours: 2, calculatorType: 'ppf', taxable: true, sortOrder: 23 },
  { name: 'PPF Front Bumper Only', category: 'ppf', description: 'Front bumper paint protection film', defaultPrice: 600, defaultHours: 2, calculatorType: 'ppf', taxable: true, sortOrder: 24 },
  { name: 'PPF Door Cups / Door Edge Guards', category: 'ppf', description: 'Door cup and edge guard PPF', defaultPrice: 200, defaultHours: 0.5, calculatorType: 'ppf', taxable: true, sortOrder: 25 },
  { name: 'PPF Rocker Panels', category: 'ppf', description: 'Rocker panel paint protection film', defaultPrice: 600, defaultHours: 2, calculatorType: 'ppf', taxable: true, sortOrder: 26 },
  { name: 'PPF Headlights', category: 'ppf', description: 'Headlight paint protection film', defaultPrice: 350, defaultHours: 1, calculatorType: 'ppf', taxable: true, sortOrder: 27 },
  { name: 'PPF Custom Zone', category: 'ppf', description: 'Custom area paint protection film', defaultPrice: 0, defaultHours: 0, calculatorType: 'ppf', taxable: true, sortOrder: 28 },
  { name: 'Design Fee', category: 'service', description: 'Custom design work', defaultPrice: 150, defaultHours: 4, calculatorType: 'simple', taxable: false, sortOrder: 29 },
  { name: 'Rush Fee', category: 'service', description: 'Priority rush processing', defaultPrice: 200, defaultHours: 0, calculatorType: 'simple', taxable: false, sortOrder: 30 },
  { name: 'Removal of Existing Wrap', category: 'service', description: 'Old wrap removal', defaultPrice: 300, defaultHours: 4, calculatorType: 'simple', taxable: true, sortOrder: 31 },
  { name: 'Surface Prep / Clay Bar', category: 'service', description: 'Surface preparation and clay bar treatment', defaultPrice: 0, defaultHours: 0, calculatorType: 'simple', taxable: true, sortOrder: 32 },
  { name: 'Window Tint', category: 'tint', description: 'Automotive window tint', defaultPrice: 250, defaultHours: 2, calculatorType: 'simple', taxable: true, sortOrder: 33 },
  { name: 'Ceramic Coating', category: 'service', description: 'Ceramic coating application', defaultPrice: 0, defaultHours: 0, calculatorType: 'simple', taxable: true, sortOrder: 34 },
  { name: 'Custom', category: 'other', description: 'Custom freeform product', defaultPrice: 0, defaultHours: 0, calculatorType: 'simple', taxable: true, sortOrder: 35 },

  // ── DECKING ─────────────────────────────────────────────
  { name: 'Full Deck Package', category: 'decking', description: 'Complete boat decking package', defaultPrice: 0, defaultHours: 0, calculatorType: 'decking', taxable: true, sortOrder: 36 },
  { name: 'Cockpit Floor', category: 'decking', description: 'Cockpit floor decking', defaultPrice: 0, defaultHours: 0, calculatorType: 'decking', taxable: true, sortOrder: 37 },
  { name: 'Bow Deck', category: 'decking', description: 'Bow area decking', defaultPrice: 0, defaultHours: 0, calculatorType: 'decking', taxable: true, sortOrder: 38 },
  { name: 'Helm Station Pad', category: 'decking', description: 'Helm station pad decking', defaultPrice: 0, defaultHours: 0, calculatorType: 'decking', taxable: true, sortOrder: 39 },
  { name: 'Swim Platform', category: 'decking', description: 'Swim platform decking', defaultPrice: 0, defaultHours: 0, calculatorType: 'decking', taxable: true, sortOrder: 40 },
  { name: 'Custom Cut Pad', category: 'decking', description: 'Custom cut decking pad', defaultPrice: 0, defaultHours: 0, calculatorType: 'decking', taxable: true, sortOrder: 41 },
  { name: 'Gunnel Pads', category: 'decking', description: 'Gunnel pad decking', defaultPrice: 0, defaultHours: 0, calculatorType: 'decking', taxable: true, sortOrder: 42 },
  { name: 'Ladder Pad', category: 'decking', description: 'Ladder pad decking', defaultPrice: 150, defaultHours: 1, calculatorType: 'simple', taxable: true, sortOrder: 43 },
  { name: 'Rod Holder Pads', category: 'decking', description: 'Rod holder pad decking', defaultPrice: 0, defaultHours: 0, calculatorType: 'simple', taxable: true, sortOrder: 44 },
  { name: 'Hatch Covers', category: 'decking', description: 'Hatch cover decking', defaultPrice: 0, defaultHours: 0, calculatorType: 'simple', taxable: true, sortOrder: 45 },
  { name: 'Full Boat Decking Package', category: 'decking', description: 'Full boat decking package', defaultPrice: 0, defaultHours: 0, calculatorType: 'decking', taxable: true, sortOrder: 46 },
  { name: 'Custom Logo Inlay', category: 'decking', description: 'Custom logo inlay for decking', defaultPrice: 250, defaultHours: 0, calculatorType: 'simple', taxable: true, sortOrder: 47 },
  { name: 'Custom Color Match', category: 'decking', description: 'Custom color matching for decking', defaultPrice: 150, defaultHours: 0, calculatorType: 'simple', taxable: true, sortOrder: 48 },
  { name: 'Rush Production Fee', category: 'decking', description: 'Rush production fee for decking', defaultPrice: 200, defaultHours: 0, calculatorType: 'simple', taxable: false, sortOrder: 49 },
  { name: 'Template Creation Fee', category: 'decking', description: 'Template creation for decking', defaultPrice: 100, defaultHours: 2, calculatorType: 'simple', taxable: true, sortOrder: 50 },
  { name: 'Decking Installation Fee', category: 'decking', description: 'Decking installation labor', defaultPrice: 0, defaultHours: 0, calculatorType: 'simple', taxable: true, sortOrder: 51 },
  { name: 'Removal of Old Decking', category: 'decking', description: 'Old decking removal', defaultPrice: 0, defaultHours: 0, calculatorType: 'simple', taxable: true, sortOrder: 52 },
]

export const CALCULATOR_TYPES = [
  { value: 'vehicle', label: 'Vehicle Wrap Calculator' },
  { value: 'box-truck', label: 'Box Truck Calculator' },
  { value: 'trailer', label: 'Trailer Calculator' },
  { value: 'marine', label: 'Marine Calculator' },
  { value: 'ppf', label: 'PPF Calculator' },
  { value: 'decking', label: 'Decking Calculator' },
  { value: 'simple', label: 'Simple (Qty x Price)' },
]

export const PRODUCT_CATEGORIES = [
  { value: 'wrap', label: 'Vehicle Wraps' },
  { value: 'ppf', label: 'PPF' },
  { value: 'marine', label: 'Marine' },
  { value: 'tint', label: 'Window Tint' },
  { value: 'decking', label: 'Decking' },
  { value: 'service', label: 'Service' },
  { value: 'other', label: 'Other' },
]
