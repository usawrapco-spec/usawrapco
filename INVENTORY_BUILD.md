# Inventory Build Report

**Date:** 2026-02-26
**Build result:** PASS — 0 TypeScript errors, 377 pages compiled

---

## What Was Done

### 1. Audit Findings

The existing `InventoryClient.tsx` used **wrong column names** that never matched the actual Supabase schema:

| Was (broken) | Actual DB column |
|---|---|
| `width_inches` | `width_in` |
| `length_ft` | `roll_length_ft` |
| `sqft_available` | `qty_sqft` |
| `cost_per_foot` | `cost_per_sqft` |

The `vinyl_inventory` table was also missing `location` and `status` columns needed for the UI.

---

### 2. Migration Applied

**`supabase/migrations/add_vinyl_inventory_location_status.sql`** (applied via Supabase MCP):
- Added `location TEXT` column
- Added `status TEXT NOT NULL DEFAULT 'in_stock'` column
- Backfilled `status` based on `qty_sqft` vs `low_stock_threshold`:
  - `qty_sqft = 0` → `'out_of_stock'`
  - `qty_sqft <= low_stock_threshold` → `'low_stock'`
  - else → `'in_stock'`

---

### 3. InventoryClient.tsx — Complete Rewrite

**File:** `components/inventory/InventoryClient.tsx` (~838 lines)

#### Features Delivered

**Stats Bar**
- Total rolls in stock (count where `status = 'in_stock'`)
- Low stock alerts (count where `status = 'low_stock'`)
- Total inventory value (sum of `qty_sqft × cost_per_sqft`)
- Rolls used this month (sum of `sqft_used` from `vinyl_usage` for current month)

**Stock Tab**
- Pulls from `vinyl_inventory` with correct column names
- Color swatch preview (hex lookup map for common wrap colors)
- Inline `qty_sqft` edit (click pencil → input → save → supabase PATCH)
- Sort by: brand, color, stock level
- Filter by: brand, finish, status
- Reorder button on low-stock rows → inserts into `sourcing_orders` table
- Delete row with confirmation

**Add Roll Modal**
- Brand dropdown: 3M, Avery, Oracal, Arlon, Hexis, Other
- Fields: color_name, finish, width_in, roll_length_ft, qty_rolls, cost_per_sqft, location, low_stock_threshold
- Auto-calculates `qty_sqft = roll_length_ft × (width_in / 12) × qty_rolls`

**Usage Log Tab**
- Pulls from `vinyl_usage` joined with `vinyl_inventory` and `projects`
- Shows: date, project, roll (brand + color), sqft consumed, applied by
- Filter by date range and employee
- Export CSV button

**Log Usage Modal**
- Select project (from `projects` table)
- Select vinyl roll (from `vinyl_inventory`)
- Enter sqft used → auto-calculates linear feet
- Employee auto-fills from current profile
- On save: inserts to `vinyl_usage` AND decrements `vinyl_inventory.qty_sqft`
- Updates roll status automatically after decrement

**Reports Tab**
- Usage by brand bar chart (recharts `BarChart`)
- Top 10 most-used materials horizontal bar chart
- Cost of materials per job bar chart
- Export CSV button for full usage report

---

### 4. API Routes Fixed

**`app/api/inventory/consume-roll/route.ts`**
- Was using non-existent columns `sqft_available`, `waste_sqft`, `consumed_at`
- Fixed to use `qty_sqft`, `status`

**`app/api/inventory/match-remnant/route.ts`**
- Was using `sqft_available`, `width_inches`, `available` status
- Fixed to use `qty_sqft`, `width_in`, `in_stock` status

---

### 5. Other Pre-Existing Build Errors Fixed

**`app/proposals/[id]/ProposalBuilder.tsx`** (new file)
- `app/proposals/[id]/page.tsx` imported `./ProposalBuilder` which didn't exist
- Created stub component with correct props interface

**`app/outreach/page.tsx`**
- Line 458: `React.FC<{ size: number }>` → `React.ElementType` for LucideIcon compatibility
- Fixed TypeScript strict type error

**`app/inventory/page.tsx`**
- Removed invalid `'sales'` role (not in valid role union)
- Changed to `'sales_agent'`

---

### 6. Build Output

```
✓ Compiled successfully
✓ Generating static pages (377/377)

/inventory    12.6 kB   291 kB
```

No TypeScript errors. No unused variable warnings.
