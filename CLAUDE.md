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

## Database Tables
profiles, projects, project_members, job_comments, job_images,
stage_approvals, send_backs, install_sessions, material_tracking,
customer_intake_tokens, proofing_tokens, designer_bids,
installer_bids, referrals, stage_checklist

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

## Pages (v4.0)
/dashboard, /pipeline, /tasks, /calendar, /inventory, /design,
/employees, /analytics, /settings, /production, /leaderboard,
/timeline, /overhead, /projects/[id], /intake/[token], /proof/[token]

## Rules
1. ALWAYS run npm run build before committing
2. Never break existing functionality
3. All tables need RLS policies
4. Version is v4.0 - bump on major changes
5. Reference HTML prototype (index.html) for feature specs
