# GAMIFICATION BUILD REPORT
**Date:** 2026-03-02
**Version:** v6.2
**Status:** Complete

---

## PART A — XP AWARDING LOGIC

### New Utility: `lib/xp.ts`
Clean wrapper with signature `awardXP(userId, orgId, action, amount, metadata?)`.
- Uses admin client internally — no supabase param required
- Takes direct `amount` (bypasses XP_VALUES lookup)
- Stores `org_id` + `metadata` JSONB in ledger
- Triggers `checkAndAwardBadges` after every award
- Graceful failure — never throws, never blocks

### New XP Actions added to `lib/commission.ts`
| Action | XP | Description |
|---|---|---|
| `job_comment` | 5 | Comment added to job chat |
| `photo_upload` | 10 | Photo uploaded to job |
| `customer_created` | 20 | New customer record created |
| `estimate_sent` | 15 | Estimate sent to customer |
| `design_proof_uploaded` | 25 | Design proof uploaded & sent |
| `invoice_fully_paid` | 50 | Invoice fully paid (balance = 0) |
| `clock_in` | 5 | Clocked in via timeclock |
| `streak_bonus_5day` | 50 | 5-day login streak milestone |

### XP Injection Points

**Server-side API routes (use `lib/xp.ts` directly):**
| File | Trigger | XP | Action |
|---|---|---|---|
| `app/api/proof/create/route.ts` | Proof insert success | +25 | `design_proof_uploaded` |
| `app/api/media/upload/route.ts` | File upload success (if userId + orgId) | +10 | `photo_upload` |
| `app/api/estimates/send/route.ts` | Estimate marked sent | +15 | `estimate_sent` |
| `app/api/payments/record-manual/route.ts` | Invoice balance reaches 0 | +50 | `invoice_fully_paid` |

**Client components (fire-and-forget fetch to `/api/xp/award`):**
| File | Trigger | XP | Action |
|---|---|---|---|
| `components/chat/JobChat.tsx` | `sendMessage()` success | +5 | `job_comment` |
| `components/customers/CustomersClient.tsx` | Customer insert success | +20 | `customer_created` |
| `components/payroll/EnhancedTimeclockClient.tsx` | `clockIn()` success | +5 | `clock_in` |

**Already existed (pre-built):**
| File | Trigger | XP | Action |
|---|---|---|---|
| `components/projects/ProjectDetail.tsx:closeJob()` | Job closed to 'done' | +100 | `deal_won` |
| `app/api/xp/daily-login/route.ts` | Daily login | +5–15 | `daily_login` |
| `app/api/xp/intake-submitted/route.ts` | Customer intake submitted | +15 | `intake_submitted` |

### Badge Fixes
- `checkAndAwardBadges()` in `lib/gamification.ts` now **inserts to `user_badges` table** (previously only updated the JSONB array on profiles)
- This powers the Recent Achievements feed in the leaderboard

### 5-Day Streak Bonus
- `updateLoginStreak()` now awards **+50 XP** when `newStreak % 5 === 0`
- Logged to xp_ledger with `reason: 'streak_bonus_5day'`
- Applies at day 5, 10, 15, 20, 25, 30...

### Badge Check Criteria (15 badges)
Automatically checked after every XP award via `checkAndAwardBadges()`:

| Badge ID | Criteria | Rarity | XP Value |
|---|---|---|---|
| `hot_streak` | 7+ day login streak | common | — |
| `early_bird` | 14+ day login streak | common | — |
| `marathon` | 30+ day login streak | common | — |
| `elite` | Level 25+ | rare | — |
| `closer` | 10+ closed deals | rare | — |
| `sharpshooter` | 5+ deals with GPM > 50% | rare | — |
| `shutterbug` | 50+ photos uploaded | common | — |
| `team_player` | 5+ cross-division referrals | rare | — |
| `speed_demon` | 1+ job closed 2+ days before scheduled install | rare | — |
| `material_wizard` | 20+ vinyl usage entries | rare | — |
| `pixel_perfect` | 5+ proofs approved on first pass | rare | — |
| `zero_waste` | 5+ material usage entries (early badge) | common | — |
| `perfect_brief` | 5+ production stage approvals | rare | — |
| `top_dog` | Highest monthly XP in org | legendary | — |
| `first_wrap` / `gpm_hero` / etc. | See badges table seeded in migration | various | 50–1000 |

