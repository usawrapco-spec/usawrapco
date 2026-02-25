# Quote / Estimate Line Item Overhaul — v6.2

## Summary
Major overhaul of the estimate line item page (`EstimateDetailClient.tsx`) — ShopVox-inspired compact layout, fixed vehicle lookups, new product types, calculator gadgets, and reorganized tab structure.

## Changes

### FIX 1 — VIN Visibility
- VIN + vehicle info fields now ONLY show for: `commercial_vehicle`, `box_truck`, `trailer`, `marine`
- Explicitly excluded from vehicle UI: `wall_wrap`, `signage`, `ppf`, `custom`, `boat_decking`, `apparel`, `print_media`
- VIN input has `maxWidth: 400` and is inline with vehicle fields

### FIX 2 — Vehicle Database Lookup
- Rewrote `VehicleAutocomplete` with cascading Year > Make > Model dropdowns
- Year is now a dropdown (populated from vehicles.json, sorted desc) instead of free-text
- Year filters available Makes, Make filters available Models
- Model selection auto-populates sqft, basePrice, installHours
- Added vehicle silhouette SVG that changes based on tier (sedan/truck/van/SUV)
- Added helper functions: `getMakesForYear()`, `getModelsForMakeYear()`

### FIX 3 — New Product Types
- Added `wall_wrap` (Wall Wrap) — color: purple
- Added `signage` (Signage) — color: amber
- Added `apparel` (Apparel) — color: cyan
- Added `print_media` (Print) — color: text2
- Added `SIGNAGE_TYPES` constant (Banners, Yard Signs, Coroplast, etc.)
- Added `WALL_WRAP_MATERIALS` and `SIGNAGE_MATERIALS` pricing reference data
- Product type badge in collapsed view uses `productLineType` for accurate labels

### FIX 4 — Compact Collapsed Line Item
- Redesigned header row: `[Grip] [Chevron] [#] [TYPE BADGE] [Name] [Vehicle] [Coverage] [sqft] [Hours] [$Price] [Actions]`
- Entire row is clickable to expand/collapse
- Coverage shows from `wrapType` or `trailerCoverage`
- Sqft, hours, and mockup icon shown as compact chips
- Roll up/unroll buttons are icon-only to save space
- Reduced padding for tighter, more data-dense rows

### FIX 5 — Calculator Gadgets
- All calculators restyled with "gadget" appearance: gradient background, subtle box-shadow, rounded corners
- Added `gadgetStyle`, `gadgetHeaderStyle`, `gadgetOutputStyle` constants
- **NEW: Wall Wrap Calculator** — W x H (feet), num walls, window/door deduction toggle (-15%), material selector (Standard/Premium/Fabric), outputs: sqft, panels needed (4x8), material cost
- **NEW: Signage Calculator** — Sign type selector, W x H (inches), quantity, double-sided toggle, rush order toggle (+25%), material selector, outputs: size, sqft, qty, material cost
- Existing calculators (Box Truck, Trailer, Marine, PPF, Custom, 3x3 Grid) restyled with gadget panels

### FIX 6 — GPM Removed from Line Items
- Removed "GPM Pricing Engine" collapsible section from `LineItemCard`
- "Pricing Breakdown" section (materials, labor, machine costs) remains for COGS input
- Financial summary (Revenue, COGS, GP, GPM, Commission) stays ONLY in the right sidebar

### FIX 7 — Photos Tab
- Added `'photos'` to `TabKey` type
- Added Photos tab to tab bar (between Items and Calculators)
- Photos tab content: Intake Photos, Before Photos, After Photos sections
- Each section has upload drop zone area
- Vehicle profiles from intake form data shown when available

### FIX 8 — Vehicle Profiles from Intake
- When intake form data has `vehicleProfiles`, displayed in Photos tab
- Placeholder for "Create Line Item from Vehicle Profile" workflow

### FIX 9 — Overall Layout (ShopVox Compact)
- `GripVertical` drag handle on far left of each line item
- Line item number displayed prominently
- "Save This Line Item" button at bottom of expanded view (collapses item on save)
- Compact collapsed rows show all key info at a glance

## Files Modified
- `components/estimates/EstimateDetailClient.tsx` — all changes in this single file

## Verification
- `npm run build` — zero TypeScript errors
