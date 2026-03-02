/**
 * Mockup pipeline — shared logic called directly by orchestrators (start, approve).
 * Each function is also called by its corresponding HTTP route so endpoints still work standalone.
 */
import { getSupabaseAdmin } from '@/lib/supabase/service'
import sharp from 'sharp'
import { PDFDocument, PDFName, PDFNumber } from 'pdf-lib'

const REPLICATE_API = 'https://api.replicate.com/v1'
const BLEED_INCHES = 0.125
const PRINT_DPI = 300
const BLEED_PX = Math.round(BLEED_INCHES * PRINT_DPI) // 37px at 300dpi

// ── Helpers ──────────────────────────────────────────────────────────────────

export async function logHealth(orgId: string, service: string, message: string) {
  try {
    const admin = getSupabaseAdmin()
    // Deduplicate: only insert if no unresolved alert for this service exists
    const { data: existing } = await admin
      .from('system_health')
      .select('id')
      .eq('org_id', orgId)
      .eq('service', service)
      .is('resolved_at', null)
      .limit(1)
      .maybeSingle()
    if (!existing) {
      await admin
        .from('system_health')
        .insert({ org_id: orgId, service, error_message: message, severity: 'error' })
    }
  } catch { /* silent */ }
}

async function pollReplicate(predictionId: string, timeoutMs = 120000): Promise<any> {
  const token = process.env.REPLICATE_API_TOKEN
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 2000))
    const res = await fetch(`${REPLICATE_API}/predictions/${predictionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const pred = await res.json()
    if (pred.status === 'succeeded') return pred.output
    if (pred.status === 'failed') throw new Error(`Replicate failed: ${pred.error}`)
  }
  throw new Error(`Replicate timeout after ${timeoutMs / 1000}s`)
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

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

  const textElements = lines.map(l =>
    `<text
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
  ).join('\n')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="2" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="0.7"/>
    </filter>
  </defs>
  ${textElements}
</svg>`
}

// ── Pipeline steps ────────────────────────────────────────────────────────────

export async function generateArtwork(params: {
  mockup_id: string
  ideogram_prompt: string
  org_id: string
}): Promise<{ artwork_url: string }> {
  const { mockup_id, ideogram_prompt, org_id: orgId } = params
  const admin = getSupabaseAdmin()
  const token = process.env.REPLICATE_API_TOKEN

  if (!token) {
    await logHealth(orgId, 'generate-artwork', 'REPLICATE_API_TOKEN not set')
    throw new Error('Replicate not configured')
  }

  await admin.from('mockup_results').update({
    current_step: 2,
    step_name: 'Generating artwork…',
  }).eq('id', mockup_id)

  const fullPrompt = `${ideogram_prompt} NO TEXT NO WORDS NO LETTERS NO NUMBERS`
  const negativePrompt = 'text, words, letters, numbers, typography, fonts, labels, signs, watermarks, logos'

  const createRes = await fetch(`${REPLICATE_API}/models/ideogram-ai/ideogram-v2/predictions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'wait',
    },
    body: JSON.stringify({
      input: {
        prompt: fullPrompt,
        negative_prompt: negativePrompt,
        width: 2160,
        height: 1080,
        style_type: 'Design',
        magic_prompt_option: 'Off',
      },
    }),
  })

  if (!createRes.ok) {
    const err = await createRes.text()
    throw new Error(`Replicate create failed: ${err}`)
  }

  let prediction = await createRes.json()
  if (prediction.status !== 'succeeded') {
    const output = await pollReplicate(prediction.id)
    prediction = { ...prediction, output }
  }

  const artworkUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
  if (!artworkUrl) throw new Error('No artwork URL returned from Replicate')

  // Download and upload to Supabase Storage
  const imgRes = await fetch(artworkUrl)
  if (!imgRes.ok) throw new Error('Failed to download artwork from Replicate')
  const imgBuffer = Buffer.from(await imgRes.arrayBuffer())

  const storagePath = `${mockup_id}/artwork.png`
  const { error: upErr } = await admin.storage
    .from('mockup-results')
    .upload(storagePath, imgBuffer, { contentType: 'image/png', upsert: true })

  if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`)

  const { data: urlData } = admin.storage.from('mockup-results').getPublicUrl(storagePath)
  const storedUrl = urlData.publicUrl

  await admin.from('mockup_results').update({
    flat_design_url: storedUrl,
    current_step: 2,
    step_name: 'Artwork generated',
  }).eq('id', mockup_id)

  return { artwork_url: storedUrl }
}

export async function compositeText(params: {
  mockup_id: string
  template_id?: string
  artwork_url: string
  company_name?: string
  tagline?: string
  phone?: string
  website?: string
  font_choice?: string
  brand_colors?: string[]
  org_id: string
}): Promise<{ composited_url: string }> {
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
    org_id: orgId,
  } = params
  const admin = getSupabaseAdmin()

  await admin.from('mockup_results').update({
    current_step: 3,
    step_name: 'Compositing text…',
    text_layers: { company_name, tagline, phone, website, font_choice, brand_colors },
  }).eq('id', mockup_id)

  // Fetch artwork
  const artworkRes = await fetch(artwork_url)
  if (!artworkRes.ok) throw new Error('Failed to fetch artwork')
  const artworkBuffer = Buffer.from(await artworkRes.arrayBuffer())

  // Optionally fetch vehicle template base
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

  const artMeta = await sharp(artworkBuffer).metadata()
  const targetW = artMeta.width || 2160
  const targetH = artMeta.height || 1080
  const artResized = await sharp(artworkBuffer).resize(targetW, targetH).png().toBuffer()

  let finalBuffer: Buffer

  if (baseBuffer) {
    const baseResized = await sharp(baseBuffer).resize(targetW, targetH).ensureAlpha().png().toBuffer()
    const withBase = await sharp(baseResized)
      .composite([{ input: artResized, blend: 'over', premultiplied: false }])
      .png()
      .toBuffer()

    if (company_name || tagline || phone || website) {
      const svgBuffer = Buffer.from(buildTextSvg(targetW, targetH, company_name, tagline, phone, website, font_choice, brand_colors))
      finalBuffer = await sharp(withBase).composite([{ input: svgBuffer, blend: 'over' }]).png().toBuffer()
    } else {
      finalBuffer = withBase
    }
  } else {
    if (company_name || tagline || phone || website) {
      const svgBuffer = Buffer.from(buildTextSvg(targetW, targetH, company_name, tagline, phone, website, font_choice, brand_colors))
      finalBuffer = await sharp(artResized).composite([{ input: svgBuffer, blend: 'over' }]).png().toBuffer()
    } else {
      finalBuffer = artResized
    }
  }

  // Upload composited image
  const storagePath = `${mockup_id}/composited.png`
  const { error: upErr } = await admin.storage
    .from('mockup-results')
    .upload(storagePath, finalBuffer, { contentType: 'image/png', upsert: true })

  if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`)

  const { data: urlData } = admin.storage.from('mockup-results').getPublicUrl(storagePath)
  const compositedUrl = urlData.publicUrl

  await admin.from('mockup_results').update({
    final_mockup_url: compositedUrl,
    current_step: 3,
    step_name: 'Text composited',
  }).eq('id', mockup_id)

  return { composited_url: compositedUrl }
}

