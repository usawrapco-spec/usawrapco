# FLEET BUILD REPORT
**Date:** 2026-02-26
**Branch:** main
**Status:** TypeScript CLEAN — Windows ENOENT pre-existing (does not block Vercel deploy)

---

## AUDIT RESULTS

### Pages (before this build)
| Route | Existed | Component |
|-------|---------|-----------|
| `/vehicles` | ✅ | `components/payroll/VehiclesClient.tsx` — fleet list |
| `/vehicles/[id]` | ❌ | **CREATED** |
| `/fleet` | ✅ | `app/fleet/FleetHubClient.tsx` — customer fleet vehicles |
| `/maintenance` | ✅ | Was: customer wrap tickets → **REWRITTEN** |
| `/mileage` | ✅ | `components/payroll/MileageClient.tsx` — solid |
| `/map` | ✅ | Customer network map — NOT repurposed (see notes) |

### DB Tables
All 8 required tables confirmed in Supabase:
- `company_vehicles` — 18 columns incl. insurance_expiry, registration_expiry, oil change tracking
- `vehicle_maintenance` — service records with cost, mileage, next due
- `mileage_logs` — supports company_vehicle_id FK
- `fleet_trips` — links to fleet_vehicles (customer vehicles, not company)
- `maintenance_reminders` — customer-facing, linked to customer_id/project_id
- `maintenance_tickets` — customer wrap repair tickets
- `fleet_vehicles` — customer fleet vehicles (used by /fleet page)
- `customer_vehicles` — customer vehicle registry

---

## PAGES BUILT / ENHANCED

### PAGE 1 — /vehicles (Company Vehicles) ✅ ENHANCED
**New:** Vehicle cards are now clickable → navigate to `/vehicles/[id]`
**New:** "Map" tab added (GPS placeholder with vehicle cards)
**Updated:** Button click events use `stopPropagation()` so "Log Service" / deactivate don't trigger navigation
**Changed:** "Maintenance Log" tab renamed to "Service Log"

#### NEW: /vehicles/[id] — Vehicle Detail Page ✅ CREATED
**Files:**
- `app/vehicles/[id]/page.tsx` — server page (loads vehicle + mileage_logs + vehicle_maintenance + employees)
- `components/payroll/VehicleDetailClient.tsx` — 4-tab detail component

**Tabs:**
1. **Info** — all vehicle fields, editable inline (calls `PATCH /api/company-vehicles/[id]`), cost summary
2. **Mileage** — `mileage_logs` filtered by `company_vehicle_id`, current odometer display, [+ Log Mileage] modal
3. **Maintenance** — `vehicle_maintenance` records with status badges (OK/DUE SOON/OVERDUE), [+ Log Service] modal
4. **Map** — GPS placeholder with odometer display

**Status badge logic:**
- `OVERDUE` (red): days < 0 OR miles_left < 0
- `DUE SOON` (amber): days ≤ 30 OR miles_left < 1,000
- `OK` (green): everything else

---

### PAGE 2 — /map (Map Monitor) ⚠️ PARTIAL
**Decision:** `/map` route was already used for customer network visualization (`CustomerNetworkMap`). Repurposing it would break existing functionality.

**What was done instead:**
- Added a "Map" tab to `/vehicles` (VehiclesClient) that shows:
  - GPS not connected banner
  - Vehicle cards with odometer + assigned driver
  - Each card links to the vehicle detail page
- Added a "Map" tab to `/vehicles/[id]` (VehicleDetailClient) showing GPS placeholder

**To fully implement `/map` as a fleet map:**
1. Rename `/map` → `/network` in SideNav (customers section)
2. Create new `app/map/page.tsx` for fleet GPS
3. Connect Google Maps API with `NEXT_PUBLIC_GOOGLE_MAPS_KEY` env var

---

### PAGE 3 — /maintenance (Fleet Service Dashboard) ✅ REWRITTEN
**Files:**
- `app/maintenance/page.tsx` — rewritten (loads company_vehicles + vehicle_maintenance)
- `components/fleet/FleetMaintenanceClient.tsx` — NEW dual-tab component

