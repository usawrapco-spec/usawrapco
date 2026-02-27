// One-off script: parse vehicle measurements txt → Supabase vehicle_measurements
// Run from project root: node scripts/import-vehicles.js

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uqfqkvslxoucxmxxrobt.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY env var is required. Run: SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/import-vehicles.js');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

function parseNum(val) {
  if (val === undefined || val === null || val === '-' || val.trim() === '') return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function parseYear(yearStr) {
  const m = yearStr.match(/^(\d{4})(?:-(\d{4}))?$/);
  if (!m) return { year_start: null, year_end: null };
  return {
    year_start: parseInt(m[1]),
    year_end: m[2] ? parseInt(m[2]) : parseInt(m[1])
  };
}

function parseLine(line) {
  const raw = line.trim();
  if (!raw) return null;

  const tokens = raw.split(/\s+/);
  if (tokens.length < 5) return null;

  const make = tokens[0];

  // Find the year token: matches YYYY-YYYY or YYYY, and the next token is numeric or '-'
  let yearIdx = -1;
  for (let i = 1; i < tokens.length; i++) {
    if (/^\d{4}(-\d{4})?$/.test(tokens[i])) {
      const next = tokens[i + 1];
      if (next && (/^\d/.test(next) || next === '-')) {
        yearIdx = i;
        break;
      }
    }
  }
  if (yearIdx === -1) return null;

  const model = tokens.slice(1, yearIdx).join(' ');
  if (!model) return null;

  const { year_start, year_end } = parseYear(tokens[yearIdx]);

  // All tokens after year
  const dataTokens = tokens.slice(yearIdx + 1);
  if (dataTokens.length === 0) return null;

  // Last token = total_sqft, remaining = 12 measurement slots in order
  const total_sqft = parseNum(dataTokens[dataTokens.length - 1]);
  const meas = dataTokens.slice(0, -1); // up to 12 values

  // File column order:
  // 0:side_width 1:side_height 2:side_sqft
  // 3:back_width 4:back_height 5:back_sqft
  // 6:hood_width 7:hood_length 8:hood_sqft
  // 9:roof_width 10:roof_length 11:roof_sqft
  const get = (i) => parseNum(meas[i]);

  return {
    make,
    model,
    year_start,
    year_end,
    side_width:  get(0),
    side_height: get(1),
    side_sqft:   get(2),
    back_width:  get(3),
    back_height: get(4),
    back_sqft:   get(5),
    hood_width:  get(6),
    hood_length: get(7),
    hood_sqft:   get(8),
    roof_width:  get(9),
    roof_length: get(10),
    roof_sqft:   get(11),
    total_sqft,
    source: 'import_txt',
    verified: false,
  };
}

async function main() {
  const filePath = path.join(__dirname, '..', 'Make Model Year Side Width Side Hei.txt');
  console.log('Reading:', filePath);

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/).filter(l => l.trim());

  // Skip header row
  const dataLines = lines.slice(1);
  console.log(`Total data lines: ${dataLines.length}`);

  const records = [];
  const skipped = [];

  for (const line of dataLines) {
    const rec = parseLine(line);
    if (rec) {
      records.push(rec);
    } else {
      skipped.push(line.substring(0, 100));
    }
  }

  console.log(`Parsed: ${records.length} records`);
  if (skipped.length > 0) {
    console.log(`Skipped ${skipped.length} lines:`);
    skipped.forEach(l => console.log('  SKIP:', l));
  }

  // Table was already TRUNCATEd via SQL before running this script.
  console.log('\nStarting inserts (table already truncated via SQL)...');

  // Insert in batches of 100
  const BATCH_SIZE = 100;
  let inserted = 0;
  let batchErrors = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('vehicle_measurements')
      .upsert(batch, { ignoreDuplicates: true });

    if (error) {
      console.error(`\nBatch ${Math.floor(i / BATCH_SIZE) + 1} error: ${error.message}`);
      batchErrors++;
    } else {
      inserted += batch.length;
      process.stdout.write(`\rInserted: ${inserted}/${records.length}  `);
    }
  }

  console.log(`\n\nDone!`);
  console.log(`  Records inserted: ${inserted}`);
  console.log(`  Batch errors:     ${batchErrors}`);
  console.log(`  Lines skipped:    ${skipped.length}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
