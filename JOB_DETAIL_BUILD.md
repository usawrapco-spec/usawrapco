# Job Detail Page — Build Report

## Audit Findings

All job card click handlers across the codebase navigate to `/projects/[id]`:

| Component | Route |
|-----------|-------|
| `components/pipeline/PipelineJobCard.tsx` | `/projects/${project.id}` |
| `components/pipeline/UnifiedJobBoard.tsx` | `/projects/${project.id}` |
| `components/pipeline/DeckingPipeline.tsx` | `/projects/${id}` |
| `components/pipeline/TintingPipeline.tsx` | `/projects/${id}` |
| `components/jobs/JobsClient.tsx` | `/projects/${job.id}` |
| `components/calendar/CalendarPage.tsx` | `/projects/${p.id}` |
| `components/customers/CustomerDetailClient.tsx` | `/projects/${p.id}` |
| `components/install/InstallDashboardClient.tsx` (Link) | `/projects/${job.id}` |
| `components/pipeline/SalesPipeline.tsx` | `/jobs/${p.id}` → redirects to /projects |
| `components/pipeline/ProductionPipeline.tsx` | `/jobs/${p.id}` → redirects to /projects |
| `components/pipeline/InstallPipeline.tsx` | `/jobs/${p.id}` → redirects to /projects |

Route `app/jobs/[id]/page.tsx` is a simple `redirect('/projects/${params.id}')`.

The canonical detail route is `/projects/[id]`.

---

## Files Created / Modified

### Created
- **`components/projects/JobDetailClient.tsx`** (~530 lines)
  New client component replacing `ProjectDetail` at the `/projects/[id]` route.

### Modified
- **`app/projects/[id]/page.tsx`**
  Updated to fetch `stage_approvals` server-side and render `JobDetailClient` instead of `ProjectDetail`.

---

## New Component Structure

### `JobDetailClient.tsx`

**Header Bar**
- Back button (`router.back()`)
- Job title (inline editable input when editing=true)
- Stage badge (color-coded per pipeline stage)
- Priority badge (color-coded: urgent=red, high=amber, normal=gray, low=dim)
- Division chip (wraps / decking)
- Edit / Save / Cancel buttons

**5 Tabs**

| Tab | Data Source | Implementation |
|-----|------------|----------------|
| Overview | `projects`, `customers` join (from props) | Inline — stat cards + info grid |
| Timeline | `stage_approvals` (server-fetched, passed as `initialApprovals`) | Inline — vertical timeline |
| Comments | `job_comments` table | Reuses `components/chat/JobChat.tsx` |
| Photos | `job_photos` table via `/api/job-photos` | Reuses `components/projects/JobPhotosTab.tsx` |
| Proofs | `design_proofs` table | Reuses `components/projects/ProofingPanel.tsx` |

**Overview Tab Cards**
- Revenue / Profit / GPM / Commission — uses `fin_data` with fallback to top-level fields
- Customer card — name (linked to `/customers/[id]`), company, phone, email, lifetime spend
- Vehicle & Job — `vehicle_desc`, `form_data.vehicleColor`, `type`, `form_data.jobType`
- Dates — install date + due date (editable via date inputs in edit mode)
- Team — agent name, installer name
- Notes — `form_data.notes` if present

**Timeline Tab**
- Pulls `initialApprovals` (server-side fetched from `stage_approvals` with approver join)
- Vertical timeline with stage color dot + connector line
- Shows: stage label, timestamp, approver name, note if any
- Empty state: "No stage history yet"

**Actions Sidebar** (right column, desktop; stacked below on mobile)
- Stage dropdown — updates `projects.pipe_stage` via Supabase client
- Priority pill buttons — updates `projects.priority`
- Installer select dropdown — filters teammates by `role === 'installer'`
- Sales Agent select dropdown — filters teammates by `role in [sales_agent, admin, owner]`
- "View Pipeline" link → `/pipeline`

**Mobile**
- Sidebar stacks below tab content (`className="hidden md:flex"` / `className="md:hidden"`)
- Tab bar horizontally scrollable with `overflowX: auto`

---

## TypeScript

- `tsc --noEmit` → **0 errors** (excluding stale `.next/types` cache entries, which auto-resolve on deploy)
- `Project.customer` is cast via `as unknown as CustomerRow` internally — avoids modifying the shared `Project` type
- All sub-components (JobChat, JobPhotosTab, ProofingPanel) accept their existing prop signatures unchanged

---

## Stage Colors Reference

| Stage | Color |
|-------|-------|
| sales_in | `#4f7fff` (accent blue) |
| production | `#f59e0b` (amber) |
| install | `#22d3ee` (cyan) |
| prod_review | `#8b5cf6` (purple) |
| sales_close | `#22c07a` (green) |
| done | `#22c07a` (green) |
