import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { readdir, readFile } from 'fs/promises'
import path from 'path'

// ── PostgreSQL error codes that mean "already exists" ──────────────────────────
// These are safe to ignore for idempotent migrations
const IDEMPOTENT_CODES = new Set([
  '42P07', // duplicate_table          — CREATE TABLE (without IF NOT EXISTS)
  '42710', // duplicate_object         — CREATE INDEX, CREATE POLICY, CREATE TYPE, CREATE SEQUENCE
  '42701', // duplicate_column         — ALTER TABLE ADD COLUMN (without IF NOT EXISTS)
  '42P04', // duplicate_database
  '42P05', // duplicate_cursor
  '42723', // duplicate_function
  '23505', // unique_violation          — INSERT without ON CONFLICT (seed data re-run)
  '42P16', // invalid_table_definition  — sometimes fired on duplicate constraint names
  '2BP01', // dependent_objects_still_exist — DROP IF EXISTS on something with deps
  '42704', // undefined_object          — DROP ... IF EXISTS on non-existent object
  '42P01', // undefined_table           — DROP TABLE IF EXISTS on non-existent table
  '3F000', // invalid_schema_name       — schema already exists
  '42P06', // duplicate_schema
])

// ── Split a SQL file into individual executable statements ─────────────────────
// Handles: -- comments, /* block comments */, 'single-quoted strings', $$dollar-quoted$$
function splitStatements(sql: string): string[] {
  const statements: string[] = []
  let current = ''
  let i = 0
  const len = sql.length

  while (i < len) {
    // Single-line comment: -- skip to end of line
    if (sql[i] === '-' && sql[i + 1] === '-') {
      while (i < len && sql[i] !== '\n') i++
      current += '\n'
      continue
    }

    // Block comment: /* ... */
    if (sql[i] === '/' && sql[i + 1] === '*') {
      i += 2
      while (i < len - 1 && !(sql[i] === '*' && sql[i + 1] === '/')) i++
      i += 2
      continue
    }

    // Dollar-quoted string: $tag$...$tag$ (including plain $$...$$)
    if (sql[i] === '$') {
      const tagMatch = sql.slice(i).match(/^\$([A-Za-z_\d]*)\$/)
      if (tagMatch) {
        const tag = tagMatch[0]
        const closeIdx = sql.indexOf(tag, i + tag.length)
        if (closeIdx !== -1) {
          current += sql.slice(i, closeIdx + tag.length)
          i = closeIdx + tag.length
        } else {
          // No closing tag — append rest as-is
          current += sql.slice(i)
          i = len
        }
        continue
      }
    }

    // Single-quoted string literal: '...' (handles escaped '' inside)
    if (sql[i] === "'") {
      current += sql[i++]
      while (i < len) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          current += "''"
          i += 2
        } else if (sql[i] === "'") {
          current += sql[i++]
          break
        } else {
          current += sql[i++]
        }
      }
      continue
    }

    // Statement terminator
    if (sql[i] === ';') {
      const stmt = current.trim()
      if (stmt.length > 0) statements.push(stmt)
      current = ''
      i++
      continue
    }

    current += sql[i++]
  }

  // Final statement without trailing semicolon
  const last = current.trim()
  if (last.length > 0) statements.push(last)

  // Filter out statements that are blank or comment-only after stripping comments
  return statements.filter(s => {
    const stripped = s
      .replace(/--[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim()
    return stripped.length > 0
  })
}

// ── Run a single SQL statement in its own transaction ─────────────────────────
async function runStatement(
  client: import('pg').PoolClient,
  stmt: string,
): Promise<{ ok: boolean; skipped: boolean; error?: string }> {
  try {
    await client.query('BEGIN')
    await client.query(stmt)
    await client.query('COMMIT')
    return { ok: true, skipped: false }
  } catch (err: any) {
    await client.query('ROLLBACK').catch((error) => { console.error(error); })

    // Idempotent — already exists, safe to skip
    if (IDEMPOTENT_CODES.has(err.code)) {
      return { ok: true, skipped: true }
    }

    // "already exists" in message (fallback for codes not in our set)
    const msg: string = err.message || ''
    if (
      msg.includes('already exists') ||
      msg.includes('duplicate key') ||
      msg.includes('relation') && msg.includes('already exists')
    ) {
      return { ok: true, skipped: true }
    }

    return { ok: false, skipped: false, error: `[${err.code}] ${msg}` }
  }
}

// ── API handler ───────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // 1. Auth — only is_owner can run migrations
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = getSupabaseAdmin()
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'owner') {
    return NextResponse.json({ error: 'Owner access required' }, { status: 403 })
  }

  // 2. Check for DATABASE_URL
  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.DIRECT_URL

  if (!dbUrl) {
    const ref = (process.env.NEXT_PUBLIC_SUPABASE_URL || '')
      .replace('https://', '')
      .split('.')[0]

    return NextResponse.json({
      setup_required: true,
      message: 'DATABASE_URL is not configured.',
      instructions: [
        '1. Go to Supabase Dashboard → Project Settings → Database',
        '2. Under "Connection string" choose URI (use Session mode / port 5432, NOT Transaction mode)',
        `3. Copy: postgresql://postgres:[YOUR-DB-PASSWORD]@db.${ref}.supabase.co:5432/postgres`,
        '4. Add to .env.local:  DATABASE_URL=postgresql://postgres:....',
        '5. Also add to Vercel: Project Settings → Environment Variables',
        '6. Redeploy, then click Run Migrations',
      ],
    })
  }

  // 3. Read all .sql files from /sql, sorted alphabetically
  const sqlDir = path.join(process.cwd(), 'sql')
  let files: string[] = []
  try {
    const entries = await readdir(sqlDir)
    files = entries.filter(f => f.endsWith('.sql')).sort()
  } catch {
    return NextResponse.json({ error: 'Could not read /sql directory' }, { status: 500 })
  }

  if (files.length === 0) {
    return NextResponse.json({ results: [], message: 'No .sql files found in /sql' })
  }

  // 4. Connect to PostgreSQL
  let Pool: typeof import('pg').Pool
  try {
    const pg = await import('pg')
    Pool = pg.Pool
  } catch {
    return NextResponse.json({ error: 'pg package not available' }, { status: 500 })
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 15000,
  })

  const results: {
    file: string
    ok: boolean
    total: number
    executed: number
    skipped: number
    errors: string[]
  }[] = []

  // 5. Execute each file
  for (const file of files) {
    const filePath = path.join(sqlDir, file)
    let sql: string
    try {
      sql = await readFile(filePath, 'utf8')
    } catch {
      results.push({ file, ok: false, total: 0, executed: 0, skipped: 0, errors: [`Could not read file`] })
      continue
    }

    const statements = splitStatements(sql)
    let executed = 0
    let skipped = 0
    const errors: string[] = []

    for (const stmt of statements) {
      const client = await pool.connect().catch(e => {
        errors.push(`Connection failed: ${e.message}`)
        return null
      })
      if (!client) break

      try {
        const result = await runStatement(client, stmt)
        if (result.skipped) {
          skipped++
        } else if (result.ok) {
          executed++
        } else {
          errors.push(result.error || 'Unknown error')
        }
      } finally {
        client.release()
      }
    }

    results.push({
      file,
      ok: errors.length === 0,
      total: statements.length,
      executed,
      skipped,
      errors,
    })
  }

  await pool.end().catch((error) => { console.error(error); })

  const totalErrors = results.reduce((n, r) => n + r.errors.length, 0)
  return NextResponse.json({
    ok: totalErrors === 0,
    results,
    summary: {
      files: files.length,
      passed: results.filter(r => r.ok).length,
      failed: results.filter(r => !r.ok).length,
    },
  })
}
