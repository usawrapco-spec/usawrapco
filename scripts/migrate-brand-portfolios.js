#!/usr/bin/env node
/**
 * Run this after adding SUPABASE_SERVICE_ROLE_KEY to .env.local
 * Usage: node scripts/migrate-brand-portfolios.js
 */
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('\n❌  Missing environment variables.')
  console.error('   Add SUPABASE_SERVICE_ROLE_KEY to .env.local first.')
  console.error('   Get it from: Supabase Dashboard → Settings → API → service_role key\n')
  process.exit(1)
}

const SQL_STATEMENTS = [
  {
    label: 'CREATE TABLE brand_portfolios',
    sql: `CREATE TABLE IF NOT EXISTS brand_portfolios (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id uuid,
      customer_id uuid,
      project_id uuid,
      company_name text,
      website_url text,
      logo_url text,
      logo_storage_path text,
      brand_colors jsonb DEFAULT '[]',
      typography jsonb DEFAULT '{}',
      tagline text,
      phone text,
      email text,
      address text,
      services text[],
      social_links jsonb DEFAULT '{}',
      about_text text,
      scraped_images jsonb DEFAULT '[]',
      ai_brand_analysis text,
      ai_recommendations text,
      logo_variations jsonb DEFAULT '[]',
      status text DEFAULT 'draft',
      customer_edits jsonb DEFAULT '{}',
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )`
  },
  {
    label: 'ENABLE ROW LEVEL SECURITY',
    sql: `ALTER TABLE brand_portfolios ENABLE ROW LEVEL SECURITY`
  },
  {
    label: 'CREATE POLICY org_access',
    sql: `DO $$ BEGIN
      DROP POLICY IF EXISTS "org_access" ON brand_portfolios;
      CREATE POLICY "org_access" ON brand_portfolios
        FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()))
        WITH CHECK (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
    EXCEPTION WHEN OTHERS THEN NULL; END $$`
  },
  {
    label: 'CREATE POLICY public_read',
    sql: `DO $$ BEGIN
      DROP POLICY IF EXISTS "public_read" ON brand_portfolios;
      CREATE POLICY "public_read" ON brand_portfolios
        FOR SELECT USING (status IN ('sent', 'viewed', 'approved'));
    EXCEPTION WHEN OTHERS THEN NULL; END $$`
  },
  {
    label: 'CREATE INDEXES',
    sql: `CREATE INDEX IF NOT EXISTS brand_portfolios_customer_idx ON brand_portfolios (customer_id);
CREATE INDEX IF NOT EXISTS brand_portfolios_project_idx ON brand_portfolios (project_id);
CREATE INDEX IF NOT EXISTS brand_portfolios_org_idx ON brand_portfolios (org_id)`
  }
]

async function runSQL(label, sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })
  const text = await res.text()
  const ok = res.ok || text.includes('already exists') || text === 'null' || text === '[]'
  return { ok, text }
}

async function verifyTable() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/brand_portfolios?limit=1`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    }
  })
  return res.ok
}

async function main() {
  console.log('\n🔄  Running brand_portfolios migration...\n')
  console.log(`   URL: ${SUPABASE_URL}`)
  console.log(`   Key: ${SERVICE_ROLE_KEY.slice(0, 15)}...\n`)

  // First try via exec_sql RPC if it exists
  for (const { label, sql } of SQL_STATEMENTS) {
    process.stdout.write(`   ${label}... `)
    const { ok, text } = await runSQL(label, sql)
    if (ok || text.includes('PGRST202')) {
      // exec_sql RPC doesn't exist — need to use pg endpoint
      if (text.includes('PGRST202')) {
        console.log('⚠️  exec_sql RPC not found — trying pg endpoint')
        break
      }
      console.log('✓')
    } else {
      console.log(`⚠️  ${text.slice(0, 100)}`)
    }
  }

  // Try pg endpoint (newer Supabase)
  const pgRes = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: SQL_STATEMENTS.map(s => s.sql).join(';\n') }),
  })

  if (pgRes.ok) {
    console.log('\n✅  Migration applied via pg endpoint\n')
  }

  // Verify
  const exists = await verifyTable()
  if (exists) {
    console.log('✅  brand_portfolios table is READY\n')
  } else {
    console.log('\n⚠️  Could not verify table via REST API.')
    console.log('   If exec_sql RPC is unavailable, paste sql/brand_portfolios.sql')
    console.log('   directly into: Supabase Dashboard → SQL Editor\n')
  }
}

main().catch(e => {
  console.error('\n❌ Error:', e.message)
  process.exit(1)
})
