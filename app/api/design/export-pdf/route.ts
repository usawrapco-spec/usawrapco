import { NextRequest, NextResponse } from 'next/server'

interface Panel {
  name: string
  imageBase64: string
  widthInches: number
  heightInches: number
  bleedInches: number
}

interface ExportRequest {
  jobId: string
  customerName: string
  vehicleDescription: string
  panels: Panel[]
  includeProductionBrief: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body: ExportRequest = await request.json()
    const { jobId, customerName, vehicleDescription, panels, includeProductionBrief } = body

    const PDFDocument = (await import('pdfkit')).default
    const sharp = (await import('sharp')).default

    const chunks: Buffer[] = []

    const doc = new PDFDocument({ autoFirstPage: false, compress: false })
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))

    // ── COVER PAGE ──────────────────────────────────────────────────────────
    if (includeProductionBrief) {
      doc.addPage({ size: 'LETTER', margins: { top: 36, bottom: 36, left: 36, right: 36 } })

      doc.rect(0, 0, doc.page.width, 80).fill('#0a0f1a')
      doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold')
         .text('USA WRAP CO', 36, 20)
      doc.fillColor('#64d2ff').fontSize(12).font('Helvetica')
         .text('PRINT PRODUCTION BRIEF', 36, 50)

      doc.fillColor('#111827').rect(0, 80, doc.page.width, doc.page.height).fill()
      doc.fillColor('#ffffff')

      const details = [
        ['JOB ID', jobId],
        ['CUSTOMER', customerName],
        ['VEHICLE', vehicleDescription],
        ['DATE', new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })],
        ['TOTAL PANELS', panels.length.toString()],
      ]

      let y = 110
      details.forEach(([label, value]) => {
        doc.fillColor('#64d2ff').fontSize(9).font('Helvetica-Bold').text(label, 36, y)
        doc.fillColor('#ffffff').fontSize(11).font('Helvetica').text(value, 150, y)
        y += 24
      })

      y += 20
      doc.fillColor('#64d2ff').fontSize(10).font('Helvetica-Bold').text('PANEL BREAKDOWN', 36, y)
      y += 18

      doc.fillColor('#1a2236').rect(36, y, doc.page.width - 72, 22).fill()
      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
      doc.text('PANEL', 46, y + 6)
      doc.text('WIDTH', 200, y + 6)
      doc.text('HEIGHT', 280, y + 6)
      doc.text('WITH BLEED', 360, y + 6)
      doc.text('LINEAR FT', 460, y + 6)
      y += 22

      panels.forEach((panel, i) => {
        const bg = i % 2 === 0 ? '#0d1526' : '#111827'
        doc.fillColor(bg).rect(36, y, doc.page.width - 72, 20).fill()
        const bleedW = panel.widthInches + panel.bleedInches * 2
        const bleedH = panel.heightInches + panel.bleedInches * 2
        const linearFt = (panel.widthInches / 12).toFixed(2)
        doc.fillColor('#e5e7eb').fontSize(9).font('Helvetica')
        doc.text(panel.name, 46, y + 5)
        doc.text(`${panel.widthInches}"`, 200, y + 5)
        doc.text(`${panel.heightInches}"`, 280, y + 5)
        doc.text(`${bleedW.toFixed(2)}" × ${bleedH.toFixed(2)}"`, 360, y + 5)
        doc.text(`${linearFt} ft`, 460, y + 5)
        y += 20
      })

      y += 30
      doc.fillColor('#1a2236').rect(36, y, doc.page.width - 72, 120).fill()
      doc.fillColor('#64d2ff').fontSize(10).font('Helvetica-Bold').text('PRINT SPECIFICATIONS', 46, y + 10)
      const specs = [
        'Resolution: 300 DPI at print size',
        'Color Mode: CMYK',
        `Bleed: ${panels[0]?.bleedInches ?? 0.5}" all sides (included in file dimensions)`,
        'Overlaminate: Yes — gloss or matte per job notes',
        'Material: Cast vinyl (3M / Avery Dennison)',
        'Media Width: 54" max — panels wider than 54" require seaming',
      ]
      doc.fillColor('#e5e7eb').fontSize(9).font('Helvetica')
      specs.forEach((spec, i) => {
        doc.text(`• ${spec}`, 46, y + 28 + (i * 14))
      })
    }

    // ── PANEL PAGES ──────────────────────────────────────────────────────────
    for (const panel of panels) {
      const bleed = panel.bleedInches
      const totalWidthIn = panel.widthInches + bleed * 2
      const totalHeightIn = panel.heightInches + bleed * 2

      const pageWidth = totalWidthIn * 72
      const pageHeight = totalHeightIn * 72
      const bleedPts = bleed * 72

      doc.addPage({ size: [pageWidth, pageHeight], margins: { top: 0, bottom: 0, left: 0, right: 0 } })

      doc.rect(0, 0, pageWidth, pageHeight).fill('#ffffff')

      if (panel.imageBase64) {
        try {
          const imgData = panel.imageBase64.replace(/^data:image\/\w+;base64,/, '')
          const imgBuffer = Buffer.from(imgData, 'base64')
          const pngBuffer = await sharp(imgBuffer).png().toBuffer()
          doc.image(pngBuffer, 0, 0, { width: pageWidth, height: pageHeight })
        } catch (imgError) {
          console.error('Image embed error:', imgError)
          doc.rect(0, 0, pageWidth, pageHeight).fill('#cccccc')
          doc.fillColor('#666666').fontSize(14).text('IMAGE ERROR', pageWidth / 2 - 50, pageHeight / 2)
        }
      }

      // Crop marks + trim box
      const strokeColor = '#FF00FF'
      doc.strokeColor(strokeColor).lineWidth(0.5)
      doc.rect(bleedPts, bleedPts, panel.widthInches * 72, panel.heightInches * 72).stroke()

      const markLen = 18
      const markOffset = 4
      const trimRight = bleedPts + panel.widthInches * 72
      const trimBottom = bleedPts + panel.heightInches * 72

      // Top-left
      doc.moveTo(bleedPts - markOffset, bleedPts).lineTo(bleedPts - markOffset - markLen, bleedPts).stroke()
      doc.moveTo(bleedPts, bleedPts - markOffset).lineTo(bleedPts, bleedPts - markOffset - markLen).stroke()
      // Top-right
      doc.moveTo(trimRight + markOffset, bleedPts).lineTo(trimRight + markOffset + markLen, bleedPts).stroke()
      doc.moveTo(trimRight, bleedPts - markOffset).lineTo(trimRight, bleedPts - markOffset - markLen).stroke()
      // Bottom-left
      doc.moveTo(bleedPts - markOffset, trimBottom).lineTo(bleedPts - markOffset - markLen, trimBottom).stroke()
      doc.moveTo(bleedPts, trimBottom + markOffset).lineTo(bleedPts, trimBottom + markOffset + markLen).stroke()
      // Bottom-right
      doc.moveTo(trimRight + markOffset, trimBottom).lineTo(trimRight + markOffset + markLen, trimBottom).stroke()
      doc.moveTo(trimRight, trimBottom + markOffset).lineTo(trimRight, trimBottom + markOffset + markLen).stroke()

      if (bleedPts >= 24) {
        doc.fillColor('#000000').fontSize(8).font('Helvetica-Bold')
           .text(
             `${panel.name.toUpperCase()} — ${panel.widthInches}" × ${panel.heightInches}" | ${jobId}`,
             bleedPts, 4, { width: panel.widthInches * 72 }
           )
      }
    }

    doc.end()

    await new Promise<void>((resolve) => { doc.on('end', resolve) })

    const pdfBuffer = Buffer.concat(chunks)

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="wrap-print-${jobId}-${Date.now()}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('PDF export error:', error)
    return NextResponse.json({ error: 'PDF generation failed', details: String(error) }, { status: 500 })
  }
}
