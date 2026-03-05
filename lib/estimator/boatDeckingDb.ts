// ─── Boat Decking Database ──────────────────────────────────────────────────
// Static boat type definitions with standard parts & default dimensions (inches).
// Mirrors vehicleDb.ts pattern for vehicle wraps.

export interface BoatPartDefinition {
  id: string
  label: string
  defaultLengthIn: number
  defaultWidthIn: number
  defaultShape: 'rectangle' | 'triangle' | 'manual'
}

export interface BoatTypeSpec {
  id: string
  category: BoatCategory
  label: string
  lengthRange: string
  parts: BoatPartDefinition[]
}

export type BoatCategory =
  | 'bowrider'
  | 'center_console'
  | 'pontoon'
  | 'deck_boat'
  | 'bass_boat'
  | 'wakeboard'
  | 'cabin_cruiser'
  | 'fishing'
  | 'custom'

export const BOAT_CATEGORIES: { key: BoatCategory; label: string }[] = [
  { key: 'bowrider',        label: 'Bowrider' },
  { key: 'center_console',  label: 'Center Console' },
  { key: 'pontoon',         label: 'Pontoon' },
  { key: 'deck_boat',       label: 'Deck Boat' },
  { key: 'bass_boat',       label: 'Bass Boat' },
  { key: 'wakeboard',       label: 'Wakeboard / Ski' },
  { key: 'cabin_cruiser',   label: 'Cabin Cruiser' },
  { key: 'fishing',         label: 'Fishing' },
  { key: 'custom',          label: 'Custom / Other' },
]

// ─── Standard Parts (quick-add list) ────────────────────────────────────────
export const QUICK_ADD_PARTS: BoatPartDefinition[] = [
  { id: 'cockpit',           label: 'Cockpit Floor',     defaultLengthIn: 84,  defaultWidthIn: 60,  defaultShape: 'rectangle' },
  { id: 'bow',               label: 'Bow Area',          defaultLengthIn: 60,  defaultWidthIn: 48,  defaultShape: 'triangle' },
  { id: 'swim_platform',     label: 'Swim Platform',     defaultLengthIn: 36,  defaultWidthIn: 24,  defaultShape: 'rectangle' },
  { id: 'helm_station',      label: 'Helm Station Pad',  defaultLengthIn: 24,  defaultWidthIn: 18,  defaultShape: 'rectangle' },
  { id: 'casting_deck',      label: 'Casting Deck',      defaultLengthIn: 48,  defaultWidthIn: 60,  defaultShape: 'rectangle' },
  { id: 'aft_deck',          label: 'Aft Deck',          defaultLengthIn: 48,  defaultWidthIn: 36,  defaultShape: 'rectangle' },
  { id: 'port_gunwale',      label: 'Port Gunwale',      defaultLengthIn: 84,  defaultWidthIn: 8,   defaultShape: 'rectangle' },
  { id: 'starboard_gunwale', label: 'Starboard Gunwale', defaultLengthIn: 84,  defaultWidthIn: 8,   defaultShape: 'rectangle' },
  { id: 'transom_pad',       label: 'Transom Pad',       defaultLengthIn: 36,  defaultWidthIn: 18,  defaultShape: 'rectangle' },
  { id: 'step_pads',         label: 'Step Pads',         defaultLengthIn: 18,  defaultWidthIn: 12,  defaultShape: 'rectangle' },
  { id: 'rod_locker_lid',    label: 'Rod Locker Lid',    defaultLengthIn: 48,  defaultWidthIn: 18,  defaultShape: 'rectangle' },
  { id: 'storage_lids',      label: 'Storage Lids',      defaultLengthIn: 36,  defaultWidthIn: 24,  defaultShape: 'rectangle' },
  { id: 'seat_bases',        label: 'Seat Bases',        defaultLengthIn: 18,  defaultWidthIn: 18,  defaultShape: 'rectangle' },
  { id: 'console_top',       label: 'Console Top',       defaultLengthIn: 24,  defaultWidthIn: 18,  defaultShape: 'rectangle' },
  { id: 'hatch_covers',      label: 'Hatch Covers',      defaultLengthIn: 24,  defaultWidthIn: 24,  defaultShape: 'rectangle' },
  { id: 'bow_platform',      label: 'Bow Platform',      defaultLengthIn: 60,  defaultWidthIn: 48,  defaultShape: 'rectangle' },
]

