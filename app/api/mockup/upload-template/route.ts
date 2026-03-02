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

  const file      = formData.get('image') as File | null
  const make      = formData.get('make') as string
  const model     = formData.get('model') as string
  const yearStart = parseInt(formData.get('year_start') as string || '2020')
  const yearEnd   = parseInt(formData.get('year_end') as string || '2025')
  const sqft      = parseFloat(formData.get('sqft') as string || '0')

  if (!file) return NextResponse.json({ error: 'Image required' }, { status: 400 })
  if (!make || !model) return NextResponse.json({ error: 'make and model required' }, { status: 400 })

  const id = randomUUID()
  const orgId = profile.org_id

  try {
    // Read image as buffer
    const arrayBuffer = await file.arrayBuffer()
    const imageBuffer = Buffer.from(arrayBuffer)

    // Detect content type
    const contentType = file.type || 'image/png'
    const mediaType = (contentType === 'image/jpeg' || contentType === 'image/jpg')
      ? 'image/jpeg'
      : 'image/png'

    // 1. Upload base image to Storage
    const { error: uploadErr } = await admin.storage
      .from('vehicle-templates')
      .upload(`${id}/base.png`, imageBuffer, { contentType: mediaType, upsert: true })

    if (uploadErr) {
      await logSystemHealth(orgId, 'template-upload', `Storage upload failed: ${uploadErr.message}`)
      return NextResponse.json({ error: 'Storage upload failed', details: uploadErr.message }, { status: 500 })
    }

    // 2. Call Claude for panel detection
    let panelsJson: object = { panels: [] }
    try {
      const imageBase64 = imageBuffer.toString('base64')
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType as 'image/png' | 'image/jpeg', data: imageBase64 },
            },
            { type: 'text', text: PANEL_PROMPT },
          ],
        }],
      })
      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) panelsJson = JSON.parse(jsonMatch[0])
    } catch (claudeErr: any) {
      await logSystemHealth(orgId, 'template-claude', `Panel detection failed: ${claudeErr.message}`)
      // Continue without panels — still save the template
    }

    // 3. Generate thumbnail via sharp
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

    // Get base image public URL
    const { data: baseUrlData } = admin.storage
      .from('vehicle-templates')
      .getPublicUrl(`${id}/base.png`)
    const baseImageUrl = baseUrlData.publicUrl

    // 4. Save to vehicle_templates table
    const { data: template, error: dbErr } = await admin
      .from('vehicle_templates')
      .insert({
        id,
        org_id: orgId,
        make,
        model,
        year_start: yearStart,
        year_end: yearEnd,
        sqft: sqft || null,
        base_image_url: baseImageUrl,
        thumbnail_url: thumbnailUrl,
        panels_json: panelsJson,
        status: 'active',
      })
      .select('id')
      .single()

    if (dbErr) {
      await logSystemHealth(orgId, 'template-db', `DB insert failed: ${dbErr.message}`)
      return NextResponse.json({ error: 'DB insert failed', details: dbErr.message }, { status: 500 })
    }

    return NextResponse.json({ id: template.id, panels_json: panelsJson, thumbnail_url: thumbnailUrl })
  } catch (err: any) {
    await logSystemHealth(orgId, 'template-upload', `Unexpected error: ${err.message}`)
    return NextResponse.json({ error: 'Upload failed', details: err.message }, { status: 500 })
  }
}
