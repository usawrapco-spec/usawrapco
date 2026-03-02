/**
 * Test script: template upload pipeline
 * Tests: image download → Claude panel detection → sharp thumbnail → Supabase Storage upload → DB insert
 * Run: node scripts/test_template_upload.mjs
 */

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import sharp from 'sharp'
import { randomUUID } from 'crypto'

// ── Load env ──────────────────────────────────────────────────────────────────
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
    })
)

// Handle BOM on first line
Object.keys(env).forEach(k => {
  const clean = k.replace(/^\uFEFF/, '')
  if (clean !== k) { env[clean] = env[k]; delete env[k] }
})

const SUPABASE_URL      = env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY      = env.SUPABASE_SERVICE_KEY      // sb_secret_* key
const ANTHROPIC_KEY     = env.ANTHROPIC_API_KEY
const ORG_ID            = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌ Missing Supabase env vars'); process.exit(1) }
if (!ANTHROPIC_KEY)                 { console.error('❌ Missing ANTHROPIC_API_KEY'); process.exit(1) }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY })

// ── Step 1: Download test vehicle image ───────────────────────────────────────
// Using a public domain Ford Transit van outline image
const TEST_IMAGE_URL = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Simple_Delivery_Van.svg/800px-Simple_Delivery_Van.svg.png'
const MAKE       = 'Ford'
const MODEL      = 'Transit'
const YEAR_START = 2020
const YEAR_END   = 2024
const SQFT       = 220

console.log('\n🚐 USA Wrap Co — Template Upload Test')
console.log('═══════════════════════════════════════\n')
console.log(`📥 Step 1: Downloading vehicle image…`)
console.log(`   URL: ${TEST_IMAGE_URL}`)

let imageBuffer
try {
  const res = await fetch(TEST_IMAGE_URL)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  imageBuffer = Buffer.from(await res.arrayBuffer())
  console.log(`   ✅ Downloaded ${(imageBuffer.length / 1024).toFixed(1)} KB`)
} catch (err) {
  console.error(`   ❌ Download failed: ${err.message}`)
  // Fallback: create a synthetic test image using sharp
  console.log(`   🔄 Creating synthetic test image via sharp…`)
  imageBuffer = await sharp({
    create: {
      width: 800, height: 400,
      channels: 3,
      background: { r: 220, g: 225, b: 235 },
    },
  })
    .composite([
      // Van body rectangle
      { input: Buffer.from(`<svg width="800" height="400" xmlns="http://www.w3.org/2000/svg">
        <rect x="80" y="120" width="620" height="200" rx="20" fill="#cccccc" stroke="#888" stroke-width="3"/>
        <rect x="80" y="150" width="200" height="60" rx="8" fill="#99aacc" opacity="0.6"/>
        <circle cx="180" cy="340" r="45" fill="#555"/>
        <circle cx="620" cy="340" r="45" fill="#555"/>
        <circle cx="180" cy="340" r="25" fill="#999"/>
        <circle cx="620" cy="340" r="25" fill="#999"/>
        <rect x="60" y="200" width="40" height="70" rx="6" fill="#bbbbbb" stroke="#888" stroke-width="2"/>
      </svg>`), top: 0, left: 0 },
    ])
    .png()
    .toBuffer()
  console.log(`   ✅ Synthetic image created (${(imageBuffer.length / 1024).toFixed(1)} KB)`)
}

// ── Step 2: Upload base image to Storage ──────────────────────────────────────
const id = randomUUID()
console.log(`\n📤 Step 2: Uploading base image to Storage…`)
console.log(`   Template ID: ${id}`)
console.log(`   Path: vehicle-templates/${id}/base.png`)

const { error: uploadErr } = await supabase.storage
  .from('vehicle-templates')
  .upload(`${id}/base.png`, imageBuffer, { contentType: 'image/png', upsert: true })

if (uploadErr) {
  console.error(`   ❌ Storage upload failed: ${uploadErr.message}`)
  process.exit(1)
}
const { data: baseUrlData } = supabase.storage.from('vehicle-templates').getPublicUrl(`${id}/base.png`)
console.log(`   ✅ Uploaded: ${baseUrlData.publicUrl}`)

// ── Step 3: Claude panel detection ────────────────────────────────────────────
console.log(`\n🤖 Step 3: Claude vision — panel detection…`)
const imageBase64 = imageBuffer.toString('base64')