**Tab 1: Fleet Service**
- Cost tracker: This Month / This Year / Total / Overdue count
- Table: Vehicle | Service Type | Last Done | Mileage | Next Due | Cost | Status
- Groups by latest record per vehicle+type to show current service status
- Status badges: OK / DUE SOON / OVERDUE
- Filter: by vehicle, overdue-only toggle
- [+ Log Service] modal calling `POST /api/vehicle-maintenance`

**Tab 2: Wrap Tickets**
- Customer wrap repair tickets (preserved from previous MaintenanceClient)
- Status filter tabs with counts
- Slide-in detail panel with status updates, notes, resolution
- Links to original job + create new estimate from ticket

**Navigation:** Moved from ADMIN section → TEAM section as "Fleet Service" (owner/admin only)

---

### PAGE 4 — /mileage ✅ ENHANCED
**File:** `components/payroll/MileageClient.tsx`

**Added:**
- **Export CSV button** in History tab — exports all filtered logs with:
  - Date, Driver, From, To, Miles, Rate/Mi, Amount, Purpose, Vehicle, Entry Type, Status
  - Filename: `mileage-report-YYYY-MM-DD.csv`
  - Appears only when logs are loaded

**Existing (already built):**
- GPS auto-track with haversine distance calculation
- Manual mileage entry with odometer fields
- History table with filters (status, employee, date range)
- Summary stats: total miles, pending count, est. reimbursement
- Pending approval tab (admin)
- IRS rate display ($0.67/mi)

---

## SIDEBAR CHANGES

```
TEAM section (added):
  { href: '/maintenance', label: 'Fleet Service', icon: Wrench, roles: ['owner', 'admin'] }

ADMIN section (removed):
  { href: '/maintenance', label: 'Maintenance', icon: Wrench }
```

---

## API ROUTES (all pre-existing, verified working)

| Route | Methods | Notes |
|-------|---------|-------|
| `/api/company-vehicles` | GET, POST | Gets all active vehicles; POST inserts + updates employee_pay_settings |
| `/api/company-vehicles/[id]` | PATCH, DELETE | Update/soft-delete vehicle; handles reassignment |
| `/api/vehicle-maintenance` | GET, POST | Supports `?vehicle_id=` filter; POST updates vehicle mileage |
| `/api/mileage` | GET, POST | Supports `company_vehicle_id` in POST body |
| `/api/mileage/[id]` | PATCH | Approve/reject with optional rejection reason |

---

## PRE-EXISTING BUGS FIXED (unrelated to fleet)

1. `app/leaderboard/page.tsx:74` — `.catch()` → `.then(() => {}, () => {})` on PostgrestFilterBuilder
   - Known pattern from MEMORY.md

---

## FILES CREATED/MODIFIED

### Created
- `app/vehicles/[id]/page.tsx`
- `components/payroll/VehicleDetailClient.tsx`
- `components/fleet/FleetMaintenanceClient.tsx`

### Modified
- `app/maintenance/page.tsx` — rewritten
- `components/payroll/VehiclesClient.tsx` — Link + Map tab + stopPropagation
- `components/payroll/MileageClient.tsx` — CSV export
- `components/layout/SideNav.tsx` — fleet service nav
- `app/leaderboard/page.tsx` — .catch() fix

---

## NOTES

- `fleet_trips` table has `vehicle_id → fleet_vehicles` (NOT company_vehicles). Trip logs for company vehicles should use `mileage_logs.company_vehicle_id`. The `/vehicles/[id]` mileage tab shows `mileage_logs` filtered by `company_vehicle_id`.
- `maintenance_reminders` has `customer_id/project_id` columns — these are for customer wrap service reminders, not company vehicle reminders. Not used in fleet service pages.
- GPS integration would require a third-party telematics API. When available, add map markers to the `/vehicles` Map tab.
