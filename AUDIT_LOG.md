# AUDIT LOG — USA WRAP CO Full System Debug

## Build Status
- `npm run build`: Compiles successfully (types ignored via `ignoreBuildErrors: true`)
- `npx tsc --noEmit`: ~189 TypeScript errors

## Error Categories

### 1. Type Definitions Missing Properties
- Estimate: missing `title`, `discount`, `tax_rate`, `customer_note`, `form_data`, `division`
- Invoice: missing `title`, `discount`, `tax_rate`, `sales_order_id`, `balance_due`
- SalesOrder: missing `title`, `discount`, `tax_rate`, `install_date`, `payment_terms`, `down_payment_pct`, `designer_id`
- DesignProject: missing `assigned_to`

### 2. Status Types Missing Values
- EstimateStatus: missing `rejected`
- InvoiceStatus: missing `draft`, `sent`
- SalesOrderStatus: missing `on_hold`, `void`

### 3. Supabase `.catch()` Pattern (Invalid in v2)
- app/api/ai/self-improve/route.ts (5 instances)
- app/api/deposit/checkout/route.ts (3 instances)
- app/api/email/send/route.ts (1 instance)
- app/settings/vehicles/page.tsx (1 instance)
- app/timeclock/page.tsx (2 instances)
- components/estimates/EstimateDetailClient.tsx (1 instance)
- components/leaderboard/Leaderboard.tsx (1 instance)
- components/timeline/Timeline.tsx (1 instance)
- lib/integrations/webhooks.ts (1 instance)
- lib/services/ai-pipeline.ts (1 instance)

### 4. Set Iteration (downlevelIteration)
- components/estimates/EstimateDetailClient.tsx
- components/genie/GenieInlineSuggestion.tsx
- components/integrations/IntegrationsClient.tsx
- components/projects/SalesTabBuilder.tsx

### 5. Missing Variables
- components/estimates/EstimateDetailClient.tsx: `router` not defined
- components/referral/ReferralsClient.tsx: `RATE` not defined

### 6. Component Props Mismatch
- app/invoices/[id]/page.tsx: `payments` prop not in InvoiceDetailClient Props
- components/projects/ProjectDetail.tsx: IntakeLinkGenerator props mismatch

### 7. PDF Route Errors
- Buffer type issues in all PDF routes
- ReactElement type mismatches in PDF routes

### 8. Other
- app/api/export/print-files: jsPDF setLineDash, function declaration in block
- app/api/reports: string not assignable to union type
- components/jobs/JobsClient.tsx: `title` in style object

## Fixes Applied
- [ ] Update type definitions
- [ ] Fix status type unions
- [ ] Fix .catch() → proper error handling
- [ ] Enable downlevelIteration in tsconfig
- [ ] Fix missing variables
- [ ] Fix component prop mismatches
- [ ] Fix job creation
- [ ] Fix design project creation
- [ ] Fix VIN lookup
- [ ] Fix line item rollup
- [ ] Fix broken buttons
- [ ] Fix file uploads
- [ ] Fix VINYL chat
- [ ] Fix invoice conversion
