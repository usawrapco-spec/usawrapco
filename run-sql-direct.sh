#!/bin/bash

# Extract credentials from .env.local
export $(cat .env.local | grep -E "SUPABASE" | xargs)

# Construct database URL
# Supabase connection string format:
# postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

echo "🔧 Attempting direct database connection..."
echo ""

# Extract project ref from URL
PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed 's/https:\/\///' | sed 's/.supabase.co//')

# Need the database password (different from service role key)
echo "⚠️  I need your Supabase database password to connect directly."
echo ""
echo "To get it:"
echo "1. Go to: https://supabase.com/dashboard/project/_/settings/database"
echo "2. Look for 'Database Password' or 'Connection String'"
echo "3. Copy the password"
echo ""
echo "Or just paste the SQL manually (easier!):"
echo "   https://uqfqkvslxoucxmxxrobt.supabase.co/project/_/sql"
echo ""

# Check if psql is installed
if command -v psql &> /dev/null; then
    echo "✅ psql is installed"
    echo ""
    echo "If you provide the database password, I can run:"
    echo "   psql 'postgresql://postgres:[PASSWORD]@db.${PROJECT_REF}.supabase.co:5432/postgres' -f sql/core_transaction_flow.sql"
else
    echo "❌ psql is not installed"
    echo ""
    echo "Please paste the SQL manually in Supabase SQL Editor."
fi
