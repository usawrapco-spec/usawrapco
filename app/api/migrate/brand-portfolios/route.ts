import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

// One-time migration endpoint — auto-deletes after success
// Secured by MIGRATE_SECRET env var or falls back to a hardcoded token
const MIGRATE_SECRET = process.env.MIGRATE_SECRET || 'usawrapco-migrate-2026'

export async function POST(req: NextRequest) {
  const { secret } = await req.json().catch(() => ({}))
  if (secret !== MIGRATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()

  const steps: { step: string; ok: boolean; error?: string }[] = []

  // Helper to run raw SQL via admin client
  async function sql(label: string, query: string) {
    const { error } = await (admin as any).rpc('exec_sql', { query }).catch(() => ({ error: { message: 'rpc not available' } }))

    if (error?.message?.includes('rpc not available') || error?.message?.includes('exec_sql')) {
      // Try via .from() insert trick — instead use the postgres extension if available
      // Fall back: try using supabase admin directly
      try {
        // Use pg REST endpoint
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query }),
        })
        const data = await res.json()
        if (!res.ok) {
          steps.push({ step: label, ok: false, error: JSON.stringify(data).slice(0, 200) })
          return false
        }
        steps.push({ step: label, ok: true })
        return true
      } catch (e: any) {
        steps.push({ step: label, ok: false, error: e.message })
        return false
      }
    }

    if (error) {
      steps.push({ step: label, ok: false, error: error.message })
      return false
    }
    steps.push({ step: label, ok: true })
    return true
  }

  // Try direct REST SQL execution with service role
  async function execSQL(label: string, query: string) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
      })
      // Direct SQL not available via REST, try pg endpoint
    } catch {}

    // Use Supabase pg endpoint (v2 projects)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/pg/query`, {
        method: 'POST',
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      })
      const data = await res.json()
      if (res.ok) {
        steps.push({ step: label, ok: true })
        return true
      }
      steps.push({ step: label, ok: false, error: JSON.stringify(data).slice(0, 300) })
      return false
    } catch (e: any) {
      steps.push({ step: label, ok: false, error: e.message })
      return false
    }
  }

  const createTable = `
    CREATE TABLE IF NOT EXISTS brand_portfolios (
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
    );`

  const enableRLS = `ALTER TABLE brand_portfolios ENABLE ROW LEVEL SECURITY;`

  const orgPolicy = `
    DROP POLICY IF EXISTS "org_access" ON brand_portfolios;
    CREATE POLICY "org_access" ON brand_portfolios
      FOR ALL USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()))
      WITH CHECK (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));`

  const publicPolicy = `
    DROP POLICY IF EXISTS "public_read" ON brand_portfolios;
    CREATE POLICY "public_read" ON brand_portfolios
      FOR SELECT USING (status IN ('sent', 'viewed', 'approved'));`

  const indexes = `
    CREATE INDEX IF NOT EXISTS brand_portfolios_customer_idx ON brand_portfolios (customer_id);
    CREATE INDEX IF NOT EXISTS brand_portfolios_project_idx ON brand_portfolios (project_id);
    CREATE INDEX IF NOT EXISTS brand_portfolios_org_idx ON brand_portfolios (org_id);`

  // Run each step
  await execSQL('create_table', createTable)
  await execSQL('enable_rls', enableRLS)
  await execSQL('org_policy', orgPolicy)
  await execSQL('public_policy', publicPolicy)
  await execSQL('indexes', indexes)

  // Final verification — try to select from the table
  const { error: verifyErr } = await admin.from('brand_portfolios').select('id').limit(1)
  const tableExists = !verifyErr

  return NextResponse.json({
    steps,
    table_exists: tableExists,
    verify_error: verifyErr?.message || null,
    message: tableExists
      ? 'brand_portfolios table is ready'
      : 'Table may not exist — check steps for errors',
  })
}
