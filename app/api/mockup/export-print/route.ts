import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import sharp from 'sharp'
import { PDFDocument, PDFName, PDFArray, PDFNumber } from 'pdf-lib'

const BLEED_INCHES = 0.125
const PRINT_DPI = 300
const BLEED_PX = Math.round(BLEED_INCHES * PRINT_DPI) // 37px at 300dpi

async function logHealth(orgId: string, service: string, message: string) {
  try {
    await getSupabaseAdmin()
      .from('system_health')
      .insert({ org_id: orgId, service, error_message: message, severity: 'error' })
  } catch { /* silent */ }
}

export async function POST(req: NextRequest) {
  const admin = getSupabaseAdmin()
  const { mockup_id, upscaled_url, org_id } = await req.json()

  if (!mockup_id || !upscaled_url) {
    return NextResponse.json({ error: 'mockup_id and upscaled_url required' }, { status: 400 })
  }

  const orgId = org_id || 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

  await admin.from('mockup_results').update({
    current_step: 6,
    step_name: 'Creating print-ready PDF…',
  }).eq('id', mockup_id)

  try {
    // 1. Fetch upscaled image
    const imgRes = await fetch(upscaled_url)
    if (!imgRes.ok) throw new Error('Failed to fetch upscaled image')
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer())

    // 2. Get dimensions
    const meta = await sharp(imgBuffer).metadata()
    const imgW = meta.width || 4000
    const imgH = meta.height || 2000

    // 3. Add bleed: extend canvas by BLEED_PX on each side
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

    // 4. Convert to JPEG for PDF embedding (better compression at print quality)
    const jpegBuffer = await sharp(withBleedBuffer)
      .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
      .toBuffer()

    // 5. Build PDF with pdf-lib
    const pdfDoc = await PDFDocument.create()

    // Page size in points (1 inch = 72 points; at 300dpi: px / 300 * 72)
    const ptPerPx = 72 / PRINT_DPI
    const pageWidthPt = finalW * ptPerPx
    const pageHeightPt = finalH * ptPerPx
    const bleedPt = BLEED_PX * ptPerPx

    const page = pdfDoc.addPage([pageWidthPt, pageHeightPt])

    // Embed JPEG image
    const embeddedImg = await pdfDoc.embedJpg(jpegBuffer)
    page.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width: pageWidthPt,
      height: pageHeightPt,
    })

    // Set bleed box (trim box inset by bleed amount)
    const trimBoxPt = [bleedPt, bleedPt, pageWidthPt - bleedPt, pageHeightPt - bleedPt]
    const bleedBoxPt = [0, 0, pageWidthPt, pageHeightPt]

    const pageDict = page.node
    pageDict.set(PDFName.of('TrimBox'), pdfDoc.context.obj(trimBoxPt.map(v => PDFNumber.of(v))))
    pageDict.set(PDFName.of('BleedBox'), pdfDoc.context.obj(bleedBoxPt.map(v => PDFNumber.of(v))))
    pageDict.set(PDFName.of('MediaBox'), pdfDoc.context.obj(bleedBoxPt.map(v => PDFNumber.of(v))))

    // PDF/X metadata
    pdfDoc.setTitle('Vehicle Wrap Print-Ready File')
    pdfDoc.setCreator('USA Wrap Co — AI Mockup Generator')
    pdfDoc.setSubject(`Print-ready wrap art — 300 DPI, ${BLEED_INCHES}" bleed`)

    const pdfBytes = await pdfDoc.save()
    const pdfBuffer = Buffer.from(pdfBytes)

    // 6. Upload PDF to Storage
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

    return NextResponse.json({
      print_url: printUrl,
      specs: {
        dpi: PRINT_DPI,
        bleed_inches: BLEED_INCHES,
        color_mode: 'RGB (CMYK-ready)',
        format: 'PDF',
        width_px: finalW,
        height_px: finalH,
      },
    })
  } catch (err: any) {
    await logHealth(orgId, 'export-print', err.message)
    await admin.from('mockup_results').update({
      error_step: 'export-print',
      error_message: err.message,
    }).eq('id', mockup_id)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
