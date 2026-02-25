# Loyalty & Referral Build Report

## Summary
Built customer-facing loyalty program and referral system pages within the authenticated portal. Both features integrate with existing Supabase tables and follow the platform's dark-theme inline-style patterns.

---

## New Pages

### `/portal/loyalty` — Loyalty Program
**Files:**
- `app/portal/loyalty/page.tsx` — Server page (auth gate)
- `components/portal/PortalLoyaltyClient.tsx` — Full client component

**Features:**
- **Tier display** with icon, color, and gradient accent bar
  - Bronze: $0 – $5k lifetime spend
  - Silver: $5k – $15k
  - Gold: $15k – $30k
  - Platinum: $30k+
- **Progress bar** to next tier with spend markers
- **Points balance** (1 point per $1 spent on paid invoices)
- **Stats row**: Lifetime Spend | Points Balance | Points Earned
- **Redeem button**: 500 pts = $50 off (inserts `loyalty_redemptions` row, status `pending`)
- **Tier benefits list** showing all four tiers, active tier highlighted, locked tiers dimmed
- **Points history table**: Date | Job | Points Earned (sourced from paid invoices)
- **Redemptions section**: Shows all redemptions with status badges (pending/approved/applied/denied)

### `/portal/referrals` — Referral & Affiliate Program
**Files:**
- `app/portal/referrals/page.tsx` — Server page (auth gate)
- `components/portal/PortalReferralsClient.tsx` — Full client component

**Features:**
- **Referral link** with unique code from `referral_codes` table
- **Generate link** button if customer doesn't have one yet
- **Share buttons**: Copy Link | Text (sms:) | Email (mailto:)
- **Dashboard stats**: Referrals Sent | Converted | Total Earned
- **Earnings breakdown**: Pending vs Paid ($100 credit per converted referral)
- **Affiliate tier** (unlocks at 3+ converted referrals):
  - Progress bar showing X/3 conversions
  - Once unlocked: 5% commission on referred customer's first job value
  - Affiliate earnings display
  - Request Payout button (sets `payout_requested` flag for admin review)
- **Referral history table**: Date | Referred | Status | Earnings
- **How It Works** explainer (4-step guide)

---

## Portal Navigation Update
**File:** `components/portal/PortalClient.tsx`

Added two quick-link buttons to the portal welcome banner:
- **Loyalty Program** (star icon, amber accent) → `/portal/loyalty`
- **Refer a Friend** (share icon, blue accent) → `/portal/referrals`

---

## Database Migration
**File:** `supabase/migrations/20260224100000_loyalty_redemptions.sql`

### New Table: `loyalty_redemptions`
```sql
CREATE TABLE loyalty_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  points_redeemed INT NOT NULL,
  dollar_value DECIMAL(10,2) NOT NULL,
  project_id UUID REFERENCES projects(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','applied','denied')),
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### RLS Policies
- `loyalty_redemptions_customer_read` — Customers can view their own
- `loyalty_redemptions_customer_insert` — Customers can request redemptions
- `loyalty_redemptions_staff` — Staff (admin/owner/sales_agent) can manage all in their org

### Schema Alterations
- `referral_codes.affiliate_unlocked` (BOOLEAN) — Tracks affiliate tier status
- `referral_codes.affiliate_commission_pct` (NUMERIC) — Affiliate commission rate (default 5%)
- `referral_tracking.payout_requested` (BOOLEAN) — Payout request flag
- `referral_tracking.payout_requested_at` (TIMESTAMPTZ) — Payout request timestamp

---

## Existing Tables Used (no changes)
| Table | Usage |
|-------|-------|
| `invoices` | Points calculation (paid invoices = earned points) |
| `referral_codes` | Customer referral code storage and lookup |
| `referral_tracking` | Referral conversion tracking and status |
| `customers` | Customer identity and tier data |

---

## Tier Thresholds
| Tier | Min Spend | Benefits |
|------|-----------|----------|
| Bronze | $0 | Standard service |
| Silver | $5,000 | Free design revision, priority scheduling |
| Gold | $15,000 | Free removal on next job, dedicated account manager |
| Platinum | $30,000 | 5% discount all jobs, free ceramic coating annually |

## Points System
- **Earn**: 1 point per $1 spent (from paid invoices)
- **Redeem**: 500 points = $50 off next job
- **Redemption flow**: Customer clicks Redeem → row inserted with `pending` status → admin approves → credit applied

## Referral Earnings
- **Standard**: $100 credit per converted referral
- **Affiliate**: Unlocks at 3+ conversions → 5% of referred customer's first job value
- **Payout**: Customer requests payout → admin reviews and processes

---

## Build Status
- Compiled successfully with zero TypeScript errors
- All 207 pages generated including new portal/loyalty and portal/referrals
- No breaking changes to existing functionality
