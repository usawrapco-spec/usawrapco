import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import Anthropic from '@anthropic-ai/sdk'
import sharp from 'sharp'
import { randomUUID } from 'crypto'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PANEL_PROMPT = `This is a vehicle wrap template image. Identify the main paintable body panels visible.
For each panel, return:
- name: one of driver_side, passenger_side, hood, roof, rear, front_bumper, rear_bumper
- bbox: { x: number, y: number, w: number, h: number } as percentages 0-100 of image dimensions
- warp_points: 4 corner points [tl, tr, br, bl] each as { x: number, y: number } percentage coordinates

Return ONLY valid JSON in this format:
{ "panels": [ { "name": "...", "bbox": { "x": 0, "y": 0, "w": 0, "h": 0 }, "warp_points": [{"x":0,"y":0},{"x":0,"y":0},{"x":0,"y":0},{"x":0,"y":0}] } ] }
Include only panels that are clearly visible in the image.`

async function logSystemHealth(orgId: string, service: string, message: string) {
  try {
    await getSupabaseAdmin()
      .from('system_health')
      .insert({ org_id: orgId, service, error_message: message, severity: 'error' })
  } catch { /* silent */ }
}

/**
 * Parse BoundingBox from an Adobe Illustrator (.ai) file.
 * AI files are PostScript-based and contain DSC comments like:
 *   %%BoundingBox: 0 0 1271 996
 *   %%HiResBoundingBox: 0.000 0.000 1271.338 996.249
 */
function parseAIBoundingBox(content: string): { x: number; y: number; w: number; h: number } | null {
  // Prefer HiRes if available
  const hiResMatch = content.match(/%%HiResBoundingBox:\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/)
  if (hiResMatch) {
    const [, x0, y0, x1, y1] = hiResMatch.map(Number)
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
  }
  const bboxMatch = content.match(/%%BoundingBox:\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/)
  if (bboxMatch) {
    const [, x0, y0, x1, y1] = bboxMatch.map(Number)
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
  }
  return null
}

/**
 * Parse dimensions from an SVG file.
 * Returns width/height in pixels (or user units which are typically points/px).
 */
