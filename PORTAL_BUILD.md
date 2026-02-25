# Customer Portal Build Report

## Overview
Full customer portal at `/portal` (portal.usawrapco.com) with magic link auth, dashboard home, job timeline tracking, design studio, invoices, referrals, loyalty, and messaging.

## Phase 1 — Auth
| File | Purpose |
|------|---------|
| `app/portal/login/page.tsx` | Portal login page (server component) |
| `components/portal/PortalLoginClient.tsx` | Magic link email form, success state |
| `app/portal/setup/page.tsx` | Post-magic-link password + name setup |
| `components/portal/PortalSetupClient.tsx` | Password set form, profile name update |
| `app/portal/layout.tsx` | Portal-specific metadata (title, description) |
| `lib/supabase/middleware.ts` | Updated: unauthenticated `/portal` redirects to `/portal/login` |

### Auth Flow
1. Customer visits `/portal` (or `portal.usawrapco.com`)
2. Middleware redirects to `/portal/login` if no session
3. Customer enters email, receives magic link via Supabase OTP
4. Magic link redirects to `/auth/callback?next=/portal/setup`
5. Setup page prompts for name + password
6. Password set via `supabase.auth.updateUser()`, profile name updated
7. Redirect to `/portal` home
8. Future logins: email/password or magic link

## Phase 2 — Portal Home
| Feature | Description |
|---------|-------------|
| Welcome header | Greeting with customer name, active project count |
| Active jobs cards | Top 3 active projects with progress bars, click to detail |
| Quick links grid | 2x3 grid: My Jobs, Design Studio, Invoices, Referrals, Loyalty, Messages |
| Pending proofs alert | Amber banner when design proofs await review |
| Open invoices alert | Green banner showing total balance due |
| Notification bell | Dropdown with unread count badge, marks read on open |
| Bottom mobile nav | 5-tab fixed nav: Home, Jobs, Design, Invoices, Messages |

## Phase 3 — My Jobs
| Feature | Description |
|---------|-------------|
| Job list | All jobs with thumbnail, vehicle, wrap type, status badge, progress bar |
| Job detail | Vehicle info, type, created date, install date |
| Timeline | 8-stage customer-facing timeline with vertical connector |
| Timeline stages | Received > Deposit Paid > In Design > Design Approved > In Production > Quality Check > Ready for Pickup > Complete |
| Current stage | Pulses/glows with CSS animation, "CURRENT" badge |
| Completed stages | Green checkmarks with connected green line |
| Future stages | Dimmed with gray line |
| Photos grid | 3-column grid of job photos (up to 9) |

### Timeline Stage Mapping (internal > customer)
| Internal `pipe_stage` | Customer Timeline Index |
|----------------------|------------------------|
| `sales_in` | Deposit Paid (1) |
| `production` | In Production (4) |
| `install` | Quality Check (5) |
| `prod_review` | Quality Check (5) |
| `sales_close` | Ready for Pickup (6) |
| `done` | Complete (7) |

## Additional Views
| View | Description |
|------|-------------|
| Design Studio | Proof review with approve/reject + feedback |
| Invoices | Invoice list with pay now buttons, status badges |
| Referrals | Referral link display, coming-soon activation |
| Loyalty | Tier system (Bronze/Silver/Gold) based on project count |
| Messages | Send messages to team via job_comments |

## Routes Created
```
/portal              — Authenticated home (redirects to /portal/login if no session)
/portal/login        — Magic link login
/portal/setup        — Password + name setup (post-magic-link)
```

## Routes Preserved (not touched)
```
/portal/demo         — Public demo portal
/portal/[token]      — Token-gated design review
/portal/proof/[token] — Token-gated proof review
/portal/quote/[token] — Token-gated quote approval
```

## Build Status
Zero TypeScript errors. Clean `npm run build` pass.

## Custom Domain
To map `portal.usawrapco.com`:
1. Add CNAME record: `portal.usawrapco.com` -> `cname.vercel-dns.com`
2. In Vercel project settings, add `portal.usawrapco.com` as a custom domain
3. Vercel rewrites can route `portal.usawrapco.com/*` to `/portal/*`
