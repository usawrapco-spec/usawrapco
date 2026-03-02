import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import sharp from 'sharp'

async function logHealth(orgId: string, service: string, message: string) {
  try {
    await getSupabaseAdmin()
      .from('system_health')
      .insert({ org_id: orgId, service, error_message: message, severity: 'error' })
  } catch { /* silent */ }
}

// Build SVG text overlay
function buildTextSvg(
  width: number,
  height: number,
  companyName: string,
  tagline: string,
  phone: string,
  website: string,
  fontChoice: string,
  brandColors: string[],
): string {
  const primaryColor = brandColors[0] || '#ffffff'
  const secondaryColor = brandColors[1] || '#cccccc'
  const fontFamily = fontChoice || 'Impact'

  const lines: { text: string; y: number; fontSize: number; fill: string; weight: string }[] = []

  const baseFontSize = Math.round(height * 0.12)
  const taglineFontSize = Math.round(height * 0.06)
  const contactFontSize = Math.round(height * 0.045)

  let yPos = height * 0.55

  if (companyName) {
    lines.push({ text: companyName.toUpperCase(), y: yPos, fontSize: baseFontSize, fill: primaryColor, weight: 'bold' })
    yPos += baseFontSize * 1.15
  }
  if (tagline) {
    lines.push({ text: tagline, y: yPos, fontSize: taglineFontSize, fill: secondaryColor, weight: '400' })
    yPos += taglineFontSize * 1.4
  }
  if (phone || website) {
    const contactLine = [phone, website].filter(Boolean).join('  |  ')
    lines.push({ text: contactLine, y: yPos, fontSize: contactFontSize, fill: secondaryColor, weight: '300' })
  }

  const textElements = lines.map(l => {
    // Drop shadow via filter
    return `<text
      x="50%"
      y="${l.y}"
      font-family="${fontFamily}, Impact, Arial Black, sans-serif"
      font-size="${l.fontSize}"
      font-weight="${l.weight}"
      fill="${l.fill}"
      text-anchor="middle"
      dominant-baseline="hanging"
      filter="url(#shadow)"
      paint-order="stroke"
      stroke="#000000"
      stroke-width="${Math.round(l.fontSize * 0.04)}"
      stroke-linejoin="round"
    >${escapeXml(l.text)}</text>`
  }).join('\n')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="2" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="0.7"/>
    </filter>
  </defs>
  ${textElements}
</svg>`
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function POST(req: NextRequest) {
  const admin = getSupabaseAdmin()
  const {
    mockup_id,
    template_id,
    artwork_url,
    company_name = '',
    tagline = '',
    phone = '',
    website = '',
    font_choice = 'Impact',
    brand_colors = ['#ffffff', '#cccccc', '#f59e0b'],
    org_id,
  } = await req.json()

  if (!mockup_id || !artwork_url) {
    return NextResponse.json({ error: 'mockup_id and artwork_url required' }, { status: 400 })
  }

  const orgId = org_id || 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

  await admin.from('mockup_results').update({
    current_step: 3,
    step_name: 'Compositing text…',
    text_layers: { company_name, tagline, phone, website, font_choice, brand_colors },
  }).eq('id', mockup_id)

  try {
    // 1. Fetch artwork
    const artworkRes = await fetch(artwork_url)
    if (!artworkRes.ok) throw new Error('Failed to fetch artwork')
    const artworkBuffer = Buffer.from(await artworkRes.arrayBuffer())

    // 2. Optionally fetch vehicle template base
    let baseBuffer: Buffer | null = null
    if (template_id) {
      const { data: tpl } = await admin
        .from('vehicle_templates')
        .select('base_image_url')
        .eq('id', template_id)
        .single()
      if (tpl?.base_image_url) {
        const tplRes = await fetch(tpl.base_image_url)
        if (tplRes.ok) baseBuffer = Buffer.from(await tplRes.arrayBuffer())
      }
    }

    // 3. Get dimensions
    const artMeta = await sharp(artworkBuffer).metadata()
    const targetW = artMeta.width || 2160
    const targetH = artMeta.height || 1080

    // 4. Resize artwork
    const artResized = await sharp(artworkBuffer).resize(targetW, targetH).png().toBuffer()

    // 5. Composite layers
    const composites: sharp.OverlayOptions[] = []

    if (baseBuffer) {
      const baseResized = await sharp(baseBuffer)
        .resize(targetW, targetH)
        .ensureAlpha()
        .png()
        .toBuffer()
      // Add artwork over base at 85% opacity via multiplied blend
      composites.push({
        input: artResized,
        blend: 'over',
        premultiplied: false,
      })
      // Start from base
      const withBase = await sharp(baseResized)
        .composite(composites)
        .png()
        .toBuffer()

      // 6. Add text SVG overlay
      if (company_name || tagline || phone || website) {
        const svgText = buildTextSvg(targetW, targetH, company_name, tagline, phone, website, font_choice, brand_colors)
        const svgBuffer = Buffer.from(svgText)
        const final = await sharp(withBase)
          .composite([{ input: svgBuffer, blend: 'over' }])
          .png()
          .toBuffer()
        return await uploadAndUpdate(admin, mockup_id, final, orgId)
      }
      return await uploadAndUpdate(admin, mockup_id, withBase, orgId)
    } else {
      // No base template — just artwork + text
      if (company_name || tagline || phone || website) {
        const svgText = buildTextSvg(targetW, targetH, company_name, tagline, phone, website, font_choice, brand_colors)
        const svgBuffer = Buffer.from(svgText)
        const final = await sharp(artResized)
          .composite([{ input: svgBuffer, blend: 'over' }])
          .png()
          .toBuffer()
        return await uploadAndUpdate(admin, mockup_id, final, orgId)
      }
      return await uploadAndUpdate(admin, mockup_id, artResized, orgId)
    }
  } catch (err: any) {
    await logHealth(orgId, 'composite-text', err.message)
    await admin.from('mockup_results').update({
      error_step: 'composite-text',
      error_message: err.message,
    }).eq('id', mockup_id)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function uploadAndUpdate(
  admin: ReturnType<typeof getSupabaseAdmin>,
  mockupId: string,
  buffer: Buffer,
  orgId: string,
): Promise<NextResponse> {
  const storagePath = `${mockupId}/composited.png`
  const { error: upErr } = await admin.storage
    .from('mockup-results')
    .upload(storagePath, buffer, { contentType: 'image/png', upsert: true })

  if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`)

  const { data: urlData } = admin.storage.from('mockup-results').getPublicUrl(storagePath)
  const compositedUrl = urlData.publicUrl

  await admin.from('mockup_results').update({
    final_mockup_url: compositedUrl,
    current_step: 3,
    step_name: 'Text composited',
  }).eq('id', mockupId)

  return NextResponse.json({ composited_url: compositedUrl })
}