// ─── Boat Type Database ─────────────────────────────────────────────────────
export const BOAT_TYPE_DATABASE: BoatTypeSpec[] = [
  // Bowriders
  {
    id: 'bowrider_18_22', category: 'bowrider', label: 'Bowrider 18-22ft', lengthRange: '18-22ft',
    parts: [
      { id: 'cockpit',       label: 'Cockpit Floor',     defaultLengthIn: 84,  defaultWidthIn: 60,  defaultShape: 'rectangle' },
      { id: 'bow',           label: 'Bow Area',          defaultLengthIn: 60,  defaultWidthIn: 48,  defaultShape: 'triangle' },
      { id: 'swim_platform', label: 'Swim Platform',     defaultLengthIn: 36,  defaultWidthIn: 24,  defaultShape: 'rectangle' },
      { id: 'helm_station',  label: 'Helm Station Pad',  defaultLengthIn: 24,  defaultWidthIn: 18,  defaultShape: 'rectangle' },
      { id: 'port_gunwale',  label: 'Port Gunwale',      defaultLengthIn: 84,  defaultWidthIn: 8,   defaultShape: 'rectangle' },
      { id: 'stbd_gunwale',  label: 'Starboard Gunwale', defaultLengthIn: 84,  defaultWidthIn: 8,   defaultShape: 'rectangle' },
    ],
  },
  {
    id: 'bowrider_23_28', category: 'bowrider', label: 'Bowrider 23-28ft', lengthRange: '23-28ft',
    parts: [
      { id: 'cockpit',       label: 'Cockpit Floor',     defaultLengthIn: 108, defaultWidthIn: 72,  defaultShape: 'rectangle' },
      { id: 'bow',           label: 'Bow Area',          defaultLengthIn: 72,  defaultWidthIn: 54,  defaultShape: 'triangle' },
      { id: 'swim_platform', label: 'Swim Platform',     defaultLengthIn: 42,  defaultWidthIn: 30,  defaultShape: 'rectangle' },
      { id: 'helm_station',  label: 'Helm Station Pad',  defaultLengthIn: 30,  defaultWidthIn: 20,  defaultShape: 'rectangle' },
      { id: 'aft_deck',      label: 'Aft Deck',          defaultLengthIn: 48,  defaultWidthIn: 36,  defaultShape: 'rectangle' },
      { id: 'port_gunwale',  label: 'Port Gunwale',      defaultLengthIn: 108, defaultWidthIn: 8,   defaultShape: 'rectangle' },
      { id: 'stbd_gunwale',  label: 'Starboard Gunwale', defaultLengthIn: 108, defaultWidthIn: 8,   defaultShape: 'rectangle' },
    ],
  },

  // Center Consoles
  {
    id: 'center_console_18_22', category: 'center_console', label: 'Center Console 18-22ft', lengthRange: '18-22ft',
    parts: [
      { id: 'cockpit',       label: 'Cockpit Floor',     defaultLengthIn: 72,  defaultWidthIn: 60,  defaultShape: 'rectangle' },
      { id: 'bow',           label: 'Bow Area',          defaultLengthIn: 54,  defaultWidthIn: 48,  defaultShape: 'triangle' },
      { id: 'casting_deck',  label: 'Casting Deck',      defaultLengthIn: 48,  defaultWidthIn: 60,  defaultShape: 'rectangle' },
      { id: 'helm_station',  label: 'Helm Station Pad',  defaultLengthIn: 24,  defaultWidthIn: 18,  defaultShape: 'rectangle' },
      { id: 'port_gunwale',  label: 'Port Gunwale',      defaultLengthIn: 72,  defaultWidthIn: 8,   defaultShape: 'rectangle' },
      { id: 'stbd_gunwale',  label: 'Starboard Gunwale', defaultLengthIn: 72,  defaultWidthIn: 8,   defaultShape: 'rectangle' },
    ],
  },
  {
    id: 'center_console_23_28', category: 'center_console', label: 'Center Console 23-28ft', lengthRange: '23-28ft',
    parts: [
      { id: 'cockpit',       label: 'Cockpit Floor',     defaultLengthIn: 96,  defaultWidthIn: 72,  defaultShape: 'rectangle' },
      { id: 'bow',           label: 'Bow Area',          defaultLengthIn: 72,  defaultWidthIn: 54,  defaultShape: 'triangle' },
      { id: 'casting_deck',  label: 'Casting Deck',      defaultLengthIn: 60,  defaultWidthIn: 72,  defaultShape: 'rectangle' },
      { id: 'helm_station',  label: 'Helm Station Pad',  defaultLengthIn: 30,  defaultWidthIn: 20,  defaultShape: 'rectangle' },
      { id: 'port_gunwale',  label: 'Port Gunwale',      defaultLengthIn: 96,  defaultWidthIn: 8,   defaultShape: 'rectangle' },
      { id: 'stbd_gunwale',  label: 'Starboard Gunwale', defaultLengthIn: 96,  defaultWidthIn: 8,   defaultShape: 'rectangle' },
    ],
  },
  {
    id: 'center_console_29_36', category: 'center_console', label: 'Center Console 29-36ft', lengthRange: '29-36ft',
    parts: [
      { id: 'cockpit',       label: 'Cockpit Floor',     defaultLengthIn: 132, defaultWidthIn: 84,  defaultShape: 'rectangle' },
      { id: 'bow',           label: 'Bow Area',          defaultLengthIn: 84,  defaultWidthIn: 66,  defaultShape: 'triangle' },
      { id: 'casting_deck',  label: 'Casting Deck',      defaultLengthIn: 72,  defaultWidthIn: 84,  defaultShape: 'rectangle' },
      { id: 'helm_station',  label: 'Helm Station Pad',  defaultLengthIn: 36,  defaultWidthIn: 24,  defaultShape: 'rectangle' },
      { id: 'swim_platform', label: 'Swim Platform',     defaultLengthIn: 48,  defaultWidthIn: 36,  defaultShape: 'rectangle' },
      { id: 'port_gunwale',  label: 'Port Gunwale',      defaultLengthIn: 132, defaultWidthIn: 10,  defaultShape: 'rectangle' },
      { id: 'stbd_gunwale',  label: 'Starboard Gunwale', defaultLengthIn: 132, defaultWidthIn: 10,  defaultShape: 'rectangle' },
    ],
  },

  // Pontoons
  {
    id: 'pontoon_20_24', category: 'pontoon', label: 'Pontoon 20-24ft', lengthRange: '20-24ft',
    parts: [
      { id: 'main_deck',    label: 'Main Deck',         defaultLengthIn: 216, defaultWidthIn: 96,  defaultShape: 'rectangle' },
      { id: 'helm_station',  label: 'Helm Station Pad', defaultLengthIn: 30,  defaultWidthIn: 24,  defaultShape: 'rectangle' },
      { id: 'step_pads',     label: 'Step Pads',        defaultLengthIn: 18,  defaultWidthIn: 12,  defaultShape: 'rectangle' },
    ],
  },
  {
    id: 'pontoon_25_28', category: 'pontoon', label: 'Pontoon 25-28ft', lengthRange: '25-28ft',
    parts: [
      { id: 'main_deck',    label: 'Main Deck',         defaultLengthIn: 264, defaultWidthIn: 96,  defaultShape: 'rectangle' },
      { id: 'helm_station',  label: 'Helm Station Pad', defaultLengthIn: 36,  defaultWidthIn: 24,  defaultShape: 'rectangle' },
      { id: 'step_pads',     label: 'Step Pads',        defaultLengthIn: 24,  defaultWidthIn: 12,  defaultShape: 'rectangle' },
    ],
  },

  // Deck Boats
  {
    id: 'deck_boat_20_24', category: 'deck_boat', label: 'Deck Boat 20-24ft', lengthRange: '20-24ft',
    parts: [
      { id: 'cockpit',       label: 'Cockpit Floor',     defaultLengthIn: 96,  defaultWidthIn: 72,  defaultShape: 'rectangle' },
      { id: 'bow',           label: 'Bow Area',          defaultLengthIn: 72,  defaultWidthIn: 60,  defaultShape: 'triangle' },
      { id: 'swim_platform', label: 'Swim Platform',     defaultLengthIn: 36,  defaultWidthIn: 24,  defaultShape: 'rectangle' },
      { id: 'helm_station',  label: 'Helm Station Pad',  defaultLengthIn: 24,  defaultWidthIn: 18,  defaultShape: 'rectangle' },
    ],
  },

  // Bass Boats
  {
    id: 'bass_boat_18_21', category: 'bass_boat', label: 'Bass Boat 18-21ft', lengthRange: '18-21ft',
    parts: [
      { id: 'casting_deck',  label: 'Casting Deck (Bow)',defaultLengthIn: 60,  defaultWidthIn: 72,  defaultShape: 'triangle' },
      { id: 'cockpit',       label: 'Cockpit Floor',     defaultLengthIn: 60,  defaultWidthIn: 48,  defaultShape: 'rectangle' },
      { id: 'aft_deck',      label: 'Aft Deck',          defaultLengthIn: 48,  defaultWidthIn: 60,  defaultShape: 'rectangle' },
      { id: 'helm_station',  label: 'Helm Station Pad',  defaultLengthIn: 24,  defaultWidthIn: 18,  defaultShape: 'rectangle' },
      { id: 'step_pads',     label: 'Step Pads',         defaultLengthIn: 18,  defaultWidthIn: 12,  defaultShape: 'rectangle' },
    ],
  },

  // Wakeboard / Ski
  {
    id: 'wakeboard_20_24', category: 'wakeboard', label: 'Wakeboard Boat 20-24ft', lengthRange: '20-24ft',
    parts: [
      { id: 'cockpit',       label: 'Cockpit Floor',     defaultLengthIn: 96,  defaultWidthIn: 60,  defaultShape: 'rectangle' },
      { id: 'bow',           label: 'Bow Area',          defaultLengthIn: 72,  defaultWidthIn: 48,  defaultShape: 'triangle' },
      { id: 'swim_platform', label: 'Swim Platform',     defaultLengthIn: 48,  defaultWidthIn: 30,  defaultShape: 'rectangle' },
      { id: 'helm_station',  label: 'Helm Station Pad',  defaultLengthIn: 24,  defaultWidthIn: 18,  defaultShape: 'rectangle' },
      { id: 'storage_lids',  label: 'Storage Lids',      defaultLengthIn: 36,  defaultWidthIn: 24,  defaultShape: 'rectangle' },
    ],
  },

  // Cabin Cruisers
  {
    id: 'cabin_cruiser_24_30', category: 'cabin_cruiser', label: 'Cabin Cruiser 24-30ft', lengthRange: '24-30ft',
    parts: [
      { id: 'cockpit',       label: 'Cockpit Floor',     defaultLengthIn: 120, defaultWidthIn: 84,  defaultShape: 'rectangle' },
      { id: 'swim_platform', label: 'Swim Platform',     defaultLengthIn: 48,  defaultWidthIn: 36,  defaultShape: 'rectangle' },
      { id: 'helm_station',  label: 'Helm Station Pad',  defaultLengthIn: 36,  defaultWidthIn: 24,  defaultShape: 'rectangle' },
      { id: 'aft_deck',      label: 'Aft Deck',          defaultLengthIn: 60,  defaultWidthIn: 48,  defaultShape: 'rectangle' },
    ],
  },

  // Fishing
  {
    id: 'fishing_16_20', category: 'fishing', label: 'Fishing Boat 16-20ft', lengthRange: '16-20ft',
    parts: [
      { id: 'cockpit',       label: 'Cockpit Floor',     defaultLengthIn: 72,  defaultWidthIn: 48,  defaultShape: 'rectangle' },
      { id: 'casting_deck',  label: 'Casting Deck',      defaultLengthIn: 48,  defaultWidthIn: 60,  defaultShape: 'rectangle' },
      { id: 'helm_station',  label: 'Helm Station Pad',  defaultLengthIn: 24,  defaultWidthIn: 18,  defaultShape: 'rectangle' },
      { id: 'step_pads',     label: 'Step Pads',         defaultLengthIn: 18,  defaultWidthIn: 12,  defaultShape: 'rectangle' },
    ],
  },

  // Custom
  {
    id: 'custom', category: 'custom', label: 'Custom / Other', lengthRange: 'Any',
    parts: [],
  },
]

// ─── Lookup Helpers ─────────────────────────────────────────────────────────
export function getBoatTypesForCategory(cat: BoatCategory): BoatTypeSpec[] {
  return BOAT_TYPE_DATABASE.filter(b => b.category === cat)
}

export function findBoatType(id: string): BoatTypeSpec | undefined {
  return BOAT_TYPE_DATABASE.find(b => b.id === id)
}
