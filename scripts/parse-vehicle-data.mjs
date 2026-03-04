#!/usr/bin/env node
/**
 * Parse vehicle measurements from tab-separated text file
 * and output JSON matching the DB schema exactly.
 *
 * Usage: node scripts/parse-vehicle-data.mjs scripts/vehicle-data-raw.txt > lib/data/vehicle-measurements.json
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const inputPath = process.argv[2] || resolve('scripts/vehicle-data-raw.txt');
const raw = readFileSync(inputPath, 'utf-8');

const lines = raw.split('\n');
const vehicles = [];
const seen = new Set();

for (const rawLine of lines) {
  const line = rawLine.trim();

  // Skip empty, header, page markers, bleed notes
  if (!line) continue;
  if (line.startsWith('Make\t') || line.startsWith('Make ')) continue;
  if (/^Page\s+\d+/i.test(line)) continue;
  if (line.includes('Measurements include')) continue;
  if (line.startsWith('***')) continue;

  // Split by tab
  const parts = line.split('\t');
  if (parts.length < 4) continue;

  // Extract fields - the format is:
  // Make | Model | Year | Side Width | Side Height | Side Sq Ft | Back Width | Back Height | Back Sq Ft | Hood Width | Hood Length | Hood Sq Ft | Roof Width | Roof Length | Roof Sq Ft | Total Sq Foot
  const make = (parts[0] || '').trim();
  const model = (parts[1] || '').trim();
  const yearStr = (parts[2] || '').trim();

  if (!make || !model || !yearStr) continue;

  // Parse numeric value, return null for missing/dash
  function num(val) {
    if (!val) return null;
    const s = val.trim();
    if (s === '-' || s === '' || s === '0.0' && false) return null;
    if (s === '-') return null;
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  }

  const side_width = num(parts[3]);
  const side_height = num(parts[4]);
  const side_sqft = num(parts[5]);
  const back_width = num(parts[6]);
  const back_height = num(parts[7]);
  const back_sqft = num(parts[8]);
  const hood_width = num(parts[9]);
  const hood_length = num(parts[10]);
  const hood_sqft = num(parts[11]);
  const roof_width = num(parts[12]);
  const roof_length = num(parts[13]);
  const roof_sqft = num(parts[14]);
  const total_sqft = num(parts[15]);

  // Parse year range
  let year_start = null;
  let year_end = null;
  const yearMatch = yearStr.match(/(\d{4})\s*[-–]\s*(\d{4})/);
  if (yearMatch) {
    year_start = parseInt(yearMatch[1]);
    year_end = parseInt(yearMatch[2]);
  } else {
    const singleYear = yearStr.match(/(\d{4})/);
    if (singleYear) {
      year_start = parseInt(singleYear[1]);
      year_end = year_start;
    }
  }

  if (!year_start) continue;

  const year_range = year_start === year_end ? `${year_start}` : `${year_start}-${year_end}`;

  // Compute derived fields
  const driver_sqft = side_sqft != null ? Math.round((side_sqft / 2) * 10) / 10 : null;
  const passenger_sqft = side_sqft != null ? Math.round((side_sqft / 2) * 10) / 10 : null;

  // full_wrap_sqft = side_sqft + back_sqft + hood_sqft + roof_sqft (or total_sqft if available)
  let full_wrap_sqft = total_sqft;
  if (full_wrap_sqft == null && side_sqft != null) {
    full_wrap_sqft = (side_sqft || 0) + (back_sqft || 0) + (hood_sqft || 0) + (roof_sqft || 0);
    full_wrap_sqft = Math.round(full_wrap_sqft * 10) / 10;
  }

  const three_quarter_wrap_sqft = full_wrap_sqft != null ? Math.round(full_wrap_sqft * 0.75 * 10) / 10 : null;
  const half_wrap_sqft = full_wrap_sqft != null ? Math.round(full_wrap_sqft * 0.5 * 10) / 10 : null;
  const linear_feet = full_wrap_sqft != null ? Math.ceil(full_wrap_sqft / 4.5) : null;

  // Deduplicate by make+model+year_range
  const key = `${make}|${model}|${year_range}`;
  if (seen.has(key)) continue;
  seen.add(key);

  vehicles.push({
    make,
    model,
    year_range,
    year_start,
    year_end,
    side_width,
    side_height,
    side_sqft,
    driver_sqft,
    passenger_sqft,
    back_width,
    back_height,
    back_sqft,
    hood_width,
    hood_length,
    hood_sqft,
    roof_width,
    roof_length,
    roof_sqft,
    total_sqft,
    full_wrap_sqft,
    three_quarter_wrap_sqft,
    half_wrap_sqft,
    linear_feet,
    source: 'vehicle-measurements-2026',
    verified: true,
  });
}

// Sort by make, model, year_start
vehicles.sort((a, b) => {
  if (a.make !== b.make) return a.make.localeCompare(b.make);
  if (a.model !== b.model) return a.model.localeCompare(b.model);
  return (a.year_start || 0) - (b.year_start || 0);
});

console.error(`Parsed ${vehicles.length} unique vehicles`);

// Write output
const outputPath = process.argv[3] || resolve('lib/data/vehicle-measurements.json');
writeFileSync(outputPath, JSON.stringify(vehicles));
console.error(`Written to ${outputPath}`);
