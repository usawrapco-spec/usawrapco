# USA WRAP CO — REQUIREMENTS.md
# THE PERMANENT SOURCE OF TRUTH
# Claude Code: READ THIS ENTIRE FILE before doing ANY work.
# Last compiled: Feb 22, 2026 from all past conversations with the owner.

---

## VISION

USA Wrap Co is building an AI-first autonomous wrap shop platform. AI handles EVERYTHING except physical printing and installation: customer intake, sales conversations, design creation, mockup generation, pricing, production file prep, scheduling, follow-ups, and all communication. Humans only touch the physical work.

---

## TECH STACK

- Next.js 14 (App Router, TypeScript, .tsx/.ts files)
- Supabase (project: uqfqkvslxoucxmxxrobt)
- Vercel (auto-deploy from GitHub)
- GitHub: usawrapco-spec/usawrapco
- Tailwind CSS + inline styles
- Lucide React icons (NO emojis in code)
- Dark theme colors: bg=#0d0f14, surface=#13151c, surface2=#1a1d27, accent=#4f7fff, green=#22c07a, red=#f25a5a, cyan=#22d3ee, amber=#f59e0b, purple=#8b5cf6, text1=#e8eaed, text2=#9299b5, text3=#5a6080
- Fonts: Barlow Condensed for headers, JetBrains Mono for numbers/money
- Org ID: d34a6c47-1ac0-4008-87d2-0f7741eebc4f

### Key File Paths
- Supabase client: lib/supabase/client.ts (client-side), lib/supabase/server.ts (server-side)
- Dashboard: app/dashboard/page.tsx → components/dashboard/DashboardClient.tsx
- Job detail: components/projects/ProjectDetail.tsx
- Pipeline: components/pipeline/PipelineBoard.tsx
- Main DB table: `projects` with columns: id, org_id, type, title, status, customer_id, agent_id, installer_id, priority, vehicle_desc, install_date, due_date, revenue, profit, gpm, commission, division, pipe_stage, form_data (jsonb), fin_data (jsonb), actuals (jsonb), checkout (jsonb), send_backs (jsonb), referral, created_at, updated_at

### Rules
- .env.local must be in .gitignore. Never commit secrets.
- Admin role sees ALL nav items — bypass all canAccess checks when profile.role === 'admin'
- All navigation uses Next.js <Link> or router.push(). No window.open(), no target="_blank"
- Pipeline stages: sales_in → production → install → prod_review → sales_close → done

---

## UI/UX REQUIREMENTS — CRITICAL

### Layout: Shopvox-Style
- TOP NAVIGATION BAR (not sidebar). Horizontal nav maximizes screen real estate.
- The owner provided Shopvox Express screenshots as the design reference. Match that layout pattern.
- Mobile-first design — installers and sales reps use phones in the field.
- PWA-ready (installable on home screen).

### V.I.N.Y.L. Chat Widget
- Floating chat widget on EVERY page, positioned prominently
- ChatGPT-style interface: message bubbles, typing indicator, scrollable history
- NOT just a text input with JSON output
- Voice input capability
- Can execute CRM actions (create jobs, look up customers, etc.)

### Job Cards
- Trello-style kanban boards with department-specific views
- Clickable inline status/stage editing on dashboard cards
- Progress tick marks showing which stages are complete
- Division switcher: Wraps / Decking / Master (filters all views)

---

## CORE WORKFLOW — ESTIMATE TO CLOSE

### Creating a New Estimate
- Clicking "+ New" must IMMEDIATELY open a blank estimate form. NOT redirect to the estimates list.
- The user lands directly in the editor ready to add line items.

### Job Card Tabs (3 tabs)
- **TAB 1 — ESTIMATE (this is the "sales" tab):**
  - This is where line items live
  - Each line item has its OWN BUILT-IN pricing calculator that appears INSIDE the line item row
  - Calculator appears when you select a product type
  - ALL product types get calculators: Commercial Wrap, Marine/Decking, PPF, Box Truck, Trailer
  - NOT a separate static calculator page — the calculator IS the line item
  - Multiple line items per estimate (e.g., full wrap + PPF hood + chrome delete)
  - Live financial sidebar always visible: Final Price, COGS, Net Profit, Gross Margin, Line-Item Breakdown
  - Sales commission calc with tier bonuses displayed
  - Margin target slider
  - "Save Estimate" button

- **TAB 2 — DESIGN & SCOPE:**
  - Design instructions textarea
  - Brand colors fields
  - File upload for reference images
  - Designer assignment dropdown
  - Design status: Not Started | In Progress | Proof Sent | Approved
  - Material type, labor %, design scope details

- **TAB 3 — LOGISTICS & STATUS:**
  - Install date, installer assignment
  - Status dropdown
  - Notes