---

## PART B — LEADERBOARD UI (`/leaderboard`)

### Existing (pre-built, fully functional)
- Weekly / Monthly / Quarter / All Time tabs
- Department tabs: Sales, Install, Production (coming soon), Design (coming soon), XP Board
- Division filters: All, Wraps, Decking, Tinting, PPF, Marine
- Current user profile bar with level, XP, progress bar, streak
- Top 3 gold/silver/bronze styling (Crown, Medal icons)
- Shop Records panel
- Division Breakdown chart
- Recent Achievements feed (Supabase realtime)
- Team Overview stats

### New in this build

**XP Breakdown on Hover:**
- Hover any row in XP Board to see per-action breakdown
- Shows top 5 XP sources for that user
- Data sourced from xp_ledger (fetched server-side, grouped by user+action)
- Only shows if ledger has data for that user

**My Stats Panel:**
- Accessible via "My Stats" toggle button in profile bar
- Two tabs: **Badges** and **XP History**
- **Badges tab**: All 15 badges in a grid — earned (colored with rarity ring), locked (greyed with criteria tooltip on hover)
- **XP History tab**: Last 25 xp_ledger entries with action label, XP amount, relative time

---

## PART C — LEADERBOARD PERIODS

### Period Snapshot Logic (`app/leaderboard/page.tsx`)
- On every page load, calls `ensurePeriod()` for current week and current month
- Period bounds: week = Mon–Sun, month = 1st–last day
- Snapshot is refreshed if `computed_at` is > 1 hour old
- Rankings stored as JSONB: `[{rank, userId, name, xp, level}]`
- Categories: `xp` (expandable to `sales`, `installs` in future)

---

## DATABASE CHANGES

### Migration: `20260302200000_xp_ledger_enhancements.sql`
```sql
ALTER TABLE xp_ledger ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES orgs(id);
ALTER TABLE xp_ledger ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
```
- Adds org scoping for multi-tenant XP queries
- Adds metadata JSONB for rich context (project_id, invoice_id, etc.)
- 3 new indexes for performance

---

## LEVEL FORMULA

Using existing `xpToLevel()` from `lib/commission.ts`:
- 50 levels defined in `XP_LEVELS` array
- Level 1: 0 XP, Level 5: 500 XP, Level 10: 2,000 XP, Level 25: 14,000 XP, Level 50: 100,000 XP
- Progress bar uses `xpForNextLevel()` helper

---

## FILES CREATED
- `lib/xp.ts` — New clean XP utility
- `supabase/migrations/20260302200000_xp_ledger_enhancements.sql` — DB migration
- `GAMIFICATION_BUILD.md` — This report

## FILES MODIFIED
- `lib/commission.ts` — 8 new XP actions added
- `lib/gamification.ts` — user_badges inserts + 5-day streak bonus
- `app/api/proof/create/route.ts` — XP award on proof upload
- `app/api/media/upload/route.ts` — XP award on photo upload
- `app/api/estimates/send/route.ts` — XP award on estimate sent
- `app/api/payments/record-manual/route.ts` — XP award on invoice paid
- `components/chat/JobChat.tsx` — XP award on comment
- `components/customers/CustomersClient.tsx` — XP award on customer create
- `components/payroll/EnhancedTimeclockClient.tsx` — XP award on clock-in
- `app/leaderboard/page.tsx` — Periods, all badges, XP history, breakdown data
- `components/leaderboard/LeaderboardClient.tsx` — My Stats panel, hover breakdown, new props
