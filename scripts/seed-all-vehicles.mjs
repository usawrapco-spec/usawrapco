import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '..', '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const jsonPath = resolve(__dirname, '..', 'lib', 'data', 'vehicle-measurements.json')
const vehicles = JSON.parse(readFileSync(jsonPath, 'utf8'))

console.log(`Loaded ${vehicles.length} vehicles from JSON`)

// Map JSON fields to DB columns
function mapVehicle(v) {
  return {
    make: v.make || '',
    model: v.model || '',
    year_start: v.year_range ? parseInt(v.year_range.split('-')[0]) || null : null,
    year_end: v.year_range ? parseInt(v.year_range.split('-')[1] || v.year_range.split('-')[0]) || null : null,
    side_width: v.side_width || null,
    side_height: v.side_height || null,
    side_sqft: v.side_sqft || null,
    driver_sqft: v.driver_sqft || null,
    passenger_sqft: v.passenger_sqft || null,
    back_width: v.back_width || null,
    back_height: v.back_height || null,
    back_sqft: v.back_sqft || null,
    hood_width: v.hood_width || null,
    hood_length: v.hood_length || null,
    hood_sqft: v.hood_sqft || null,
    roof_width: v.roof_width || null,
    roof_length: v.roof_length || null,
    roof_sqft: v.roof_sqft || null,
    total_sqft: v.total_sqft || null,
    full_wrap_sqft: v.full_wrap_sqft || null,
    full_wrap_with_roof_sqft: v.full_wrap_with_roof_sqft || null,
    wrap_sqft: v.wrap_sqft || null,
    three_quarter_wrap_sqft: v.three_quarter_wrap_sqft || null,
    half_wrap_sqft: v.half_wrap_sqft || null,
    linear_feet: v.linear_feet || null,
    install_hours: v.install_hours || null,
    install_pay: v.install_pay || null,
    data_quality: v.data_quality || 'good',
    source: 'vehicle-measurements-2026',
    verified: true,
  }
}

// Insert in batches of 100 (table already cleared via SQL)
const BATCH_SIZE = 100
let inserted = 0
let errors = 0

for (let i = 0; i < vehicles.length; i += BATCH_SIZE) {
  const batch = vehicles.slice(i, i + BATCH_SIZE).map(mapVehicle)
  const { error } = await supabase
    .from('vehicle_measurements')
    .insert(batch)

  if (error) {
    console.error(`Batch ${i / BATCH_SIZE}: ERROR - ${error.message}`)
    errors++
  } else {
    inserted += batch.length
    process.stdout.write(`\rInserted ${inserted}/${vehicles.length}`)
  }
}

console.log(`\nDone! Inserted ${inserted} vehicles, ${errors} batch errors`)

// Verify
const { count } = await supabase
  .from('vehicle_measurements')
  .select('*', { count: 'exact', head: true })

console.log(`DB count: ${count}`)
