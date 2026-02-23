// Default products catalog for USA Wrap Co
// calculator_type: 'vehicle' | 'box-truck' | 'trailer' | 'marine' | 'ppf' | 'simple'

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
  { name: 'Full Vehicle Wrap', category: 'wrap', description: 'Full wrap for car, truck, SUV, or van', defaultPrice: 0, defaultHours: 0, calculatorType: 'vehicle', taxable: true, sortOrder: 1 },
  { name: 'Box Truck Wrap', category: 'wrap', description: 'Commercial box truck wrap', defaultPrice: 0, defaultHours: 0, calculatorType: 'box-truck', taxable: true, sortOrder: 2 },
  { name: 'Trailer Wrap', category: 'wrap', description: 'Commercial trailer wrap', defaultPrice: 0, defaultHours: 0, calculatorType: 'trailer', taxable: true, sortOrder: 3 },
  { name: 'Marine/Boat Wrap', category: 'wrap', description: 'Marine vessel wrap or decking', defaultPrice: 0, defaultHours: 0, calculatorType: 'marine', taxable: true, sortOrder: 4 },
  { name: 'PPF (Paint Protection Film)', category: 'ppf', description: 'Paint protection film packages', defaultPrice: 0, defaultHours: 0, calculatorType: 'ppf', taxable: true, sortOrder: 5 },
  { name: 'Partial Wrap', category: 'wrap', description: 'Partial vehicle wrap coverage', defaultPrice: 0, defaultHours: 0, calculatorType: 'vehicle', taxable: true, sortOrder: 6 },
  { name: 'Hood Wrap', category: 'wrap', description: 'Hood-only wrap', defaultPrice: 500, defaultHours: 3, calculatorType: 'simple', taxable: true, sortOrder: 7 },
  { name: 'Roof Wrap', category: 'wrap', description: 'Roof-only wrap', defaultPrice: 400, defaultHours: 3, calculatorType: 'simple', taxable: true, sortOrder: 8 },
  { name: 'Window Tint', category: 'tint', description: 'Automotive window tint', defaultPrice: 250, defaultHours: 2, calculatorType: 'simple', taxable: true, sortOrder: 9 },
  { name: 'Decking/Marine Flooring', category: 'decking', description: 'Marine flooring installation', defaultPrice: 0, defaultHours: 0, calculatorType: 'marine', taxable: true, sortOrder: 10 },
  { name: 'Design Fee', category: 'service', description: 'Custom design work', defaultPrice: 150, defaultHours: 4, calculatorType: 'simple', taxable: false, sortOrder: 11 },
  { name: 'Rush Fee', category: 'service', description: 'Priority rush processing', defaultPrice: 200, defaultHours: 0, calculatorType: 'simple', taxable: false, sortOrder: 12 },
  { name: 'Removal Fee', category: 'service', description: 'Old wrap removal', defaultPrice: 300, defaultHours: 4, calculatorType: 'simple', taxable: true, sortOrder: 13 },
  { name: 'Custom', category: 'other', description: 'Custom freeform product', defaultPrice: 0, defaultHours: 0, calculatorType: 'simple', taxable: true, sortOrder: 14 },
]

export const CALCULATOR_TYPES = [
  { value: 'vehicle', label: 'Vehicle Wrap Calculator' },
  { value: 'box-truck', label: 'Box Truck Calculator' },
  { value: 'trailer', label: 'Trailer Calculator' },
  { value: 'marine', label: 'Marine Calculator' },
  { value: 'ppf', label: 'PPF Calculator' },
  { value: 'simple', label: 'Simple (Qty x Price)' },
]

export const PRODUCT_CATEGORIES = [
  { value: 'wrap', label: 'Vehicle Wraps' },
  { value: 'ppf', label: 'PPF' },
  { value: 'tint', label: 'Window Tint' },
  { value: 'decking', label: 'Decking' },
  { value: 'service', label: 'Service' },
  { value: 'other', label: 'Other' },
]