function parseSVGDimensions(content: string): { w: number; h: number } | null {
  // Try viewBox first: "viewBox="minX minY width height""
  const viewBoxMatch = content.match(/viewBox=["']\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*["']/)
  if (viewBoxMatch) {
    return { w: parseFloat(viewBoxMatch[3]), h: parseFloat(viewBoxMatch[4]) }
  }
  // Try explicit width/height attributes
  const wMatch = content.match(/\bwidth=["']([\d.]+)(px|pt|in|mm)?["']/)
  const hMatch = content.match(/\bheight=["']([\d.]+)(px|pt|in|mm)?["']/)
  if (wMatch && hMatch) {
    const unit = wMatch[2] || 'px'
    let w = parseFloat(wMatch[1])
    let h = parseFloat(hMatch[1])
    // Convert units to points (1pt = 1, 1px = 0.75pt, 1in = 72pt, 1mm = 2.835pt)
    const toPt: Record<string, number> = { pt: 1, px: 0.75, in: 72, mm: 2.835 }
    const factor = toPt[unit] || 1
    w *= factor
    h *= factor
    return { w, h }
  }
  return null
}

/**
 * Convert points to real inches using scale factor.
 * For ProVehicleOutlines 1/20th scale: real_width = (pts / 72) * 20
 */
function ptsToRealInches(pts: number, scaleFactor: number): number {
  return (pts / 72) * scaleFactor
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('org_id, role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file       = formData.get('image') as File | null
  const make       = formData.get('make') as string
  const model      = formData.get('model') as string
  const yearStart  = parseInt(formData.get('year_start') as string || '2020')
  const yearEnd    = parseInt(formData.get('year_end') as string || '2025')
  const sqftInput  = parseFloat(formData.get('sqft') as string || '0')
  const scaleFactor = parseFloat(formData.get('scale_factor') as string || '20')

  if (!file) return NextResponse.json({ error: 'Image required' }, { status: 400 })
  if (!make || !model) return NextResponse.json({ error: 'make and model required' }, { status: 400 })

  const id = randomUUID()
  const orgId = profile.org_id

  // Determine source format
  const fileName = file.name.toLowerCase()
  const isAI  = fileName.endsWith('.ai')
  const isSVG = fileName.endsWith('.svg')
  const sourceFormat = isAI ? 'ai' : isSVG ? 'svg' : 'image'

  try {
    const arrayBuffer = await file.arrayBuffer()
    const rawBuffer = Buffer.from(arrayBuffer)

    // ── Dimension extraction ──────────────────────────────────────────────────
    let bboxRaw: string | null = null
    let widthInches: number | null = null
    let heightInches: number | null = null
    // eslint-disable-next-line prefer-const
    let imageBuffer: Buffer = rawBuffer as Buffer

    if (isAI || isSVG) {
      const textContent = rawBuffer.toString('utf-8').slice(0, 8192) // read first 8KB for headers

      if (isAI) {
        const bbox = parseAIBoundingBox(textContent)
        if (bbox) {
          bboxRaw = `${bbox.x} ${bbox.y} ${bbox.x + bbox.w} ${bbox.y + bbox.h}`
          widthInches  = parseFloat(ptsToRealInches(bbox.w, scaleFactor).toFixed(2))
          heightInches = parseFloat(ptsToRealInches(bbox.h, scaleFactor).toFixed(2))
        }
        // AI files can't be rasterized server-side without Ghostscript → use placeholder
        // Create a minimal placeholder image for thumbnail generation
        imageBuffer = await sharp({
          create: { width: 800, height: 600, channels: 3, background: { r: 26, g: 29, b: 39 } },
        }).png().toBuffer()
      } else {
        // SVG: parse dimensions from content
        const dims = parseSVGDimensions(textContent)
        if (dims) {
          bboxRaw = `0 0 ${dims.w} ${dims.h}`
          widthInches  = parseFloat(ptsToRealInches(dims.w, scaleFactor).toFixed(2))
          heightInches = parseFloat(ptsToRealInches(dims.h, scaleFactor).toFixed(2))
        }
        // sharp can rasterize SVGs
        try {
          imageBuffer = await sharp(rawBuffer).png().toBuffer()
        } catch {
          // Fallback if SVG is complex
          imageBuffer = await sharp({
            create: { width: 800, height: 600, channels: 3, background: { r: 26, g: 29, b: 39 } },
          }).png().toBuffer()
        }
      }
    }

    // Compute sqft from real dimensions if not manually entered
    let sqft = sqftInput || null
    if (!sqft && widthInches && heightInches) {
      sqft = parseFloat(((widthInches * heightInches) / 144).toFixed(1))
    }

    // Detect content type
    const contentType = isSVG ? 'image/svg+xml' : file.type || 'image/png'
    const mediaType = (contentType === 'image/jpeg' || contentType === 'image/jpg')
      ? 'image/jpeg' as const
      : 'image/png' as const

    // ── 1. Upload base file to Storage ───────────────────────────────────────
    const storageName = isAI ? `${id}/base.ai` : isSVG ? `${id}/base.svg` : `${id}/base.png`
    const { error: uploadErr } = await admin.storage
      .from('vehicle-templates')
      .upload(storageName, rawBuffer, { contentType, upsert: true })

    if (uploadErr) {
      await logSystemHealth(orgId, 'template-upload', `Storage upload failed: ${uploadErr.message}`)
      return NextResponse.json({ error: 'Storage upload failed', details: uploadErr.message }, { status: 500 })
    }

    // ── 2. Claude panel detection (on rasterized image) ───────────────────────
    let panelsJson: object = { panels: [] }
    try {
      const imageBase64 = imageBuffer.toString('base64')
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            { type: 'text', text: PANEL_PROMPT },
          ],
        }],
      })
      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) panelsJson = JSON.parse(jsonMatch[0])
    } catch (claudeErr: any) {
      await logSystemHealth(orgId, 'template-claude', `Panel detection failed: ${claudeErr.message}`)
    }

    // ── 3. Generate thumbnail via sharp ───────────────────────────────────────
    let thumbnailUrl: string | null = null
    try {
      const thumbBuffer = await sharp(imageBuffer)
        .resize(400, null, { withoutEnlargement: true })
        .png()
        .toBuffer()

      const { error: thumbErr } = await admin.storage
        .from('vehicle-templates')
        .upload(`${id}/thumbnail.png`, thumbBuffer, { contentType: 'image/png', upsert: true })

      if (!thumbErr) {
        const { data: thumbData } = admin.storage
          .from('vehicle-templates')
          .getPublicUrl(`${id}/thumbnail.png`)
        thumbnailUrl = thumbData.publicUrl
      }
    } catch (sharpErr: any) {
      await logSystemHealth(orgId, 'template-sharp', `Thumbnail generation failed: ${sharpErr.message}`)
    }

    // Get base file public URL
    const { data: baseUrlData } = admin.storage
      .from('vehicle-templates')
      .getPublicUrl(storageName)
    const baseImageUrl = baseUrlData.publicUrl

    // ── 4. Auto-match to vehicle_measurements ────────────────────────────────
    let vehicleDbId: string | null = null
    let vehicleDbData: Record<string, number | null> = {}
    try {
      const { data: vmRow } = await admin
        .from('vehicle_measurements')
        .select('id, full_wrap_sqft, side_sqft, hood_sqft, roof_sqft, side_width, side_height, linear_feet')
        .ilike('make', make)
        .ilike('model', model)
        .limit(1)
        .single()

      if (vmRow) {
        vehicleDbId = vmRow.id
        vehicleDbData = {
          full_wrap_sqft: vmRow.full_wrap_sqft,
          side_sqft: vmRow.side_sqft,
          hood_sqft: vmRow.hood_sqft,
          roof_sqft: vmRow.roof_sqft,
          side_width: vmRow.side_width,
          side_height: vmRow.side_height,
          linear_feet: vmRow.linear_feet,
        }
        // Use DB sqft if we don't have one from dimensions
        if (!sqft && vmRow.full_wrap_sqft) {
          sqft = vmRow.full_wrap_sqft
        }
      }
    } catch { /* no match — not an error */ }

    // ── 5. Save to vehicle_templates table ────────────────────────────────────
    const { data: template, error: dbErr } = await admin
      .from('vehicle_templates')
      .insert({
        id,
        org_id: orgId,
        make,
        model,
        year_start: yearStart,
        year_end:   yearEnd,
        sqft:       sqft || null,
        base_image_url: baseImageUrl,
        thumbnail_url:  thumbnailUrl,
        panels_json:    panelsJson,
        status: 'active',
        // Scale-aware fields
        width_inches:  widthInches,
        height_inches: heightInches,
        scale_factor:  scaleFactor,
        bbox_raw:      bboxRaw,
        source_format: sourceFormat,
        // Vehicle DB link
        vehicle_db_id: vehicleDbId,
      })
      .select('id')
      .single()

    if (dbErr) {
      await logSystemHealth(orgId, 'template-db', `DB insert failed: ${dbErr.message}`)
      return NextResponse.json({ error: 'DB insert failed', details: dbErr.message }, { status: 500 })
    }

    return NextResponse.json({
      id: template.id,
      panels_json: panelsJson,
      thumbnail_url: thumbnailUrl,
      width_inches: widthInches,
      height_inches: heightInches,
      scale_factor: scaleFactor,
      bbox_raw: bboxRaw,
      source_format: sourceFormat,
      sqft,
      vehicle_db_id: vehicleDbId,
      vehicle_db_data: vehicleDbData,
      matched: !!vehicleDbId,
    })
  } catch (err: any) {
    await logSystemHealth(orgId, 'template-upload', `Unexpected error: ${err.message}`)
    return NextResponse.json({ error: 'Upload failed', details: err.message }, { status: 500 })
  }
}
