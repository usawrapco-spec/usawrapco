# USA WRAP CO — Site Audit Report
**Date:** 2026-02-27
**Build Status:** PASSING (397 pages, 0 TypeScript errors after fixes)
**Version:** v6.2

---

## Build Fixes Applied (TypeScript null-check errors)

The following files had TypeScript errors causing build failure that were fixed:

| File | Error | Fix |
|------|-------|-----|
| `app/design-studio/[job_id]/page.tsx` | `params` possibly null | `params?.job_id` |
| `app/design/[id]/print-layout/page.tsx` | `params` possibly null | `params?.id` |
| `app/portal/proof/[token]/page.tsx` | `params` possibly null | `params?.token` |
| `app/presentation/[token]/page.tsx` | `params` possibly null | `params?.token` |
| `app/roi/[campaignId]/page.tsx` | `params` possibly null | `params?.campaignId` |
| `app/roi/[campaignId]/route-mapper/page.tsx` | `params` possibly null | `params?.campaignId` |
| `components/design/DesignStudioLayout.tsx` | `pathname` null index | `pathname ?` guard |
| `components/intake/WrapFunnelClient.tsx` | `searchParams` possibly null | `searchParams?.get()` |
| `components/jobs/JobsClient.tsx` | `searchParams` possibly null | `searchParams?.get()` |
| `components/pipeline/UnifiedJobBoard.tsx` | `searchParams` possibly null | `searchParams?.get()` |
| `components/settings/EmailAccountsClient.tsx` | `searchParams` possibly null | `searchParams?.get()` |
| `components/layout/SideNav.tsx` | `pathname` null param | null guard in `isActiveRoute` |
| `components/layout/TopBar.tsx` | `pathname` null index | `pathname ?` guard |
| `components/layout/TopNav.tsx` | `pathname` possibly null | null guard in `isActiveLink` |
| `components/portal/PortalShell.tsx` | `pathname` possibly null | null guard in `isActive` |

---

## Sidebar Nav Links -> Route Check

All 39 sidebar links point to existing page.tsx files. Zero broken nav links.

### SALES
| Label | Route | Exists |
|-------|-------|--------|
| Dashboard | /dashboard | YES |
| Pipeline | /pipeline | YES |
| Estimates | /estimates | YES |
| Proposals | /proposals | YES |
| Customers | /customers | YES |
| Calendar | /calendar | YES |

### PRODUCTION
| Label | Route | Exists |
|-------|-------|--------|
| Jobs | /jobs | YES |
| Production Queue | /production | YES |
| Install Schedule | /install/schedule | YES |
| QC | /production/print-schedule | YES |

### DESIGN
| Label | Route | Exists |
|-------|-------|--------|
| Design Studio | /design | YES |
| Brand Assets | /media-library | YES |
| Mockups | /mockup | YES |

### FINANCE
| Label | Route | Exists |
|-------|-------|--------|
| Invoices | /invoices | YES |
| Payments | /payments | YES |
| Transactions | /transactions | YES |
| Expenses | /expenses | YES |
| Payroll | /payroll | YES |
| Pay Settings | /payroll/employees | YES |
| Payroll History | /payroll/history | YES |
| Gusto Export | /payroll/gusto | YES |
| Commission | /settings/commissions | YES |
| Reports | /reports | YES |
| Overhead | /overhead | YES |

### TEAM
| Label | Route | Exists |
|-------|-------|--------|
| Staff | /employees | YES |
| Leaderboard | /leaderboard | YES |
| Time Tracking | /timeclock | YES |

### MARKETING
| Label | Route | Exists |
|-------|-------|--------|
| Affiliates | /network | YES |
| Outbound CRM | /prospects | YES |
| Campaigns | /campaigns | YES |

### MARINE / FISHING
| Label | Route | Exists |
|-------|-------|--------|
| Dashboard | /fishing | YES |
| Catch Log | /fishing/catch-log | YES |
| Fishing Spots | /fishing/spots | YES |
| Reports | /fishing/reports | YES |
| Regulations | /fishing/regulations | YES |
| Tides | /fishing/tides | YES |
| Marinas | /fishing/marinas | YES |
| Boating Zones | /fishing/boating | YES |
| VHF Channels | /fishing/vhf | YES |

### SETTINGS
| Label | Route | Exists |
|-------|-------|--------|
| General | /settings | YES |
| Defaults | /settings/defaults | YES |
| Commission Rules | /settings/commissions | YES |
| Review Requests | /settings/reviews | YES |
| Process Guide | /process | YES |
| Integrations | /integrations | YES |

---

## Summary

| Metric | Value |
|--------|-------|
| Total page.tsx files | ~185 |
| Total API route.ts files | ~200+ |
| Total pages built | 397 |
| Sidebar nav links | 39 |
| Broken sidebar links (404) | 0 |
| Build errors before audit | 15 TypeScript errors |
| Build errors after audit | 0 |
| Pages that failed to compile | 0 |

---

## Key Findings

1. BUILD WAS BROKEN before this audit — 15 TypeScript null-check errors blocked compilation.
   All fixed. Build is now clean.

2. ALL 39 sidebar nav links are valid — every link has a corresponding page.tsx.

3. FISHING / MARINE section is a new complete feature (9 sub-pages all present and building).

4. /sales/page.tsx is a new page not previously documented in CLAUDE.md.

5. pages/ directory contains only pages/500.tsx — this is the custom 500 error page
   used by Next.js App Router. Not a conflict.

6. Untracked files not yet committed:
   - app/fishing/ (full fishing module, 9 pages)
   - app/sales/page.tsx (new sales dashboard)
   - components/fishing/ (fishing UI components)
   - pages/ (only 500.tsx — OK)
   - app/api/ai-broker/inbound/route.ts (modified)

---

## Next Steps for Phase 2

- Spot-check content quality of new fishing pages and sales page (may have placeholder content)
- Verify DB connectivity on key pages (payroll, finance, fishing)
- Check for missing RLS policies on new tables
- Commit untracked files