- Tab 2 and 3 must be completed by sales before the job can advance to Production.

### Vehicle Calculators (inside each line item)

**Commercial Vehicles:**
- Quick-select grid: Small Car, Med Car, Full Car, Sm Truck, Med Truck, Full Truck, Med Van, Large Van, XL Van
- Each has preset pricing and installer pay defaults
- CSV database of vehicle dimensions/square footage for accurate quoting
- Labor % or flat pay modes
- Prep work add-on ($35/hr)
- Rivets/screws add-ons
- Design fee, misc costs
- Override fields for manual pricing

**Box Trucks:**
- Dimension inputs: length, width, height
- Cab wrap option (adds to revenue, installer pay based on % of whole job, not just cab)
- Default height visual display
- Full sqft breakdown

**Trailers:**
- Full / ¾ / ½ coverage options
- V-Nose mode: Custom H×L or ½ Standard calculation
- Default 7ft 6in (7.5ft) height
- Front panel options
- Sqft: length × height × 2 sides

**Marine/Decking:**
- Boat section diagram (clickable parts)
- Vertical gunnels checkbox on main deck
- Custom sizing + save standard sizes
- Linear feet and passes calculations
- Installer selector
- Extra info fields like wraps Tab 2 & 3

**PPF (Paint Protection Film):**
- 8 preset packages: Standard Front, Full Front, Track Pack, Full Body, Hood Only, Rocker Panels, Headlights, Door Cup Guards
- Each package: name, description, sale price, installer pay, material cost, hours

---

## 5-STAGE APPROVAL PROCESS

Each stage has mandatory sign-offs before the job can advance. This is the core workflow.

**Top bar always shows:** SALE ($), PROFIT ($), GPM (%), INSTALL PAY ($), HRS BUDGET

### Stage 1 — Sales Intake
- Sales rep reviews job, confirms scope & pricing
- Green button: "✓ Sign Off — Sales Intake"
- On sign off → move to Production stage, show success toast with next stage
- "Edit Order" button to reopen estimate

### Stage 2 — Production
- Print, laminate, cut all panels
- MATERIAL LOG (REQUIRED to advance):
  - Linear Feet Printed (required, must be > 0)
  - Material Width (default 54in)
  - Rolls/Sheets Used
  - Material Type/SKU (default "3M IJ180Cv3 Gloss Black")
  - Print Notes textarea
- "✓ Sign Off — Production" (disabled until linear feet entered)
- "↩ Send Back" button → returns to Sales with reason modal (7 preset reasons + free text)
- Send-backs logged with timestamp, reason, notes

### Stage 3 — Install (TWO PARTS)
**Part 1 — Pre-Install:**
- 4 checkboxes: vinyl condition, color match, dimensions, surface prep
- Must accept vinyl condition. If issue → send back to Production (but installer can continue wrapping the rest)
- After accepting → Start button begins install timer
- Timer: Start → Pause → Resume → Finish Wrap
- Timer auto-fills actual hours and date

**Part 2 — Post-Install:**
- 6 verification checkboxes: post-heated, edges sealed, no bubbles, seams aligned, vehicle cleaned, photos taken
- Installer name auto-filled
- Sign off sends to Prod Review

### Stage 4 — Production QC
- QC Pass / Reprint / Fix dropdown
- Final linear feet
- Reprint cost (if applicable)
- QC notes
- "↩ Send Back" option

### Stage 5 — Sales Close
- Final numbers review: sale price, reprint deductions, adjusted profit, adjusted GPM
- Manager notes
- "↩ Send Back" option
- "Mark Paid/Closed" button

### Close Job Modal
- Enter actuals: hours, installer pay, final sale price, material cost, design fees, prod bonus deduction
- Material usage: quoted vs actual sqft, linear ft printed
- Quoted vs Actual comparison table (8 metrics with variance)
- Records to installer profile for tracking

---

## COMMISSION ENGINE

Commission is paid on Gross Profit (GP), NOT sale price.
GP = Sale - COGS (material + installer pay + design + misc)

### Inbound (Company Leads)
- Base: 4.5% of GP
- +1% if Torq completed correctly → 5.5%
- +2% if job GPM above 73% → 7.5%
- Max inbound: 7.5%

### Outbound (Agent's Own Leads)
- Base: 7% of GP
- Same +1% Torq, +2% GPM>73% bonuses
- Max outbound: 10%

### Pre-Sold / Qualified Leads
- 5% of GP flat, no bonuses
- For leads handed to agent already pre-sold

### Monthly GP Tier System (total monthly GP across all jobs)
| Monthly GP | Inbound | Outbound |
|-----------|---------|----------|
| $0–50k | 7.5% | 10% |
| $50k–100k | 8% | 11% |
| $100k+ | 9% | 12% |