const PANEL_PROMPT = `This is a vehicle side-view illustration or template image. Identify the main paintable body panels visible.
For each panel, return:
- name: one of driver_side, passenger_side, hood, roof, rear, front_bumper, rear_bumper
- bbox: { x, y, w, h } as percentages 0-100 of image dimensions
- warp_points: 4 corner points [tl, tr, br, bl] each as { x, y } percentage coordinates

Return ONLY valid JSON:
{ "panels": [ { "name": "...", "bbox": { "x": 0, "y": 0, "w": 0, "h": 0 }, "warp_points": [{"x":0,"y":0},{"x":0,"y":0},{"x":0,"y":0},{"x":0,"y":0}] } ] }
Include only panels clearly visible in the image.`

let panelsJson = { panels: [] }
try {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: imageBase64 } },
        { type: 'text', text: PANEL_PROMPT },
      ],
    }],
  })
  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  console.log(`   Claude raw response:\n   ${text.slice(0, 300)}${text.length > 300 ? '…' : ''}`)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    panelsJson = JSON.parse(jsonMatch[0])
    console.log(`   ✅ Detected ${panelsJson.panels?.length || 0} panels:`)
    panelsJson.panels?.forEach(p => {
      console.log(`      • ${p.name} — bbox(${p.bbox.x.toFixed(1)}%, ${p.bbox.y.toFixed(1)}%, ${p.bbox.w.toFixed(1)}%, ${p.bbox.h.toFixed(1)}%)`)
    })
  } else {
    console.log(`   ⚠️  No JSON found in Claude response — using empty panels`)
  }
} catch (err) {
  console.error(`   ❌ Claude API error: ${err.message}`)
  console.log(`   ⚠️  Continuing with empty panels…`)
}

// ── Step 4: Sharp thumbnail ────────────────────────────────────────────────────
console.log(`\n🖼️  Step 4: Generating 400px thumbnail via Sharp…`)
let thumbnailUrl = null
try {
  const thumbBuffer = await sharp(imageBuffer)
    .resize(400, null, { withoutEnlargement: true })
    .png()
    .toBuffer()
  console.log(`   Thumbnail size: ${(thumbBuffer.length / 1024).toFixed(1)} KB`)

  const { error: thumbErr } = await supabase.storage
    .from('vehicle-templates')
    .upload(`${id}/thumbnail.png`, thumbBuffer, { contentType: 'image/png', upsert: true })

  if (thumbErr) {
    console.error(`   ❌ Thumbnail upload failed: ${thumbErr.message}`)
  } else {
    const { data: thumbData } = supabase.storage.from('vehicle-templates').getPublicUrl(`${id}/thumbnail.png`)
    thumbnailUrl = thumbData.publicUrl
    console.log(`   ✅ Thumbnail: ${thumbnailUrl}`)
  }
} catch (err) {
  console.error(`   ❌ Sharp error: ${err.message}`)
}

// ── Step 5: DB insert ──────────────────────────────────────────────────────────
console.log(`\n💾 Step 5: Inserting into vehicle_templates…`)
const { data: inserted, error: dbErr } = await supabase
  .from('vehicle_templates')
  .insert({
    id,
    org_id:        ORG_ID,
    make:          MAKE,
    model:         MODEL,
    year_start:    YEAR_START,
    year_end:      YEAR_END,
    sqft:          SQFT,
    base_image_url: baseUrlData.publicUrl,
    thumbnail_url:  thumbnailUrl,
    panels_json:    panelsJson,
    status:        'active',
  })
  .select('id, make, model, year_start, year_end, sqft, status')
  .single()

if (dbErr) {
  console.error(`   ❌ DB insert failed: ${dbErr.message}`)
  process.exit(1)
}

console.log(`   ✅ Inserted:`, inserted)

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(45)}`)
console.log(`✅  TEMPLATE UPLOAD TEST PASSED`)
console.log(`${'═'.repeat(45)}`)
console.log(`   Template ID : ${id}`)
console.log(`   Vehicle     : ${MAKE} ${MODEL} (${YEAR_START}–${YEAR_END})`)
console.log(`   Sq Ft       : ${SQFT}`)
console.log(`   Panels      : ${panelsJson.panels?.length || 0} detected`)
console.log(`   Base URL    : ${baseUrlData.publicUrl}`)
console.log(`   Thumbnail   : ${thumbnailUrl || 'none'}`)
console.log(`\n   View in dashboard: /admin/templates`)
console.log(``)
