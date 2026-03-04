#!/usr/bin/env node
/**
 * Fix vehicles with shifted column data and fill in driver/passenger sqft.
 *
 * Problem: ~271 vehicles have null side_sqft. Of those, 194 have total_sqft
 * but hood+roof > total, indicating columns were shifted during original import.
 *
 * For these shifted vehicles:
 * - What's in "total_sqft" is actually side_sqft (both sides)
 * - What's in "hood_sqft" is actually hood_width
 * - What's in "roof_sqft" is actually hood_length or roof_width
 * - etc.
 *
 * Strategy: detect shifted rows and attempt correction, then recompute all derived fields.
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const inputPath = resolve('lib/data/vehicle-measurements.json');
const data = JSON.parse(readFileSync(inputPath, 'utf-8'));

let fixed = 0;
let unfixable = 0;
let alreadyGood = 0;

for (const v of data) {
  // Already has driver_sqft — skip
  if (v.driver_sqft !== null && v.driver_sqft !== undefined) {
    alreadyGood++;
    continue;
  }

  // Detect shifted columns: hood_sqft > 40 is unreasonable (real hoods are 10-30 sqft)
  // If hood_sqft looks like a width measurement (40-120 range), columns are shifted
  const hoodLooksLikeWidth = v.hood_sqft !== null && v.hood_sqft > 35;
  const totalLooksLikeSide = v.total_sqft !== null && v.total_sqft > 0 && v.total_sqft < 300;

  if (totalLooksLikeSide && hoodLooksLikeWidth) {
    // Shifted: total_sqft is actually side_sqft
    // hood_sqft is actually a width, roof_sqft might be length/width
    // We can salvage side_sqft from what was stored as total_sqft
    v.side_sqft = v.total_sqft;
    v.driver_sqft = Math.round((v.side_sqft / 2) * 10) / 10;
    v.passenger_sqft = Math.round((v.side_sqft / 2) * 10) / 10;

    // Clear the incorrectly-placed values
    v.hood_sqft = null;
    v.roof_sqft = null;

    // We lost the real total — recompute from side only (better than wrong data)
    v.total_sqft = null;
    v.full_wrap_sqft = v.side_sqft; // At minimum, side coverage
    v.three_quarter_wrap_sqft = Math.round(v.full_wrap_sqft * 0.75 * 10) / 10;
    v.half_wrap_sqft = Math.round(v.full_wrap_sqft * 0.5 * 10) / 10;
    v.linear_feet = Math.ceil(v.full_wrap_sqft / 4.5);
    fixed++;
  } else if (v.total_sqft !== null && v.total_sqft > 0) {
    // Has total but couldn't derive side (hood+roof > total but hood doesn't look like width)
    // Use total as full_wrap and estimate side = total * 0.6 (sides are ~60% of full wrap)
    v.side_sqft = Math.round(v.total_sqft * 0.6 * 10) / 10;
    v.driver_sqft = Math.round((v.side_sqft / 2) * 10) / 10;
    v.passenger_sqft = Math.round((v.side_sqft / 2) * 10) / 10;
    v.full_wrap_sqft = v.total_sqft;
    v.three_quarter_wrap_sqft = Math.round(v.full_wrap_sqft * 0.75 * 10) / 10;
    v.half_wrap_sqft = Math.round(v.full_wrap_sqft * 0.5 * 10) / 10;
    v.linear_feet = Math.ceil(v.full_wrap_sqft / 4.5);
    fixed++;
  } else {
    // No total, no side — truly missing data
    unfixable++;
  }
}

// Recompute derived fields for ALL vehicles to ensure consistency
for (const v of data) {
  // Ensure full_wrap_sqft
  if (v.full_wrap_sqft === null && v.total_sqft !== null) {
    v.full_wrap_sqft = v.total_sqft;
  }
  if (v.full_wrap_sqft === null && v.side_sqft !== null) {
    v.full_wrap_sqft = (v.side_sqft || 0) + (v.back_sqft || 0) + (v.hood_sqft || 0) + (v.roof_sqft || 0);
    v.full_wrap_sqft = Math.round(v.full_wrap_sqft * 10) / 10;
  }

  // Ensure three_quarter, half, linear
  if (v.full_wrap_sqft !== null) {
    if (v.three_quarter_wrap_sqft === null) v.three_quarter_wrap_sqft = Math.round(v.full_wrap_sqft * 0.75 * 10) / 10;
    if (v.half_wrap_sqft === null) v.half_wrap_sqft = Math.round(v.full_wrap_sqft * 0.5 * 10) / 10;
    if (v.linear_feet === null) v.linear_feet = Math.ceil(v.full_wrap_sqft / 4.5);
  }

  // Ensure driver/passenger
  if (v.driver_sqft === null && v.side_sqft !== null) {
    v.driver_sqft = Math.round((v.side_sqft / 2) * 10) / 10;
    v.passenger_sqft = Math.round((v.side_sqft / 2) * 10) / 10;
  }
}

writeFileSync(inputPath, JSON.stringify(data));

// Final stats
let stats = { total: data.length, driver: 0, side: 0, full: 0, linear: 0 };
for (const v of data) {
  if (v.driver_sqft !== null) stats.driver++;
  if (v.side_sqft !== null) stats.side++;
  if (v.full_wrap_sqft !== null) stats.full++;
  if (v.linear_feet !== null) stats.linear++;
}

console.error(`Fixed ${fixed} shifted/estimated vehicles, ${unfixable} truly missing, ${alreadyGood} already good`);
console.error(`Final stats (of ${data.length}):`);
console.error(`  driver_sqft: ${stats.driver}`);
console.error(`  side_sqft: ${stats.side}`);
console.error(`  full_wrap_sqft: ${stats.full}`);
console.error(`  linear_feet: ${stats.linear}`);
