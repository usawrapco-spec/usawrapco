#!/usr/bin/env node
/**
 * Transform vehicle-measurements.json field names to match DB schema exactly.
 * Also adds computed fields: full_wrap_sqft, three_quarter_wrap_sqft, half_wrap_sqft,
 * linear_feet, wrap_sqft, data_quality, install_hours, install_pay, suggested_price
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// ─── Install formula constants (must match lib/estimator/vehicleDb.ts) ──────
const INSTALL_HOURLY_RATE = 35;
const INSTALL_BASE_HOURS = 11.5;
const INSTALL_HOURS_PER_SQFT = 0.015;
const INSTALL_PAY_ROUND_TO = 25;
const DESIGN_FEE = 200;
const DEFAULT_MATERIAL_RATE = 2.10; // Avery 1105
const DEFAULT_WASTE_PCT = 0.10;
const GPM_TARGET = 0.75;

function calculateInstallPay(wrapSqft) {
  if (wrapSqft <= 0) return { pay: 0, hours: 0 };
  const hours = Math.round((INSTALL_BASE_HOURS + INSTALL_HOURS_PER_SQFT * wrapSqft) * 10) / 10;
  const rawPay = hours * INSTALL_HOURLY_RATE;
  const pay = Math.round(rawPay / INSTALL_PAY_ROUND_TO) * INSTALL_PAY_ROUND_TO;
  return { pay, hours };
}

function suggestedPrice(wrapSqft, installPay) {
  const sqftOrdered = Math.ceil(wrapSqft * (1 + DEFAULT_WASTE_PCT));
  const materialCost = sqftOrdered * DEFAULT_MATERIAL_RATE;
  const cogs = materialCost + installPay + DESIGN_FEE;
  return Math.round(cogs / (1 - GPM_TARGET));
}

// ─── Determine data quality ─────────────────────────────────────────────────
function classifyQuality(v) {
  // cab_only: commercial truck cabs with model numbers as years, no full data
  const yearNum = parseInt(v.year_range);
  const hasModel = v.model && v.model.trim().length > 0;
  if (!hasModel && (isNaN(yearNum) || yearNum > 2040)) return 'cab_only';
  if (v.full_wrap_sqft === null || v.full_wrap_sqft <= 0) return 'cab_only';

  // good: has all key fields
  if (v.driver_sqft !== null && v.full_wrap_sqft > 0 && v.roof_sqft !== null && v.roof_sqft > 0) {
    return 'good';
  }
  // partial: has some data but not complete
  return 'partial';
}

// ─── Main transform ─────────────────────────────────────────────────────────
const inputPath = resolve('lib/data/vehicle-measurements.json');
const data = JSON.parse(readFileSync(inputPath, 'utf-8'));

const transformed = data.map(v => {
  // Map old field names to correct DB column names (handles both old and new formats)
  const side_width = v.side_width_in ?? v.side_width ?? null;
  const side_height = v.side_height_in ?? v.side_height ?? null;
  let side_sqft = v.both_sides_sqft ?? v.side_sqft ?? null;
  const back_width = v.rear_width_in ?? v.back_width ?? null;
  const back_height = v.rear_height_in ?? v.back_height ?? null;
  const back_sqft = v.rear_sqft ?? v.back_sqft ?? null;
  const hood_width = v.hood_width_in ?? v.hood_width ?? null;
  const hood_length = v.hood_length_in ?? v.hood_length ?? null;
  const hood_sqft = v.hood_sqft ?? null;
  const roof_width = v.roof_width_in ?? v.roof_width ?? null;
  const roof_length = v.roof_length_in ?? v.roof_length ?? null;
  const roof_sqft = v.roof_sqft ?? null;
  const total_sqft = v.total_sqft ?? null;

  // Derive side_sqft from total if missing: side = total - hood - roof - back
  if (side_sqft === null && total_sqft !== null) {
    const derived = total_sqft - (hood_sqft || 0) - (roof_sqft || 0) - (back_sqft || 0);
    if (derived > 0) {
      side_sqft = Math.round(derived * 10) / 10;
    }
  }

  // Compute driver/passenger (side_sqft = both sides combined)
  let driver_sqft = v.driver_side_sqft ?? v.driver_sqft ?? null;
  let passenger_sqft = v.passenger_side_sqft ?? v.passenger_sqft ?? null;
  if (driver_sqft === null && side_sqft !== null) {
    driver_sqft = Math.round((side_sqft / 2) * 10) / 10;
  }
  if (passenger_sqft === null && side_sqft !== null) {
    passenger_sqft = Math.round((side_sqft / 2) * 10) / 10;
  }

  // full_wrap_sqft = sides + back + hood (NO roof — industry standard "full wrap")
  // full_wrap_with_roof_sqft = sides + back + hood + roof
  let full_wrap_with_roof_sqft = total_sqft;
  if (full_wrap_with_roof_sqft === null && side_sqft !== null) {
    full_wrap_with_roof_sqft = (side_sqft || 0) + (back_sqft || 0) + (hood_sqft || 0) + (roof_sqft || 0);
    full_wrap_with_roof_sqft = Math.round(full_wrap_with_roof_sqft * 10) / 10;
  }

  // full_wrap_sqft = WITHOUT roof
  let full_wrap_sqft = null;
  if (full_wrap_with_roof_sqft !== null && full_wrap_with_roof_sqft > 0) {
    full_wrap_sqft = Math.round((full_wrap_with_roof_sqft - (roof_sqft || 0)) * 10) / 10;
    if (full_wrap_sqft <= 0) full_wrap_sqft = full_wrap_with_roof_sqft; // fallback if no roof data
  }

  // wrap_sqft kept as alias for full_wrap_sqft (no roof) for backward compat
  const wrap_sqft = full_wrap_sqft;

  const three_quarter_wrap_sqft = full_wrap_sqft !== null ? Math.round(full_wrap_sqft * 0.75 * 10) / 10 : null;
  const half_wrap_sqft = full_wrap_sqft !== null ? Math.round(full_wrap_sqft * 0.5 * 10) / 10 : null;
  const linear_feet = full_wrap_sqft !== null ? Math.ceil(full_wrap_sqft / 4.5) : null;

  // Install cost from formula
  let install_hours = null;
  let install_pay = null;
  let suggested_price_val = null;
  if (wrap_sqft !== null && wrap_sqft > 0) {
    const inst = calculateInstallPay(wrap_sqft);
    install_hours = inst.hours;
    install_pay = inst.pay;
    suggested_price_val = suggestedPrice(wrap_sqft, inst.pay);
  }

  const result = {
    make: v.make,
    model: v.model,
    year_range: v.year_range,
    year_start: v.year_start,
    year_end: v.year_end,
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
    full_wrap_with_roof_sqft,
    wrap_sqft,
    three_quarter_wrap_sqft,
    half_wrap_sqft,
    linear_feet,
    install_hours,
    install_pay,
    suggested_price: suggested_price_val,
    data_quality: null, // set below
    source: 'vehicle-measurements-2026',
    verified: true,
  };

  result.data_quality = classifyQuality(result);

  return result;
});

// Sort by make, model, year_start
transformed.sort((a, b) => {
  if (a.make !== b.make) return a.make.localeCompare(b.make);
  if (a.model !== b.model) return a.model.localeCompare(b.model);
  return (a.year_start || 0) - (b.year_start || 0);
});

writeFileSync(inputPath, JSON.stringify(transformed));
console.error(`Transformed ${transformed.length} vehicles`);
console.error(`Sample:`, JSON.stringify(transformed[0], null, 2));
console.error(`Fields: ${Object.keys(transformed[0]).join(', ')}`);

// Stats
let stats = { full_no_roof: 0, full_with_roof: 0, wrap: 0, linear: 0, driver: 0, side: 0, back: 0, hood: 0, roof: 0, install_pay: 0 };
let quality = { good: 0, partial: 0, cab_only: 0 };
for (const v of transformed) {
  if (v.full_wrap_sqft !== null) stats.full_no_roof++;
  if (v.full_wrap_with_roof_sqft !== null) stats.full_with_roof++;
  if (v.wrap_sqft !== null) stats.wrap++;
  if (v.linear_feet !== null) stats.linear++;
  if (v.driver_sqft !== null) stats.driver++;
  if (v.side_sqft !== null) stats.side++;
  if (v.back_sqft !== null) stats.back++;
  if (v.hood_sqft !== null) stats.hood++;
  if (v.roof_sqft !== null) stats.roof++;
  if (v.install_pay !== null) stats.install_pay++;
  quality[v.data_quality] = (quality[v.data_quality] || 0) + 1;
}
console.error(`\nStats (of ${transformed.length}):`);
for (const [k, v] of Object.entries(stats)) {
  console.error(`  ${k}: ${v}`);
}
console.error(`\nData quality:`);
for (const [k, v] of Object.entries(quality)) {
  console.error(`  ${k}: ${v}`);
}
