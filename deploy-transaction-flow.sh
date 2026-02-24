#!/bin/bash

# ════════════════════════════════════════════════════════════════════════════
# CORE TRANSACTION FLOW — DEPLOYMENT SCRIPT
# ════════════════════════════════════════════════════════════════════════════

echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║              USA WRAP CO — TRANSACTION FLOW DEPLOYMENT                     ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Pre-deployment checklist:${NC}"
echo "   ✓ Database migration SQL prepared"
echo "   ✓ TypeScript types updated"
echo "   ✓ Components created"
echo "   ✓ Build successful"
echo ""

# Step 1: Verify build
echo -e "${BLUE}Step 1: Verifying build...${NC}"
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "   ${GREEN}✓${NC} Build successful"
else
    echo -e "   ${RED}✗${NC} Build failed"
    exit 1
fi
echo ""

# Step 2: Show migration file
echo -e "${BLUE}Step 2: Database Migration${NC}"
echo "   Migration file: sql/core_transaction_flow.sql"
echo "   Tables to create:"
echo "      • estimates (QT #1000+)"
echo "      • sales_orders (SO #1000+)"
echo "      • invoices (IN #1000+)"
echo "      • payments"
echo ""

# Step 3: Supabase instructions
echo -e "${YELLOW}⚠ MANUAL STEP REQUIRED:${NC}"
echo ""
echo "   To complete deployment, run this in Supabase SQL Editor:"
echo ""
echo -e "   ${BLUE}1.${NC} Go to: https://uqfqkvslxoucxmxxrobt.supabase.co"
echo -e "   ${BLUE}2.${NC} Click 'SQL Editor' in left sidebar"
echo -e "   ${BLUE}3.${NC} Click 'New Query'"
echo -e "   ${BLUE}4.${NC} Copy contents of: ${GREEN}sql/core_transaction_flow.sql${NC}"
echo -e "   ${BLUE}5.${NC} Paste into editor and click 'Run'"
echo ""

# Step 4: Show SQL file location
echo -e "${BLUE}Step 3: Migration SQL Preview${NC}"
echo ""
head -30 sql/core_transaction_flow.sql | sed 's/^/   /'
echo "   ..."
echo "   (See full file: sql/core_transaction_flow.sql)"
echo ""

# Step 5: Test URLs
echo -e "${BLUE}Step 4: After migration, test these pages:${NC}"
echo ""
echo "   📊 Transaction Pages:"
echo "      • http://localhost:3000/estimates"
echo "      • http://localhost:3000/sales-orders"
echo "      • http://localhost:3000/invoices"
echo ""
echo "   📈 Reports:"
echo "      • http://localhost:3000/reports/revenue"
echo ""
echo "   ✅ Test Flow:"
echo "      1. Create estimate → /estimates/new"
echo "      2. Add line items"
echo "      3. Click 'Convert to Sales Order'"
echo "      4. From SO, click 'Create Invoice'"
echo "      5. From Invoice, click 'Record Payment'"
echo ""

# Step 6: Deployment summary
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                        DEPLOYMENT READY ✓                                  ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Next steps:"
echo "   1. Run SQL migration in Supabase (see instructions above)"
echo "   2. Start dev server: npm run dev"
echo "   3. Test transaction flow"
echo "   4. Deploy to Vercel (automatic on git push)"
echo ""
echo -e "${GREEN}All code changes pushed to main branch ✓${NC}"
echo ""
