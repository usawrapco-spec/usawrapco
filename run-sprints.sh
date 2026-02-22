#!/bin/bash
cd /c/Users/wallc/Desktop/usawrapco

# SPRINT 1: Audit + DB migration file + Bugs 1-5
echo "=== SPRINT 1: Audit + Bugs 1-5 ===" 
echo 'You have REQUIREMENTS.md (1007 lines). NEVER ask questions or give options. Decide yourself. For database: write ALL migration SQL to supabase/migrations/001_all_tables.sql — do NOT connect to Supabase. Read only the sections you need with grep.

1. git log --oneline -20
2. find app/ -name "page.tsx" | sort
3. find components/ -name "*.tsx" | sort
4. npm run build 2>&1 | tail -50
5. grep -A 80 "SECTION 28" REQUIREMENTS.md for expected tables
6. grep -A 30 "SECTION 30" REQUIREMENTS.md for known bugs
7. Write audit to AUDIT_RESULTS.md, commit
8. Write ALL missing table SQL to supabase/migrations/001_all_tables.sql, commit
9. Fix bug 1: estimate creation must open blank form not redirect
10. Fix bug 2: line-item calculators embedded per product type (grep -A 80 "SECTION 5" REQUIREMENTS.md)
11. Fix bug 3: design studio — fix New Design Project, Fabric.js canvas, upload, proofing (grep -A 50 "DESIGN STUDIO" REQUIREMENTS.md)
12. Fix bug 4: V.I.N.Y.L. chat — ChatGPT-style UI, fix Failed to create conversation
13. Fix bug 5: timeclock — persist, time_entries table, gate job completion
14. npm run build — zero errors
15. git add -A && git commit -m "sprint1: audit + bugs 1-5" && git push
DO NOT rewrite existing code. Read files first, fix only whats broken. Commit every 2-3 fixes.' | claude --dangerously-skip-permissions -p

# SPRINT 2: Bugs 6-11 + Navigation
echo "=== SPRINT 2: Bugs 6-11 + Nav ===" 
echo 'Continue from where Sprint 1 left off. Read AUDIT_RESULTS.md. NEVER ask questions. NEVER give options. Keep going.

1. git pull
2. Fix bug 6: team management — list/invite/roles
3. Fix bug 7: analytics — real data from projects table, charts, period selector
4. Fix bug 8: vinyl inventory — material_inventory table, roll tracking
5. Fix bug 9: tasks — DB-connected, role-specific
6. Fix bug 10: PDF exports — clean multi-page (Sales Order, Production Brief, Install WO, Customer Summary)
7. Fix bug 11: any other broken pages
8. Convert sidebar to Shopvox-style top nav bar (grep -A 30 "SECTION 3" REQUIREMENTS.md)
9. npm run build — zero errors
10. git add -A && git commit -m "sprint2: bugs 6-11 + top nav" && git push
DO NOT rewrite existing code. Fix and expand only.' | claude --dangerously-skip-permissions -p

# SPRINT 3: Core features
echo "=== SPRINT 3: Core Features ==="
echo 'Continue building. Read REQUIREMENTS.md sections as needed with grep. NEVER ask questions.

1. git pull
2. Job Board kanban with drag-drop (grep -A 40 "SECTION 6" REQUIREMENTS.md)
3. 5-stage approval with sign-offs (grep -A 40 "SECTION 7" REQUIREMENTS.md)
4. Commission engine GP-based tiers (grep -A 40 "SECTION 8" REQUIREMENTS.md)
5. Customer onboarding /onboard/[token] with Stripe (grep -A 40 "Customer Onboarding" REQUIREMENTS.md)
6. Customer portal /portal (grep -A 30 "Customer Portal" REQUIREMENTS.md)
7. Unified inbox GHL-style (grep -A 20 "SECTION 16" REQUIREMENTS.md)
8. Contact management with timeline (grep -A 20 "SECTION 15" REQUIREMENTS.md)
9. npm run build — zero errors
10. git add -A && git commit -m "sprint3: core features" && git push
Expand existing code. Do not rewrite.' | claude --dangerously-skip-permissions -p

# SPRINT 4: AI + Revenue Engine
echo "=== SPRINT 4: AI + Revenue ==="
echo 'Continue building. NEVER ask questions.

1. git pull  
2. V.I.N.Y.L. Genie bar on every page (grep -A 60 "SECTION 9" REQUIREMENTS.md)
3. AI Command Center 15 sections
4. Calendar with installer availability (grep -A 15 "SECTION 25" REQUIREMENTS.md)
5. Installer bidding system
6. Settings pages Shopvox-style (grep -A 40 "SECTION 27" REQUIREMENTS.md)
7. Network map d3.js (grep -A 15 "SECTION 18" REQUIREMENTS.md)
8. Referral system (grep -A 15 "SECTION 19" REQUIREMENTS.md)
9. npm run build — zero errors
10. git add -A && git commit -m "sprint4: ai + features" && git push' | claude --dangerously-skip-permissions -p

echo "=== ALL SPRINTS COMPLETE ==="
