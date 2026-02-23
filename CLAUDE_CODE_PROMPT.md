Read REQUIREMENTS.md in the project root. This is the permanent source of truth for the entire platform. Read it ONE SECTION AT A TIME using head/tail/grep — do NOT load the whole file at once.

YOUR MISSION: Audit everything, fix everything broken, then build what's missing. Work autonomously. Do not ask for permission. Commit after every 2-3 fixes with descriptive messages. Push after every 5 commits.

STEP 1 — AUDIT (do this FIRST before writing ANY code):
a) Run: find app/ components/ lib/ -name "*.tsx" -o -name "*.ts" | head -100
   Map every route and component that exists.
b) Run: npx supabase db dump --linked or check Supabase tables by querying information_schema.tables
   List every table that actually exists in the database.
c) Compare what exists vs what REQUIREMENTS.md Section 28 expects.
d) Check every page route — does it render without errors? Run: npm run build
e) List all missing tables, broken imports, undefined references.
f) Write findings to AUDIT_RESULTS.md in project root.
g) Commit: "audit: document current state of all routes, tables, and broken features"

STEP 2 — FIX KNOWN BUGS (Section 30 of REQUIREMENTS.md):
Fix in this order. After each fix, verify it works, then commit:
1. New Estimate creation — must open blank form, not redirect to list
2. Line-item calculators on estimate tab — each line item gets its own embedded calculator based on product type (Commercial, Marine, PPF, Box Truck, Trailer, Custom). NOT a separate static calculator page.
3. Design Studio — create missing DB tables if needed, fix component so "New Design Project" works
4. V.I.N.Y.L. chat — fix "Failed to create conversation" error. Create missing tables (conversations, messages, genie_conversations). Build ChatGPT-style UI with message bubbles, typing indicator, scrollable history.
5. Timeclock — must persist across refresh, store time blocks in DB, gate job completion
6. Team management — make functional (list employees, invite, change roles)
7. Analytics — wire up real data from projects table, show charts
8. Vinyl inventory — fix page, connect to material_inventory table
9. Tasks — pull from DB, show role-specific tasks
10. PDF exports — rebuild clean, readable, professional PDFs
11. Fix any other broken pages found in audit

STEP 3 — BUILD CORE MISSING FEATURES (Priority Order):
Only after ALL bugs are fixed. Reference REQUIREMENTS.md sections:
a) Shopvox-style top navigation bar (Section 3) — replace sidebar if it exists
b) Job Board kanban with drag-drop (Section 6)
c) 5-stage approval process with sign-offs (Section 7)
d) Commission engine with tier calc (Section 8)
e) Customer onboarding flow with Stripe deposit (Section 17)
f) Customer proofing portal with annotations (Section 17)
g) Unified inbox / communication hub (Section 16)
h) Contact management with GHL-style timeline (Section 15)
i) Calendar with installer availability (Section 25)
j) Installer bidding system (Section 6)
k) Settings pages matching Shopvox structure (Section 27)

STEP 4 — AI FEATURES:
a) V.I.N.Y.L. Genie bar at top of every page (Section 9)
b) AI Command Center with 15 config sections (Section 9)
c) AI Sales Broker routes and conversation handling (Section 9)
d) AI mockup generation with Replicate (Section 9)

RULES:
- Use Lucide React icons, NEVER emojis in code
- Dark theme colors from Section 1
- All navigation uses Next.js Link or router.push(). No window.open().
- Admin role bypasses ALL permission checks
- Mobile-first: everything must work on phones
- All integrations gracefully handle missing API keys
- Descriptive commit messages: "fix: estimate creation opens blank form" not "update"
- After every major feature: npm run build to verify zero errors
- If a Supabase table is missing, create the migration SQL AND run it
- Read REQUIREMENTS.md sections as needed with: grep -A 50 "SECTION X:" REQUIREMENTS.md

START NOW. Begin with Step 1 audit.
