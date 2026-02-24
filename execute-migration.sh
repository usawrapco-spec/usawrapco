#!/bin/bash

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -E "SUPABASE_(URL|SERVICE_ROLE_KEY)" | xargs)
fi

# Read SQL file
SQL_CONTENT=$(cat sql/core_transaction_flow.sql)

echo "🚀 Executing SQL Migration via Supabase REST API..."
echo ""

# Check if we have credentials
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ No SUPABASE_SERVICE_ROLE_KEY found in .env.local"
    echo ""
    echo "📋 MANUAL STEPS REQUIRED:"
    echo ""
    echo "1. Go to: https://uqfqkvslxoucxmxxrobt.supabase.co/project/_/sql"
    echo "2. Click 'New Query'"
    echo "3. Copy the entire file: sql/core_transaction_flow.sql"
    echo "4. Paste into SQL Editor"
    echo "5. Click 'Run'"
    echo ""
    exit 1
fi

echo "✅ Found Supabase credentials"
echo "📡 Executing migration..."
echo ""

# Execute via REST API (postgres function)
curl -X POST \
  "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL_CONTENT" | jq -Rs .)}"

echo ""
echo "✅ Migration sent to Supabase"
