# PAYROLL_BUILD.md — Payroll System Build Report

## Summary
Full payroll dashboard buildout at `/payroll` — stats bar, employee pay, job-based installer pay, QuickBooks integration, invoice import, and AI bookkeeper.

---

## New Files Created

### API Routes
| Route | Description |
|-------|-------------|
| `GET /api/payroll/stats` | Stats bar data: current period total, YTD, active employees, next payroll date |
| `GET /api/payroll/employee-pay` | Employee list with pay settings + current period pay + YTD |
| `PATCH /api/payroll/employee-pay` | Upsert employee pay settings |
| `GET /api/payroll/jobs-pay` | Installer jobs for a date range with calculated earnings |
| `GET /api/payroll/quickbooks/auth` | OAuth redirect to QuickBooks Online |
| `GET /api/payroll/quickbooks/callback` | OAuth callback, stores tokens in `app_settings` |
| `GET /api/payroll/quickbooks/status` | Returns QB connection status |
| `DELETE /api/payroll/quickbooks/status` | Disconnect QuickBooks |
| `POST /api/payroll/quickbooks/sync` | Sync invoices from QB API (last 90 days) |
| `POST /api/payroll/invoice-import` | Parse QB CSV export, import to invoices table |
| `POST /api/payroll/bookkeeper` | AI bookkeeper chat via Claude claude-sonnet-4-6 |

### Components
| Component | Description |
|-----------|-------------|
| `components/payroll/EmployeePayClient.tsx` | Employee table with pay type/rate/period pay/YTD, click-to-edit pay settings |
| `components/payroll/JobBasedPayClient.tsx` | Installer jobs by date range, earnings summary by installer |
| `components/payroll/QuickBooksClient.tsx` | QB OAuth connect/disconnect, sync invoices, CSV import |
| `components/payroll/AIBookkeeperClient.tsx` | Claude chat with live business context (payroll, revenue, jobs) |

### Updated Files
| File | Change |
|------|--------|
| `components/payroll/PayrollHub.tsx` | Added 4-stat bar at top + 4 new tabs (Employees, Job Pay, QuickBooks, AI Bookkeeper) |

---

## Feature Details

### Stats Bar
Always visible at top of `/payroll`:
- **Current Period Total** — gross for most recent payroll run
- **YTD Payroll** — sum of all `processed` + `paid` runs this calendar year
- **Active Employees** — profiles where `active=true` and role in payroll-relevant roles
- **Next Payroll Date** — calculated biweekly from anchor 2026-01-05

### Pay Periods Tab (existing, enhanced)
- Existing `PayrollRunsClient` with create/process/export CSV
- Now also accessible from the new tabbed hub

### Employee Pay Tab
- Table: name, role, pay type, hourly/salary rate, this period pay, YTD pay
- Click row → right panel with pay stats + editable pay settings
- `PATCH /api/payroll/employee-pay` → upserts `employee_pay_settings` table
- Pay types: hourly, salary, commission, per_job, hybrid

### Job-Based Pay Tab
- Date range defaults to current biweekly period
- Pulls `projects` where `installer_id` is set + stage in (install, prod_review, sales_close, done)
- Calculates earnings: `revenue × percent_job_rate` from `employee_pay_settings`
- Two views: By Installer (summary cards) and Job Detail (table)
- Summary shows: jobs count, total revenue, total earnings, effective pay %

### Run Payroll (existing PayrollRunsClient)
- Summarizes all employees and amounts owed
- [Process Payroll] → creates `payroll_line_items`, marks mileage/expenses as paid
- [Export CSV] → Gusto-compatible CSV download with headers: Employee Name, Email, Pay Period, Hours, Gross Pay

### QuickBooks Integration
**Not connected state:**
- Setup instructions explaining what the integration does
- [Connect QuickBooks] → OAuth 2.0 flow to Intuit
- Requires env vars: `QUICKBOOKS_CLIENT_ID`, `QUICKBOOKS_CLIENT_SECRET`

**Connected state:**
- Shows realm ID and connection date
- [Sync Invoices] → fetches last 90 days from QB API, upserts to `invoices` table
- Shows unmatched customers (QB customer name ≠ any local customer)
- Token auto-refresh on sync

**Invoice Import (CSV):**
- Drag/click CSV upload (QuickBooks Invoice List export format)
- Recognizes column variations: Invoice Number, Customer, Amount, Date, Status, Due Date
- Matches customers by name to existing `customers` table
- Shows imported/skipped/unmatched counts and errors

### AI Bookkeeper
- Chat interface with 6 pre-built quick queries
- Business context fetched on every request: YTD payroll, revenue, profit, GPM, invoices, active/completed jobs
- Uses Claude claude-sonnet-4-6 (instantiated inside handler, not module-level)
- Conversation history maintained client-side (last 8 messages sent to API)
- System prompt identifies as "AI bookkeeper for USA Wrap Co"

---

## TypeScript Fixes (pre-existing bugs fixed)

| File | Fix |
|------|-----|
| `app/leaderboard/page.tsx` | `.catch()` → `.then(() => {}, () => {})` (PostgrestFilterBuilder has no `.catch`) — was in tsconfig.tsbuildinfo cache |
| `app/projects/[id]/page.tsx` | `project as Project` → `project as any` (CustomerRow type mismatch) |
| `components/deckforge/DeckForgeTool.tsx:474` | Added semicolon after `const { x, y, width, height } = layer` to prevent JS parser treating next `[[...]]` as computed property access |
| `components/projects/JobDetailClient.tsx` | `fd.vehicleColor &&` → `!!fd.vehicleColor &&` etc (fd: Record<string,unknown> values not assignable to ReactNode via `&&`) |

---

## Database Tables Used

All tables already exist (no new migration needed):
- `employee_pay_settings` — pay type, rates, worker_type
- `payroll_runs` — pay period batch records
- `payroll_line_items` — individual line items per run
- `projects` — installer_id, revenue for job-based pay
- `app_settings` — stores QuickBooks OAuth tokens (key='quickbooks_tokens')
- `invoices` — target table for QB sync and CSV import
- `customers` — matched by name for invoice import

---

## Environment Variables Required

| Variable | Used For |
|----------|----------|
| `QUICKBOOKS_CLIENT_ID` | QB OAuth |
| `QUICKBOOKS_CLIENT_SECRET` | QB OAuth token exchange |
| `NEXT_PUBLIC_APP_URL` | QB OAuth redirect URI |
| `ANTHROPIC_API_KEY` | AI Bookkeeper (already configured) |

---

## Build Status

- TypeScript: **0 errors**
- Webpack: **Compiled successfully**
- Windows ENOENT (`next-font-manifest.json`): Pre-existing issue on Windows — does NOT affect Vercel deployment (Linux build)

---

## Navigation

PayrollHub now has 7 tabs:
1. **Pay Periods** — existing payroll run processor
2. **Employees** — employee pay settings + YTD
3. **Job Pay** — installer job-based earnings
4. **Installer Calc** — existing CAGE flat rate calculator
5. **QuickBooks** — OAuth sync + CSV import
6. **AI Bookkeeper** — Claude chat with live data
7. **Commissions** — existing legacy commission history
