# USA WRAP CO — CRM Ops Platform

## Overview
Vehicle wrap shop CRM. Next.js 14, TypeScript, Tailwind CSS, Supabase, Vercel.

## Key IDs
- Org: d34a6c47-1ac0-4008-87d2-0f7741eebc4f
- Supabase: https://uqfqkvslxoucxmxxrobt.supabase.co
- Storage bucket: job-images

## Commands
- `npm run dev` — local dev server
- `npm run build` — ALWAYS run before committing
- `git add . && git commit -m "msg" && git push` — deploys to Vercel automatically

## Tech Stack
- Next.js 14 App Router, TypeScript, Tailwind CSS
- Supabase (Postgres + Auth + Storage + RLS)
- Inline styles using CSS variables (dark theme)
- Barlow Condensed for headers, JetBrains Mono for numbers

## CSS Variables
--bg: #0d0f14, --surface: #13151c, --surface2: #1a1d27
--accent: #4f7fff, --green: #22c07a, --red: #f25a5a
--cyan: #22d3ee, --amber: #f59e0b, --purple: #8b5cf6
--text1: #e8eaed, --text2: #9299b5, --text3: #5a6080

## Pipeline Stages
sales_in -> production -> install -> prod_review -> sales_close -> done

## Architecture
- ProjectDetail.tsx = main job view (pipeline-as-tabs with sign-off gates)
- Tabs: Chat | Sales | Design | Production | Install | QC | Close
- Each tab has required fields that must be filled before advancing
- Send-back system returns jobs to previous stage with reason

## Component Patterns
- Use inline styles with CSS variables
- Supabase client: import { createClient } from '@/lib/supabase/client'
- Types: import type { Profile, Project } from '@/types'
- All components are client components ('use client')

## Pages (v6.1)
/dashboard, /pipeline, /inbox, /jobs, /tasks, /calendar, /inventory, /design,
/mockup, /media, /timeline, /production, /production/print-schedule,
/production/printers, /inventory/remnants, /catalog, /customers,
/customers/[id], /contacts, /contacts/[id], /prospects, /network,
/bids, /analytics, /reports, /payroll, /leaderboard, /employees,
/settings, /overhead, /1099,
/estimates, /estimates/[id], /sales-orders, /sales-orders/[id],
/invoices, /invoices/[id], /projects/[id], /projects/[id]/edit,
/intake/[token], /proof/[token], /signoff/[token], /track/[token],
/onboard/[token], /portal, /portal/demo, /installer-portal,
/estimate/view/[token], /invoice/view/[token], /ref/[code], /demo, /login

## Core Workflow
Estimate → Sales Order → Job (Pipeline) → Invoice → Payment

## Database Tables (v6.1)
profiles, projects, project_members, job_comments, job_images,
stage_approvals, send_backs, install_sessions, material_tracking,
customer_intake_tokens, proofing_tokens, designer_bids,
installer_bids, referrals, design_projects, design_project_comments,
design_project_files, shop_settings, custom_vehicles, custom_line_items,
vinyl_inventory, vinyl_usage, app_state, customers, design_proofs,
designer_specialties, orgs, proof_settings, tasks, visibility_settings,
estimates, sales_orders, invoices, line_items, customer_connections,
onboarding_tokens, communication_log, files, annotations, feedback,
approvals, installer_groups, installer_group_members,
installer_bid_recipients, installer_bid_responses, sales_referrals,
job_expenses, card_templates, notifications, activity_log,
integrations, payments, time_blocks, team_invites,
customer_communications, contracts, signed_documents,
referral_codes, referral_tracking, payroll_periods, payroll_entries,
wrap_knowledge_base, tutorial_progress, onboarding_sessions,
prospects, estimate_templates, estimate_options, job_history

## Commission Structure
- Inbound: 4.5% GP (+1% Torq bonus, +2% if GPM >73%) = max 7.5%
- Outbound: 7% GP (+1% Torq, +2% GPM bonus) = max 10%
- Pre-Sold: 5% flat, no bonuses
- Cross-department referral: 2.5%
- WA State Payroll: Total Pay = Base Hourly + MAX(0, Commission - Base Hourly)

## Rules
1. ALWAYS run npm run build before committing
2. Never break existing functionality
3. All tables need RLS policies
4. Version is v6.1
5. Admin role sees ALL sidebar nav items (bypasses canAccess checks)
6. All navigation uses Next.js Link or router.push(). No window.open(), no target="_blank"
7. Use Lucide React icons only, zero emojis in code
8. .env.local must be in .gitignore. Never commit secrets.
9. Mobile-first: bottom nav on mobile, collapsible sidebar on desktop
10. Integrations without API keys show "Not connected" — never crash
