# AI Mockup Generator with Paywall — Build Report

## Route
`/portal/design` — Public-facing (no auth required), lead generation funnel.

---

## Architecture

### Flow
```
Intake Wizard (3 screens)
  → Claude Sonnet 4.6 generates 3 image prompts
    → Replicate Flux Pro generates 3 mockup images
      → Paywall (blurred previews + $150 Stripe checkout)
        → Webhook unlocks designs + notifies team
```

### Files Created

| File | Purpose |
|------|---------|
| `components/portal/DesignMockupWizard.tsx` | Main wizard component (all 5 steps) |
| `app/portal/design/page.tsx` | Page wrapper with metadata |
| `app/api/design-mockup/generate-prompt/route.ts` | Claude API → 3 detailed image prompts |
| `app/api/design-mockup/generate/route.ts` | Replicate Flux Pro → 3 parallel predictions + polling |
| `app/api/design-mockup/checkout/route.ts` | Stripe checkout session ($150 design deposit) |
| `supabase/migrations/20260224120000_design_mockups.sql` | Database table + RLS + indexes |

### Files Modified

| File | Change |
|------|--------|
| `app/api/payments/webhook/route.ts` | Added Case 2: design_mockup payment handler + team notification |

---

## Wizard Steps

### Step 1 — "Tell us about your business"
- Business name (required)
- Industry dropdown (15 categories)
- Website URL + "Scan" button → `/api/scrape-brand` auto-fills logo, colors, tagline, phone
- Logo upload → Supabase `project-files` storage
- Brand color pickers (up to 4)
- Email address

### Step 2 — "What are we wrapping?"
- Vehicle type cards: Car, Truck, Van, Sprinter, Box Truck, Trailer
- Year / Make / Model text inputs
- Wrap coverage: Full Wrap, Partial, Color Change, Lettering Only

### Step 3 — "Your vibe"
- Style cards with gradient previews: Modern & Clean, Bold & Aggressive, Luxury & Premium, Fun & Playful, Corporate & Professional
- Primary message fields: Business Name, Phone, Website, Tagline

### Step 3.5 — Loading Screen
- Pulsing Sparkles icon
- Animated progress bar with percentage
- Rotating status messages (8 messages, 2.5s intervals)
- 3 shimmer placeholder cards
- ~20-40 second generation time

### Step 4 — Paywall
- 3 blurred/locked mockup previews
- "Your wrap designs are ready" heading
- Estimated price range by vehicle type + coverage
- Green "Unlock Full Designs — $150 Design Deposit" button → Stripe
- Bullet checklist:
  - Full resolution mockups
  - Editable design canvas
  - Professional designer refinement
  - 2 revision rounds
  - Print-ready files
- Trust badge: "$150 deposit applied toward your wrap project"

### Step 5 — Post Payment
- Green "Designs Unlocked" confirmation
- Full resolution mockup display with download buttons
- "What happens next?" explainer (24h designer follow-up, 2 revision rounds)

---

## API Routes

### POST `/api/design-mockup/generate-prompt`
- Input: All form data from wizard
- Calls: Claude `claude-sonnet-4-6-20250514`
- Output: JSON array of 3 detailed Replicate prompts
- Fallback: Generates template prompt on parse failure

### POST `/api/design-mockup/generate`
- Input: `{ prompts: string[], mockupId: string }`
- Calls: Replicate Flux Pro (3 parallel predictions)
- Updates: `design_mockups.prediction_ids` and `image_prompt`
- Output: Array of prediction IDs

### GET `/api/design-mockup/generate?ids=...&mockupId=...`
- Polls Replicate for prediction status
- Stores completed images in Supabase `project-files/design-mockups/`
- Updates `design_mockups.mockup_urls` when all complete
- Returns: `{ results: [...], allDone: boolean }`

### POST `/api/design-mockup/checkout`
- Input: `{ mockupId: string, email?: string }`
- Creates Stripe checkout session ($150)
- Metadata: `{ design_mockup_id, type: 'design_mockup' }`
- Success URL: `/portal/design?mockupId=...&payment=success`

### POST `/api/payments/webhook` (modified)
- New case: `type === 'design_mockup'`
- Updates `design_mockups`: payment_status=paid, unlocked_at, stripe_session_id
- Creates notification for team: "New Paid Design Submission"

---

## Database

### `design_mockups` table
```sql
id              UUID PRIMARY KEY
customer_id     UUID (optional, FK → customers)
org_id          UUID (default org)
business_name   TEXT
industry        TEXT
website_url     TEXT
logo_url        TEXT
brand_colors    JSONB (array of hex strings)
vehicle_type    TEXT
vehicle_year    TEXT
vehicle_make    TEXT
vehicle_model   TEXT
wrap_style      TEXT (full/partial/color_change/lettering)
style_preference TEXT
primary_message JSONB ({businessName, phone, website, tagline})
mockup_urls     JSONB (array of image URLs)
image_prompt    TEXT
prediction_ids  JSONB (array of Replicate prediction IDs)
payment_status  TEXT (pending/paid)
stripe_session_id TEXT
amount_paid     INTEGER
unlocked_at     TIMESTAMPTZ
email           TEXT
phone           TEXT
project_id      UUID (optional, FK → projects)
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ (auto-trigger)
```

### RLS Policies
- `anyone_can_create_design_mockup` — INSERT for all (public form)
- `anyone_can_view_own_design_mockup` — SELECT for all (by ID)
- `service_can_update_design_mockups` — UPDATE for all (webhook/API)

### Indexes
- `idx_design_mockups_org` — org_id
- `idx_design_mockups_email` — email
- `idx_design_mockups_payment` — payment_status
- `idx_design_mockups_stripe` — stripe_session_id

---

## Price Ranges (by vehicle + coverage)

| Vehicle | Full Wrap | Partial | Color Change | Lettering |
|---------|-----------|---------|--------------|-----------|
| Car | $2,500-$3,500 | $1,200-$2,000 | $2,800-$4,500 | $500-$1,200 |
| Truck | $3,000-$4,500 | $1,500-$2,500 | $3,500-$5,000 | $600-$1,500 |
| Van | $3,500-$5,000 | $1,800-$3,000 | $4,000-$6,000 | $700-$1,500 |
| Sprinter | $4,000-$6,000 | $2,000-$3,500 | $4,500-$7,000 | $800-$1,800 |
| Box Truck | $5,000-$8,000 | $2,500-$4,000 | $5,500-$9,000 | $1,000-$2,500 |
| Trailer | $3,500-$6,000 | $2,000-$3,500 | $4,000-$7,000 | $800-$2,000 |

---

## Environment Variables Required

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Claude prompt generation |
| `REPLICATE_API_TOKEN` | Flux Pro image generation |
| `STRIPE_SECRET_KEY` | Checkout session creation |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |
| `NEXT_PUBLIC_APP_URL` | Stripe redirect URLs |

---

## Deployment Notes

1. **Migration**: Push to main triggers `supabase db push` via GitHub Actions
2. **Stripe Webhook**: Add event `checkout.session.completed` to existing webhook endpoint
3. **No new env vars needed** — all 5 variables already exist in production
4. **Build size**: `/portal/design` = 10.6 kB (static prerender)
5. **Zero breaking changes** — all new code, webhook addition is additive
