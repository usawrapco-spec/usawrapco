# Photos & Team Build — Summary

**Commit:** `feat: job team panel, related docs, universal photo system, canvas editor, open invoice alert`
**Build:** 0 errors, all pages compiled successfully.

---

## SECTION 1 — Database Migrations (Applied via Supabase MCP)

| Migration | What it does |
|-----------|-------------|
| `add_designer_production_manager_to_projects` | Adds `designer_id` and `production_manager_id` UUID columns to `projects` table, both referencing `profiles(id)`. Added FK indexes. |
| `create_customer_all_photos_view_v2` | Creates `customer_all_photos` VIEW — UNION of `job_photos` and `vehicle_photos`, joined to `projects` for job title/vehicle desc. |
| Test invoice void | Voided 2 orphaned test invoice IDs. |

---

## SECTION 2 — Job Header Team Assignment Panel

### New Files
| File | Purpose |
|------|---------|
| `app/api/projects/[id]/team/route.ts` | `PUT` endpoint to update `agent_id`, `installer_id`, `designer_id`, `production_manager_id` on a project. |

### Modified Files
| File | Changes |
|------|---------|
| `app/projects/[id]/page.tsx` | Extended project query to include `designer:designer_id(...)` and `production_manager:production_manager_id(...)` joins. |
| `components/projects/JobDetailClient.tsx` | **Added Job Team Panel** (full-width banner above the tabs + sidebar body):<br>• 4-slot row: Customer (link to profile), Sales Agent, Installer, Designer (each with inline avatar + dropdown)<br>• `TeamSlot` sub-component with dashed "Assign" placeholder when unassigned, pencil icon on hover, optimistic update<br>• **Related Documents chips** row: live counts of Estimates/Sales Orders/Invoices/Payments for this project_id<br>• Added `designers` filter from teammates<br>• Added state for team dropdowns and related doc counts<br>• `updateField` extended for `designer_id` + `production_manager_id` |

---

## SECTION 3 — Related Documents Cross-Linking

### New Files
| File | Purpose |
|------|---------|
| `components/shared/RelatedDocsPanel.tsx` | Reusable panel. Given `projectId` + `customerId`, fetches and renders:<br>• Related Estimates, Sales Orders, Invoices, Payments (each with status badge, amount, click-to-navigate)<br>• "Other Jobs — Same Customer" compact list (up to 5, with stage badge, title, revenue)<br>• "View all →" link to customer profile<br>• Status badge colors: green=paid/completed, blue=sent/active, red=overdue, gray=draft/void |

### Modified Files
| File | Changes |
|------|---------|
| `components/estimates/EstimateDetailClient.tsx` | Imports + renders `RelatedDocsPanel` in financial sidebar (below Action Buttons), passing `project_id`, `customer_id`, `currentDocId`, `currentDocType="estimate"` |
| `components/invoices/InvoiceDetailClient.tsx` | Imports + renders `RelatedDocsPanel` at bottom of right column sidebar |
| `components/sales-orders/SalesOrderDetailClient.tsx` | Imports + renders `RelatedDocsPanel` at bottom of right column sidebar |
| `types/index.ts` | Added `project_id?: string \| null` to `Invoice` interface |

---

## SECTION 4 — Universal Customer Photos System

### 4A — Customer Photos Tab
| File | Changes |
|------|---------|
| `components/customers/CustomerDetailClient.tsx` | Added `'photos'` to `TabKey` type. Added "Photos" tab to `TAB_DEFS` array (with Camera icon, positioned second after Activity). Added `CustomerPhotosTab` inner component at bottom of file:<br>• Queries `customer_all_photos` view for all photos across all jobs for this customer<br>• Filter bar: All / Before / After / Design / Vehicle + Job dropdown<br>• Masonry grid with thumbnails, job name tag, category label<br>• Lightbox: full-size preview with Download button and Close |

### 4B — Photos Tab on Job Detail
Already present — `JobPhotosTab` component was already in `JobDetailClient.tsx` as the "Photos" tab. No changes needed.

### 4C — Global Photo Picker Modal
| File | Purpose |
|------|---------|
| `components/media/PhotoPickerModal.tsx` | Reusable modal system with:<br>• `PhotoPickerProvider` — wraps app, holds modal state<br>• `usePhotoPickerModal()` hook — returns `openPicker(config)` / `closePicker()`<br>• `PhotoPickerModal` component — full modal UI with:<br>&nbsp;&nbsp;• Search bar (caption, job, category)<br>&nbsp;&nbsp;• All / Recent tabs<br>&nbsp;&nbsp;• Photo grid with checkboxes (multi-select or single mode)<br>&nbsp;&nbsp;• Selected count tray + "Use X Photos" confirm button<br>&nbsp;&nbsp;• Queries `customer_all_photos` view (limit 200) |

### 4D — Canvas Photo Editor
| File | Purpose |
|------|---------|
| `components/media/PhotoEditorModal.tsx` | Full-screen modal photo editor using **Fabric.js** (loaded lazily via dynamic import):<br>• Left toolbar: Select, Draw (freehand pen), Add Text (IText), Rectangle, Circle, Rotate L/R, Flip H/V, Reset<br>• Right panel: Color picker, Brush width slider, Brightness/Contrast/Saturation sliders (Image.filters)<br>• Top bar: Download (canvas.toDataURL), Save as New (uploads to `project-files` bucket → inserts `job_photos` record), Close<br>• Keyboard: Delete key removes selected object, Ctrl+Z/Ctrl+Y undo/redo<br>• CORS: loads image with `crossOrigin: 'anonymous'`<br>• `AdjustSlider` sub-component for filter controls |

---

## SECTION 5 — Open Invoices Dashboard Alert

### New Files
| File | Purpose |
|------|---------|
| `components/invoices/OpenInvoicesAlert.tsx` | **Persistent alert banner** component:<br>• Loads invoices with `status IN ('sent', 'overdue')` client-side (or accepts `initialInvoices` prop)<br>• Shows amber banner for "sent", red banner for "overdue"<br>• Displays total outstanding balance<br>• Lists top 3 invoices: customer name, invoice #, amount, status badge<br>• "Mark Paid" button on each → opens inline quick-pay modal (amount + method selector)<br>• Payment modal: records to `payments` table, updates `invoices.status` to `paid` or `partial`<br>• "View All Invoices" link<br>• **Does not dismiss** — only disappears when all invoices are paid |

### Modified Files
| File | Changes |
|------|---------|
| `app/dashboard/page.tsx` | Imports and renders `OpenInvoicesAlert` at the very top of the dashboard content area (above VinylDailyBrief / DashboardHero) |
| `components/invoices/InvoicesClient.tsx` | Imports and renders `OpenInvoicesAlert` with pre-filtered `initialInvoices` (status sent/overdue) at the top of the invoices list page |

---

## Files Changed Summary

| Category | New | Modified |
|----------|-----|----------|
| API Routes | 1 | — |
| Components | 4 | 6 |
| Pages | — | 2 |
| Types | — | 1 |
| DB Migrations | 2 applied via MCP | — |
| **Total** | **5** | **9** |
