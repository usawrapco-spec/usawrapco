import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const filePath = path.resolve('C:/Users/wallc/Desktop/Make Model Year Side Width Side Hei.txt');
const raw = fs.readFileSync(filePath, 'utf-8');
const lines = raw.split(/\r?\n/);

function parseVal(token) {
  if (!token || token === '-') return null;
  const num = parseFloat(token);
  return isNaN(num) ? null : num;
}

function normalizeToThirteen(tokens) {
  const vals = tokens.map(t => (t === '-' ? null : parseFloat(t)));

  if (vals.length === 13) return vals;

  // Last value is always total_sqft
  const totalSqft = vals[vals.length - 1];
  const remaining = vals.slice(0, -1);

  const groups = [];
  let idx = 0;

  while (groups.length < 4 && idx < remaining.length) {
    if (remaining[idx] === null && idx + 1 < remaining.length && remaining[idx + 1] === null) {
      // Two+ consecutive nulls — missing section
      if (idx + 2 < remaining.length && remaining[idx + 2] === null) {
        // Three consecutive nulls
        groups.push([null, null, null]);
        idx += 3;
      } else {
        // Two nulls, sqft omitted
        groups.push([null, null, null]);
        idx += 2;
      }
    } else {
      const tokensAvail = remaining.length - idx;
      if (tokensAvail >= 3) {
        groups.push([remaining[idx], remaining[idx + 1], remaining[idx + 2]]);
        idx += 3;
      } else if (tokensAvail === 2) {
        groups.push([remaining[idx], remaining[idx + 1], null]);
        idx += 2;
      } else if (tokensAvail === 1) {
        // Single value — likely sqft only (e.g., commercial trucks)
        groups.push([null, null, remaining[idx]]);
        idx += 1;
      }
    }
  }

  // Pad any remaining groups
  while (groups.length < 4) {
    groups.push([null, null, null]);
  }

  return [...groups[0], ...groups[1], ...groups[2], ...groups[3], totalSqft];
}

const records = [];
const skipped = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();

  // Skip empty lines, headers, page markers, notes
  if (!line) continue;
  if (line.startsWith('Make') && line.includes('Side Width')) continue;
  if (/^Page\s+\d+/.test(line)) continue;
  if (line.startsWith('***')) continue;

  // Match: MakeModel YearStart-YearEnd NumericValues...
  // Also handle single year (e.g., "1993" with no range)
  let match = line.match(/^(.+?)\s+(\d{4})-(\d{4})\s+([\d.\s-]+)$/);
  let yearStart, yearEnd, makeModel, valuesStr;

  if (match) {
    makeModel = match[1].trim();
    yearStart = parseInt(match[2]);
    yearEnd = parseInt(match[3]);
    valuesStr = match[4].trim();
  } else {
    // Try single year
    match = line.match(/^(.+?)\s+(\d{4})\s+([\d.\s-]+)$/);
    if (!match) {
      skipped.push({ lineNum: i + 1, line: line.substring(0, 80) });
      continue;
    }
    makeModel = match[1].trim();
    yearStart = parseInt(match[2]);
    yearEnd = parseInt(match[2]); // same year for start and end
    valuesStr = match[3].trim();
  }

  // First word = make, rest = model
  const firstSpace = makeModel.indexOf(' ');
  const make = firstSpace > 0 ? makeModel.substring(0, firstSpace) : makeModel;
  const model = firstSpace > 0 ? makeModel.substring(firstSpace + 1).trim() : '';

  const tokens = valuesStr.split(/\s+/);
  const values = normalizeToThirteen(tokens);

  if (values.length !== 13) {
    skipped.push({ lineNum: i + 1, msg: `Got ${values.length} values`, line: line.substring(0, 80) });
    continue;
  }

  records.push({
    make,
    model,
    year_start: yearStart,
    year_end: yearEnd,
    side_width: values[0],
    side_height: values[1],
    side_sqft: values[2],
    back_width: values[3],
    back_height: values[4],
    back_sqft: values[5],
    hood_width: values[6],
    hood_length: values[7],
    hood_sqft: values[8],
    roof_width: values[9],
    roof_length: values[10],
    roof_sqft: values[11],
    total_sqft: values[12],
    full_wrap_sqft: values[12], // total is effectively full wrap
    source: 'vehicle-measurements-txt-import',
    verified: true,
  });
}

console.log(`Parsed ${records.length} vehicles, skipped ${skipped.length} lines`);
if (skipped.length > 0) {
  console.log('Skipped lines:');
  skipped.forEach(s => console.log(`  Line ${s.lineNum}: ${s.msg || ''} ${s.line}`));
}

// Insert in batches of 100
const BATCH_SIZE = 100;
let inserted = 0;
let errors = 0;

for (let i = 0; i < records.length; i += BATCH_SIZE) {
  const batch = records.slice(i, i + BATCH_SIZE);
  const { data, error } = await supabase
    .from('vehicle_measurements')
    .upsert(batch, { ignoreDuplicates: true });

  if (error) {
    console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error.message);
    errors++;
  } else {
    inserted += batch.length;
  }
}

console.log(`\nDone! Inserted ${inserted} records (${errors} batch errors)`);