export async function polishMockup(params: {
  mockup_id: string
  composited_url: string
  org_id: string
}): Promise<{ concept_url: string }> {
  const { mockup_id, composited_url, org_id: orgId } = params
  const admin = getSupabaseAdmin()
  const token = process.env.REPLICATE_API_TOKEN

  if (!token) {
    await admin.from('mockup_results').update({
      concept_url: composited_url,
      current_step: 4,
      step_name: 'Concept ready (no Replicate key)',
    }).eq('id', mockup_id)
    return { concept_url: composited_url }
  }

  await admin.from('mockup_results').update({
    current_step: 4,
    step_name: 'Applying photorealism…',
  }).eq('id', mockup_id)

  try {
    const createRes = await fetch(`${REPLICATE_API}/models/black-forest-labs/flux-1.1-pro/predictions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'wait',
      },
      body: JSON.stringify({
        input: {
          image: composited_url,
          prompt: 'photorealistic commercial vehicle wrap, professional vehicle graphics, studio photography lighting, sharp details, premium vinyl finish, high quality photograph',
          prompt_strength: 0.12,
          aspect_ratio: '16:9',
          output_format: 'png',
          output_quality: 95,
        },
      }),
    })

    if (!createRes.ok) {
      const err = await createRes.text()
      throw new Error(`Replicate create failed: ${err}`)
    }

    let prediction = await createRes.json()
    if (prediction.status !== 'succeeded') {
      const output = await pollReplicate(prediction.id)
      prediction = { ...prediction, output }
    }

    const polishedUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
    if (!polishedUrl) throw new Error('No polished URL from Replicate')

    const imgRes = await fetch(polishedUrl)
    if (!imgRes.ok) throw new Error('Failed to download polished image')
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer())

    const storagePath = `${mockup_id}/polished.png`
    const { error: upErr } = await admin.storage
      .from('mockup-results')
      .upload(storagePath, imgBuffer, { contentType: 'image/png', upsert: true })

    if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`)

    const { data: urlData } = admin.storage.from('mockup-results').getPublicUrl(storagePath)
    const conceptUrl = urlData.publicUrl

    await admin.from('mockup_results').update({
      concept_url: conceptUrl,
      current_step: 4,
      step_name: 'Photorealism applied',
    }).eq('id', mockup_id)

    return { concept_url: conceptUrl }
  } catch (err: any) {
    await logHealth(orgId, 'mockup-polish', err.message)
    // Graceful fallback — use composited_url
    await admin.from('mockup_results').update({
      concept_url: composited_url,
      current_step: 4,
      step_name: 'Concept ready (polish failed)',
      error_step: 'polish',
      error_message: err.message,
    }).eq('id', mockup_id)
    return { concept_url: composited_url }
  }
}

