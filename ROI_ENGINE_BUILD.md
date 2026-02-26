# ROI Engine Build Report

**Built:** 2026-02-25
**Version:** v6.2

## Database Tables Created

| Table | Description |
|-------|------------|
| `wrap_campaigns` | One per customer vehicle — tracks wrap investment, tracking phone, QR slug |
| `wrap_tracking_events` | Every call, QR scan, and job logged — with geo data |
| `wrap_route_logs` | Daily driving routes with AI analysis results |
| `wrap_roi_snapshots` | Daily rollup for charting ROI over time |

**RLS Policies:** All tables have org-based RLS. `wrap_tracking_events` has a public INSERT policy for unauthenticated QR scans.

## Files Created

### API Routes
| File | Method | Description |
|------|--------|------------|
| `app/api/roi/campaigns/route.ts` | GET/POST | List all campaigns, create new campaign |
| `app/api/roi/campaigns/[id]/route.ts` | GET/PUT/DELETE | Single campaign CRUD with aggregated stats |
| `app/api/roi/events/route.ts` | POST | Log tracking events (calls, scans, jobs) |
| `app/api/roi/route-analysis/route.ts` | POST | Analyze route with TomTom traffic API (with algorithmic fallback) |
| `app/api/twilio/generate-number/route.ts` | POST | Provision Twilio tracking number (demo mode if no API keys) |
| `app/api/twilio/inbound-call/route.ts` | POST | Twilio webhook — logs calls, forwards to real number |
| `app/api/track/[slug]/route.ts` | GET/POST | QR scan handler — logs event, IP geolocation, redirects |

### Pages
| File | Route | Description |
|------|-------|------------|
| `app/roi/layout.tsx` | `/roi/*` | Auth-gated layout with TopNav + MobileNav |
| `app/roi/page.tsx` | `/roi` | Campaign list with stats row and grid |
| `app/roi/new/page.tsx` | `/roi/new` | 3-step wizard: Calculator → Route Mapper → Tracking Setup |
| `app/roi/[campaignId]/page.tsx` | `/roi/:id` | Campaign portal: map, live feed, A/B comparison, job logger |
| `app/roi/[campaignId]/route-mapper/page.tsx` | `/roi/:id/route-mapper` | Standalone route mapper for existing campaigns |

### Components
| File | Description |
|------|------------|
| `components/roi/ROICalculator.tsx` | Industry selector, LTV input, live ROI output with CPM comparison |
| `components/roi/RouteMapper.tsx` | Leaflet map with click-to-add waypoints, traffic analysis |
| `components/roi/QRGenerator.tsx` | QR code generation (qrcode lib), tracking number provisioning |
| `components/roi/LeadOriginMap.tsx` | Leaflet map with color-coded event markers + realtime subscription |
| `components/roi/LiveActivityFeed.tsx` | Real-time event feed with Supabase realtime |
| `components/roi/ROICampaignCard.tsx` | Campaign card with ROI, stats, break-even progress |
| `components/roi/JobLogger.tsx` | Form to log jobs with source, value, notes |
| `components/roi/RouteABComparison.tsx` | Route A vs B comparison with AI recommendation |

### Utilities
| File | Description |
|------|------------|
| `lib/area-codes.ts` | 100+ US area code to city/lat/lng lookup for call geolocation |

### Navigation Updates
| File | Change |
|------|--------|
| `components/layout/Sidebar.tsx` | Added "ROI Engine" with BarChart3 icon, `sales.read` permission |
| `components/layout/MobileNav.tsx` | Added "ROI Engine" to More panel |

## Packages Installed
- `qrcode` + `@types/qrcode` — QR code generation (2000x2000 print-ready)
- `react-leaflet` + `leaflet` + `@types/leaflet` — Interactive maps

## Environment Variables Needed
| Variable | Purpose |
|----------|---------|
| `TWILIO_ACCOUNT_SID` | Twilio console — for provisioning tracking numbers |
| `TWILIO_AUTH_TOKEN` | Twilio console — for provisioning tracking numbers |
| `TWILIO_DEFAULT_FROM` | Default Twilio number for forwarding |
| `TOMTOM_API_KEY` | TomTom Developer — for real traffic flow data |
| `NEXT_PUBLIC_APP_URL` | App URL for QR codes and webhooks |

**Note:** The system works in demo mode without these keys. Twilio generates fake numbers, TomTom falls back to algorithmic impression estimates.

## Features Implemented

1. **ROI Calculator** — Industry-based LTV, live ROI projections, CPM comparison table
2. **Route Mapper** — Leaflet map with waypoint drawing, TomTom traffic API integration, algorithmic fallback
3. **Tracking Number + QR** — Twilio number provisioning (demo mode), QR code generation with print-ready PNG download
4. **Campaign Portal** — Live ROI dashboard with map, activity feed, job logger, break-even tracker
5. **Lead Origin Map** — Color-coded markers (green=calls, purple=QR, yellow=jobs) with Supabase realtime
6. **Route A/B Comparison** — AI groups routes, shows performance comparison with recommendation
7. **QR Scan Tracking** — Public API endpoint logs scans with IP geolocation, optional GPS upgrade
8. **Inbound Call Tracking** — Twilio webhook logs calls with area code geolocation, forwards to real number
