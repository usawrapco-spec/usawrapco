# Design Intake Build Report

## Summary
Design intake concierge system with AI-powered chat agent + sales nav restructure.

## Created Files

### Pages
- `app/design-intake/[token]/page.tsx` - Public design intake form (8-screen guided flow)
- `app/design-intakes/page.tsx` - Admin view for submitted intakes

### API Routes
- `app/api/design-intake/generate/route.ts` - Generate intake link (auth required)
- `app/api/design-intake/save/route.ts` - Auto-save progress (public)
- `app/api/design-intake/chat/route.ts` - AI chat with Claude Sonnet (public)
- `app/api/design-intake/complete/route.ts` - Complete intake, create project/customer (public)

### Components
- `components/design-intake/DesignIntakeClient.tsx` - Main 8-screen intake form
- `components/design-intake/DesignIntakeLinkModal.tsx` - Modal for generating intake links
- `components/design-intake/DesignIntakesAdmin.tsx` - Admin table + detail drawer

### Database Migration
- `supabase/migrations/20260225_design_intake.sql` - design_intake_sessions table + projects.design_intake_token

## Modified Files
- `components/layout/TopNav.tsx` - Sales dropdown now has Actions section (onboarding link, design intake link, new estimate, new customer) + Navigate section with pipeline, design intakes, etc.
- `components/pipeline/UnifiedJobBoard.tsx` - Removed OnboardingLinkPanel
- `components/pipeline/PipelineBoard.tsx` - Removed OnboardingLinkPanel

## Design Intake Flow
1. Welcome screen (hero)
2. Contact info (name, business, email, phone)
3. Service selection (11 options, multi-select cards)
4. Vehicle details (conditional, only if vehicle services selected)
5. Brand info (logo, colors, industry, inspiration)
6. AI Chat concierge (Claude Sonnet, dynamic follow-up questions)
7. Style preference (6 visual style cards)
8. Completion (timeline, summary, next steps)

## Sales Dropdown Changes
- Added "Send Onboarding Link" action (opens modal)
- Added "Send Design Intake Link" action (opens modal)
- Added "New Estimate" action -> /estimates/new
- Added "New Customer" action -> /customers/new
- Added "Pipeline" nav link
- Added "Design Intakes" nav link
- Removed OnboardingLinkPanel from /pipeline page