export async function upscaleMockup(params: {
  mockup_id: string
  concept_url: string
  org_id: string
}): Promise<{ upscaled_url: string }> {
  const { mockup_id, concept_url, org_id: orgId } = params
  const admin = getSupabaseAdmin()
  const token = process.env.REPLICATE_API_TOKEN

  if (!token) {
    await admin.from('mockup_results').update({
      upscaled_url: concept_url,
      current_step: 5,
      step_name: 'Upscaled (no Replicate key)',
    }).eq('id', mockup_id)
    return { upscaled_url: concept_url }
  }

  await admin.from('mockup_results').update({
    current_step: 5,
    step_name: 'Upscaling to print resolution…',
  }).eq('id', mockup_id)

  try {
    const createRes = await fetch(`${REPLICATE_API}/predictions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'wait',
      },
      body: JSON.stringify({
        version: '42fed1c4974146d4d2414e2be2c5277c7fcf05fea2c99b4d5d30c7e4',
        input: {
          image: concept_url,
          scale: 4,
          face_enhance: false,
        },
      }),
    })

    if (!createRes.ok) {
      const err = await createRes.text()
      throw new Error(`Replicate create failed: ${err}`)
    }

    let prediction = await createRes.json()
    if (prediction.status !== 'succeeded') {
      const output = await pollReplicate(prediction.id, 180000)
      prediction = { ...prediction, output }
    }

    const upscaledUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
    if (!upscaledUrl) throw new Error('No upscaled URL from Replicate')

    const imgRes = await fetch(upscaledUrl)
    if (!imgRes.ok) throw new Error('Failed to download upscaled image')
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer())

    const storagePath = `${mockup_id}/upscaled.png`
    const { error: upErr } = await admin.storage
      .from('mockup-results')
      .upload(storagePath, imgBuffer, { contentType: 'image/png', upsert: true })

    if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`)

    const { data: urlData } = admin.storage.from('mockup-results').getPublicUrl(storagePath)
    const storedUrl = urlData.publicUrl

    await admin.from('mockup_results').update({
      upscaled_url: storedUrl,
      current_step: 5,
      step_name: 'Upscaled to print resolution',
    }).eq('id', mockup_id)

    return { upscaled_url: storedUrl }
  } catch (err: any) {
    await logHealth(orgId, 'mockup-upscale', err.message)
    // Graceful fallback
    await admin.from('mockup_results').update({
      upscaled_url: concept_url,
      current_step: 5,
      step_name: 'Upscale complete (fallback)',
    }).eq('id', mockup_id)
    return { upscaled_url: concept_url }
  }
}

export interface PrintSpecs {
  dpi: number
  bleed_inches: number
  color_mode: string
  format: string
  width_px: number
  height_px: number
  vehicle: string | null
  width_inches: number | null
  height_inches: number | null
  scale_factor: number | null
  full_wrap_sqft: number | null
}