### Protection Rule
- If job GPM < 65%: Inbound → 4.5%, Outbound → 7%, NO bonuses
- Prevents underquoting

### Guaranteed Pay (WA State Compliance)
- 40 hours/week @ $20/hr = $800/week base
- Commission bonus = Commission Earned − Hourly Paid
- Employee still receives full commission, just structured legally

### Conversion Rate Tracking
- Track inbound commercial website lead conversion rate
- If below 20% → leads get reassigned to other agents
- Warning displayed to agent when below threshold

---

## SETTINGS / DEFAULTS PAGE

### Vehicle Pay Defaults
- 3×3 grid: Small Car → XL Van
- Each card: PAY ($) input, HRS input, calculated $/hr

### Trailer & Box Truck Defaults
- Default width, height, labor %

### PPF Package Defaults
- 8 packages with name, description, sale price, installer pay, material cost, hours

### Commission Settings
- PIN-locked (password protected)
- All tier rates editable
- Per-agent overrides
- Bonus toggle (enable/disable)

### What-If Profitability Calculator
- Enter hypothetical job → see full commission, bonus, net profit breakdown
- "Load Current Job" button
- Shows what everyone gets paid and what the shop keeps

### Shop Fixed Costs & Break-Even
- Line items: Rent, Utilities, Equipment, Insurance, Base Pay, Software, Marketing, Vehicle/Fuel, Other
- Calculates: monthly total, break-even revenue, break-even jobs/month

### Calculation Equations Reference
- All pricing, commission, production bonus, trailer/marine sqft formulas displayed
- Readable reference for staff

---

## DESIGN STUDIO

### Internal Design Management (/design)
- "New Design Project" button (can be standalone or linked to a job)
- Kanban board: Brief → In Progress → Proof Sent → Approved
- If created WITHOUT a linked job → auto-flag salesperson to review and send quote
- Fabric.js canvas for design work
- Media library with AI auto-tagging
- Per-design chat thread
- File upload and proofing

### Customer-Facing Design System (External)
- Customer pays $250 design deposit via Stripe
- Gets access to online design canvas (Fabric.js)
- Upload brand materials (logo, colors, guidelines)
- Claude Vision API analyzes uploads → returns style recommendations, complexity score
- Customer pre-designs their wrap
- AI provides real-time design feedback ("text too small for 50ft viewing distance", "color contrast issue")
- AI generates vehicle mockup using Replicate (flux-pro model)
- Low-quality preview shown free; full-resolution unlocked after deposit (like wrapmate.com)
- Shop team then redesigns professionally with 2 included revisions
- $99 priority revision add-on, $149 for 3rd revision add-on
- Industry-specific template marketplace (contractor templates, food truck templates, etc.)

---

## V.I.N.Y.L. AI SALES BROKER

### Autonomous Sales Conversations
- Handles real customer conversations via SMS (Twilio) and email
- Guides leads through: qualifying → quoting → deposit → conversion
- Responds within 10 seconds
- SMS under 300 characters when possible
- Claude API with full system prompt containing: brand voice, sales playbook, pricing rules, escalation boundaries, customer history, conversation history
- Returns structured JSON: message, reasoning, confidence, lead_stage update, vehicle_info, should_escalate

### Sales Playbook (stored in DB, editable in UI)
- Categories: Brand Voice, Greeting, Qualification, Pricing, Objection Handling, Upsell, Closing, Follow-up, FAQ, Policy, Competitor
- Each entry has trigger phrase and response guidance
- Editable in AI Command Center with drag-to-reorder priority

### Escalation Rules (configurable)
- Keyword triggers ("speak to someone", "manager", "real person")
- Dollar threshold (deals over $X need human approval)
- Sentiment detection (negative threshold)
- AI confidence below threshold
- Explicit customer request for human
- Notify via Slack/SMS/email

### Auto Follow-ups
- 24hr no response → auto follow-up
- 72hr → "still interested?" message
- 7 days → mark as lost

### AI Command Center UI
- Playbook tab: CRUD interface for all playbook entries, grouped by category
- Pricing tab: vehicle pricing rules, discount limits, rush multipliers
- Escalation tab: rule management
- Test tab: paste a customer message → see how V.I.N.Y.L. would respond (ChatGPT-style, NOT JSON dump)

---

## INBOX / COMMUNICATIONS (/inbox)

- Unified inbox: SMS, email, web chat all in one view
- Per-conversation thread view with message bubbles
- AI-enabled toggle per conversation (turn V.I.N.Y.L. on/off)
- "Take Over" button for human to jump in
- ai_reasoning shown collapsed under each AI message (staff only)
- Escalation queue tab (filtered view of escalated conversations)
- Real-time updates via Supabase realtime subscriptions

