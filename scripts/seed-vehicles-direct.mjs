#!/usr/bin/env node
/**
 * Directly seed vehicle_measurements via Supabase REST API.
 * Only sends fields that match existing DB columns.
 *
 * Usage: node scripts/seed-vehicles-direct.mjs
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';

config({ path: resolve('.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_KEY in .env.local');
  process.exit(1);
}

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal',
};

// DB columns from the original migration (known to exist)
const DB_COLUMNS = new Set([
  'year', 'year_start', 'year_end', 'make', 'model', 'trim', 'body_style',
  'full_wrap_sqft', 'partial_wrap_sqft', 'hood_sqft', 'roof_sqft',
  'trunk_sqft', 'doors_sqft', 'bumpers_sqft', 'mirrors_sqft',
  'pillars_sqft', 'rockers_sqft', 'side_width', 'side_height', 'side_sqft',
  'back_width', 'back_height', 'back_sqft', 'hood_width', 'hood_length',
  'roof_width', 'roof_length', 'total_sqft', 'linear_feet',
  'print_width_standard', 'notes', 'verified', 'source',
]);

// Columns that MAY exist (from migrations that may or may not have run)
const MAYBE_COLUMNS = [
  'year_range', 'driver_sqft', 'passenger_sqft',
  'three_quarter_wrap_sqft', 'half_wrap_sqft',
  'wrap_sqft', 'install_hours', 'install_pay', 'suggested_price', 'data_quality',
  'full_wrap_with_roof_sqft',
];

function stripToColumns(vehicle, columns) {
  const result = {};
  for (const key of Object.keys(vehicle)) {
    if (columns.has(key)) {
      result[key] = vehicle[key];
    }
  }
  return result;
}

async function main() {
  // 1. Check current count
  console.log('Checking current vehicle count...');
  const countRes = await fetch(`${SUPABASE_URL}/rest/v1/vehicle_measurements?select=id&limit=1`, {
    headers: { ...headers, 'Prefer': 'count=exact' },
  });
  const countHeader = countRes.headers.get('content-range');
  console.log('Content-Range:', countHeader);

  // 2. Detect which optional columns exist
  const activeColumns = new Set(DB_COLUMNS);

  for (const col of MAYBE_COLUMNS) {
    const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/vehicle_measurements?select=${col}&limit=1`, { headers });
    if (checkRes.ok) {
      activeColumns.add(col);
      console.log(`  Column ${col}: EXISTS`);
    } else {
      console.log(`  Column ${col}: missing (will skip)`);
    }
  }

  // 3. Load vehicle data
  const vehicles = JSON.parse(readFileSync(resolve('lib/data/vehicle-measurements.json'), 'utf-8'));
  console.log(`\nLoaded ${vehicles.length} vehicles from JSON`);
  console.log(`Sending ${activeColumns.size} columns per row`);

  // 4. Delete existing data
  console.log('\nDeleting existing data...');
  const delRes = await fetch(`${SUPABASE_URL}/rest/v1/vehicle_measurements?id=neq.00000000-0000-0000-0000-000000000000`, {
    method: 'DELETE',
    headers,
  });
  console.log('Delete status:', delRes.status);

  // 5. Insert in batches (strip to active columns only)
  const batchSize = 100;
  let inserted = 0;
  let errors = [];

  for (let i = 0; i < vehicles.length; i += batchSize) {
    const batch = vehicles.slice(i, i + batchSize).map(v => stripToColumns(v, activeColumns));
    const res = await fetch(`${SUPABASE_URL}/rest/v1/vehicle_measurements`, {
      method: 'POST',
      headers,
      body: JSON.stringify(batch),
    });

    if (res.ok) {
      inserted += batch.length;
      if ((i / batchSize) % 5 === 0) {
        process.stdout.write(`  Inserted ${inserted}/${vehicles.length}\r`);
      }
    } else {
      const errText = await res.text();
      errors.push(`Batch ${i}: ${errText}`);
      if (errors.length === 1) {
        console.error(`\nFirst error at batch ${i}:`, errText);
        console.error('Sample row:', JSON.stringify(batch[0]));
      }
      if (errors.length >= 3) {
        console.error('Too many errors, stopping.');
        break;
      }
    }
  }

  console.log(`\nDone! Inserted ${inserted}/${vehicles.length} vehicles`);
  if (errors.length > 0) {
    console.error(`${errors.length} batch errors total`);
  }

  // 6. Verify
  const verifyRes = await fetch(`${SUPABASE_URL}/rest/v1/vehicle_measurements?select=id&limit=1`, {
    headers: { ...headers, 'Prefer': 'count=exact' },
  });
  const verifyCount = verifyRes.headers.get('content-range');
  console.log(`Verify: ${verifyCount}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