export async function exportPrint(params: {
  mockup_id: string
  upscaled_url: string
  org_id: string
}): Promise<{ print_url: string; specs: PrintSpecs }> {
  const { mockup_id, upscaled_url, org_id: orgId } = params
  const admin = getSupabaseAdmin()

  // Fetch mockup + template dimension metadata
  let vehicleLabel = ''
  let widthInches: number | null = null
  let heightInches: number | null = null
  let scaleFactor: number | null = null
  let fullWrapSqft: number | null = null
  try {
    const { data: mockupRow } = await admin
      .from('mockup_results')
      .select('company_name, template_id:template_id')
      .eq('id', mockup_id)
      .single()

    if (mockupRow?.template_id) {
      const { data: tpl } = await admin
        .from('vehicle_templates')
        .select('make, model, year_start, year_end, width_inches, height_inches, scale_factor, sqft')
        .eq('id', mockupRow.template_id)
        .single()
      if (tpl) {
        vehicleLabel = `${tpl.year_start ?? ''}${tpl.year_end && tpl.year_end !== tpl.year_start ? `–${tpl.year_end}` : ''} ${tpl.make} ${tpl.model}`.trim()
        widthInches  = tpl.width_inches ?? null
        heightInches = tpl.height_inches ?? null
        scaleFactor  = tpl.scale_factor ?? null
        fullWrapSqft = tpl.sqft ?? null
      }
    }
  } catch { /* metadata is optional — continue */ }

  await admin.from('mockup_results').update({
    current_step: 6,
    step_name: 'Creating print-ready PDF…',
  }).eq('id', mockup_id)

  // Fetch upscaled image
  const imgRes = await fetch(upscaled_url)
  if (!imgRes.ok) throw new Error('Failed to fetch upscaled image')
  const imgBuffer = Buffer.from(await imgRes.arrayBuffer())

  const meta = await sharp(imgBuffer).metadata()
  const imgW = meta.width || 4000
  const imgH = meta.height || 2000

  // Add bleed
  const withBleedBuffer = await sharp({
    create: {
      width: imgW + BLEED_PX * 2,
      height: imgH + BLEED_PX * 2,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .composite([{ input: imgBuffer, left: BLEED_PX, top: BLEED_PX }])
    .png()
    .toBuffer()

  const finalW = imgW + BLEED_PX * 2
  const finalH = imgH + BLEED_PX * 2

  const jpegBuffer = await sharp(withBleedBuffer)
    .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
    .toBuffer()

  // Build PDF
  const pdfDoc = await PDFDocument.create()
  const ptPerPx = 72 / PRINT_DPI
  const pageWidthPt = finalW * ptPerPx
  const pageHeightPt = finalH * ptPerPx
  const bleedPt = BLEED_PX * ptPerPx

  const page = pdfDoc.addPage([pageWidthPt, pageHeightPt])
  const embeddedImg = await pdfDoc.embedJpg(jpegBuffer)
  page.drawImage(embeddedImg, { x: 0, y: 0, width: pageWidthPt, height: pageHeightPt })

  const trimBoxPt = [bleedPt, bleedPt, pageWidthPt - bleedPt, pageHeightPt - bleedPt]
  const bleedBoxPt = [0, 0, pageWidthPt, pageHeightPt]

  const pageDict = page.node
  pageDict.set(PDFName.of('TrimBox'), pdfDoc.context.obj(trimBoxPt.map(v => PDFNumber.of(v))))
  pageDict.set(PDFName.of('BleedBox'), pdfDoc.context.obj(bleedBoxPt.map(v => PDFNumber.of(v))))
  pageDict.set(PDFName.of('MediaBox'), pdfDoc.context.obj(bleedBoxPt.map(v => PDFNumber.of(v))))

  const dimNote = widthInches && heightInches
    ? ` | Vehicle: ${widthInches}"W × ${heightInches}"H (1:${scaleFactor ?? 20} scale)`
    : ''
  const sqftNote = fullWrapSqft ? ` | ${fullWrapSqft} sqft full wrap` : ''
  pdfDoc.setTitle(vehicleLabel ? `Vehicle Wrap — ${vehicleLabel}` : 'Vehicle Wrap Print-Ready File')
  pdfDoc.setCreator('USA Wrap Co — AI Mockup Generator')
  pdfDoc.setSubject(`Print-ready wrap art — 300 DPI, ${BLEED_INCHES}" bleed${dimNote}${sqftNote}`)
  if (vehicleLabel) pdfDoc.setKeywords([vehicleLabel, 'vehicle wrap', 'print-ready', '300dpi'])

  const pdfBytes = await pdfDoc.save()
  const pdfBuffer = Buffer.from(pdfBytes)

  const storagePath = `${mockup_id}/print-ready.pdf`
  const { error: upErr } = await admin.storage
    .from('mockup-results')
    .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: true })

  if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`)

  const { data: urlData } = admin.storage.from('mockup-results').getPublicUrl(storagePath)
  const printUrl = urlData.publicUrl

  await admin.from('mockup_results').update({
    print_url: printUrl,
    current_step: 6,
    step_name: 'Print-ready PDF created',
    status: 'complete',
  }).eq('id', mockup_id)

  const specs: PrintSpecs = {
    dpi: PRINT_DPI,
    bleed_inches: BLEED_INCHES,
    color_mode: 'RGB (CMYK-ready)',
    format: 'PDF',
    width_px: finalW,
    height_px: finalH,
    vehicle: vehicleLabel || null,
    width_inches: widthInches,
    height_inches: heightInches,
    scale_factor: scaleFactor,
    full_wrap_sqft: fullWrapSqft,
  }

  return { print_url: printUrl, specs }
}