---

## TIMECLOCK

- Clock in / clock out for all employees
- Track hours per day/week
- WA state labor law compliance (40hr @ $20/hr guaranteed)
- PTO / sick leave accrual
- Installer time per job tracked separately (from install timer in Stage 3)
- Records under employee profile

---

## INSTALLER BIDDING SYSTEM

- When job reaches install stage → "Send to Installers" button
- Select multiple installers, set bid deadline, share job details
- Installer portal: see pending bids as cards (job name, vehicle, estimated hours, deadline)
- Accept (enter bid amount + available date) or Decline (with reason)
- Bid status badges on pipeline cards (e.g., "3 sent, 1 accepted")
- Accepted bids auto-populate installer on job
- Note: Kevin can both sell AND install. Cage can sell too. Dual-role support needed.

---

## CALENDAR (/calendar)

- Monthly grid (Sun-Sat)
- Jobs shown as colored pills by stage (sales=amber, production=blue, install=cyan, done=green)
- Installer filter dropdown
- Click day → side panel with that day's jobs
- Installer availability overlay (green=available, red=booked, gray=off)
- Pending bids section below calendar

---

## LEADERBOARDS (/leaderboard)

- Sales leaders, Install leaders, Referral leaders, GPM leaders
- Period filter (week/month/quarter) + division filter (wraps/decking/all)
- Animated bar charts + 🥇🥈🥉 medals
- Agent filter: see individual agent totals for any period

---

## TIMELINE (/timeline)

- Gantt-style view of active jobs
- Grouped by installer/agent/stage
- Filter: 2 weeks / 1 month / 3 months
- Click any bar → open sign-off modal

---

## ANALYTICS (/analytics)

- Revenue graph (period over period comparison)
- GPM trend line chart
- Jobs closed per period
- Commission payouts summary
- Material usage summary
- Top performers
- Conversion rate tracking (inbound commercial website leads)
- Period selector matching dashboard

---

## CONTACTS / CUSTOMERS (/contacts)

- Customer profiles with full job history
- Activity log for every interaction
- Customer intake portal (external link with $250 Stripe deposit)
- Prospecting center SEPARATE from main pipeline (for outside sales agents)

---

## PDF GENERATION

- Sales Order PDF (clean, readable — previous version was "jumbled")
- Installer Work Order PDF (shows pay breakdown, $/hr calculation so installer knows their rate)
- Customer Summary PDF
- Marine/Decking-specific PDF format
- All PDFs should be professional and easy to read

---

## REFERRAL SYSTEM

- Track referral source per job
- Credit referrer (installer, past customer, etc.) with configurable default reward amount
- Referral leaderboard
- Tiered rewards (TBD in settings)

---

## GAMIFICATION / XP

- XP triggers for completed actions
- Level-up modal
- Tied to leaderboard system

---

## VINYL INVENTORY (/inventory)

- Material tracking: rolls, linear feet, SKUs
- Quoted vs actual usage per job
- Smart quoting recommendations

---

## ROLE-BASED ACCESS

- Admin/Owner: sees everything, all nav items, all data
- Sales: sees own pipeline, own customers, own commission, own leaderboard position. Cannot see full shop financials.
- Production: sees production queue, material logs, print scheduling
- Installer: sees assigned jobs, bid opportunities, their own time tracking and pay
- Top of each role's screen shows ONLY income related to them

---

## INTEGRATIONS

- Twilio: SMS in/out for AI broker and inbox
- Stripe: $250 design deposits, payment collection
- Claude API (Anthropic SDK): V.I.N.Y.L. conversations, design analysis, mockup prompt generation
- Replicate: AI image generation for vehicle mockups (flux-pro model)
- QuickBooks: accounting sync
- Gusto: payroll
- Slack: escalation alerts, team notifications
- GoHighLevel: marketing automation
- Gmail: team email integration
- All integrations should gracefully handle missing API keys (show "not configured" instead of crashing)

---

## KNOWN BUGS (as of Feb 22, 2026)

1. AI Command Center test mode: "Failed to create conversation" — DB table or API route mismatch
2. V.I.N.Y.L. chat widget needs ChatGPT-style UI, currently plain text input with JSON error dump
3. Timeclock not functional
4. Design Studio: cannot create new design projects — DB table missing or columns wrong
5. New Estimate creation: redirects to list instead of opening blank form
6. Sales tab on job card: shows static calculator instead of line-item-based calculators
7. Calculator only appears for commercial wraps — needs to work for ALL product types
8. Various pages may error or show blank — need full audit
9. Supabase tables may not match what code expects — need migration audit
