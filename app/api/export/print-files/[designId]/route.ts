import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { splitPanel } from '@/lib/utils/panel-splitter'
import panelDimensions from '@/lib/data/panel-dimensions.json'
import type { PanelDef } from '@/lib/utils/panel-splitter'

type VehicleKey = keyof typeof panelDimensions

interface ExportBody {
  selectedPanels: string[]
  materialType: 'cast' | 'cut'
  vehicleClass: VehicleKey
  exportOptions: {
    individualPanels: boolean
    combinedFile: boolean
    productionBrief: boolean
    customerProof: boolean
    materialCutList: boolean
  }
}

export async function POST(req: NextRequest, { params }: { params: { designId: string } }) {
  try {
    const supabase = getSupabaseAdmin()
    const body: ExportBody = await req.json()
    const { selectedPanels, materialType, vehicleClass, exportOptions } = body
    const { designId } = params

    // Fetch design
    const { data: design, error: designErr } = await supabase
      .from('design_projects')
      .select('*, linked_project:project_id(id, title, vehicle_desc, customer_name)')
      .eq('id', designId)
      .single()

    if (designErr || !design) {
      return NextResponse.json({ error: 'Design not found' }, { status: 404 })
    }

    const vehicleData = panelDimensions[vehicleClass]
    if (!vehicleData) {
      return NextResponse.json({ error: 'Invalid vehicle class' }, { status: 400 })
    }

    const selectedPanelDefs = vehicleData.panels.filter((p: PanelDef) =>
      selectedPanels.includes(p.id)
    ) as PanelDef[]

    if (selectedPanelDefs.length === 0) {
      return NextResponse.json({ error: 'No panels selected' }, { status: 400 })
    }

    // Build all strips
    const allStrips = selectedPanelDefs.map(panel => ({
      panel,
      strips: splitPanel(panel, materialType),
    }))

    // Dynamically import jsPDF and JSZip (server-side)
    const { jsPDF } = await import('jspdf')
    const JSZip = (await import('jszip')).default

    const zip = new JSZip()
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const jobName = design.client_name || design.linked_project?.title || 'Design'

    // ── Helper: generate strip PDF ──
    const generateStripPDF = (
      panel: PanelDef,
      stripNumber: number,
      totalStrips: number,
      printWidth: number,
      printHeight: number,
      watermark = false
    ): InstanceType<typeof jsPDF> => {
      // Page size: print area + 0.5" margins + marks
      const margin = 0.5
      const pageW = printWidth + margin * 2
      const pageH = printHeight + margin * 2

      const doc = new jsPDF({
        orientation: pageW > pageH ? 'landscape' : 'portrait',
        unit: 'in',
        format: [pageW, pageH],
      })

      // ── Background ──
      doc.setFillColor(255, 255, 255)
      doc.rect(0, 0, pageW, pageH, 'F')

      if (!watermark) {
        // ── Color bar at top (CMYK reference) ──
        const barH = 0.15
        const barColors = [
          [0, 0, 0], [255, 0, 0], [0, 255, 0], [0, 0, 255],
          [255, 255, 0], [0, 255, 255], [255, 0, 255], [128, 128, 128],
        ]
        const barW = pageW / barColors.length
        barColors.forEach((rgb, i) => {
          doc.setFillColor(rgb[0], rgb[1], rgb[2])
          doc.rect(i * barW, 0, barW, barH, 'F')
        })

        // ── File info ──
        doc.setFontSize(7)
        doc.setTextColor(100, 100, 100)
        doc.text(
          `JOB: ${jobName} | PANEL: ${panel.label} | STRIP: ${stripNumber}/${totalStrips} | DATE: ${dateStr} | MATERIAL: ${materialType.toUpperCase()}`,
          margin,
          barH + 0.1
        )

        // ── Crop marks ──
        const cmLen = 0.375
        const cmOffset = 0.0625
        const trimLeft = margin
        const trimRight = margin + printWidth
        const trimTop = barH + 0.25
        const trimBottom = trimTop + printHeight

        doc.setDrawColor(255, 0, 0)
        doc.setLineWidth(0.005)
        // Top-left
        doc.line(trimLeft - cmLen - cmOffset, trimTop, trimLeft - cmOffset, trimTop)
        doc.line(trimLeft, trimTop - cmLen - cmOffset, trimLeft, trimTop - cmOffset)
        // Top-right
        doc.line(trimRight + cmOffset, trimTop, trimRight + cmLen + cmOffset, trimTop)
        doc.line(trimRight, trimTop - cmLen - cmOffset, trimRight, trimTop - cmOffset)
        // Bottom-left
        doc.line(trimLeft - cmLen - cmOffset, trimBottom, trimLeft - cmOffset, trimBottom)
        doc.line(trimLeft, trimBottom + cmOffset, trimLeft, trimBottom + cmLen + cmOffset)
        // Bottom-right
        doc.line(trimRight + cmOffset, trimBottom, trimRight + cmLen + cmOffset, trimBottom)
        doc.line(trimRight, trimBottom + cmOffset, trimRight, trimBottom + cmLen + cmOffset)

        // ── Registration marks (center of each edge) ──
        const regSize = 0.2
        const regCx = (trimLeft + trimRight) / 2
        const regCy = (trimTop + trimBottom) / 2
        doc.setDrawColor(0, 0, 0)
        doc.setLineWidth(0.005)
        // Center circles
        doc.circle(regCx, trimTop - cmOffset - 0.1, regSize / 2)
        doc.circle(regCx, trimBottom + cmOffset + 0.1, regSize / 2)
        doc.circle(trimLeft - cmOffset - 0.1, regCy, regSize / 2)
        doc.circle(trimRight + cmOffset + 0.1, regCy, regSize / 2)
        // Crosshairs
        doc.line(regCx - regSize, trimTop - cmOffset - 0.1, regCx + regSize, trimTop - cmOffset - 0.1)
        doc.line(regCx, trimTop - cmOffset - 0.1 - regSize, regCx, trimTop - cmOffset - 0.1 + regSize)

        // ── Trim line (dashed red) ──
        doc.setDrawColor(255, 0, 0)
        doc.setLineWidth(0.01);
        (doc as any).setLineDash([0.1, 0.05]);
        doc.rect(trimLeft, trimTop, printWidth, printHeight);
        (doc as any).setLineDash([]);

        // ── Safe zone indicator ──
        const safeZone = 0.5
        doc.setDrawColor(0, 0, 255)
        doc.setLineWidth(0.005);
        (doc as any).setLineDash([0.05, 0.05]);
        doc.rect(trimLeft + safeZone, trimTop + safeZone, printWidth - safeZone * 2, printHeight - safeZone * 2);
        (doc as any).setLineDash([]);

        // ── Print area fill (light gray placeholder) ──
        doc.setFillColor(245, 245, 248)
        doc.rect(trimLeft + 0.125, trimTop + 0.125, printWidth - 0.25, printHeight - 0.25, 'F')

        // ── Panel info in print area ──
        doc.setFontSize(14)
        doc.setTextColor(150, 150, 160)
        doc.text(`${panel.label}`, trimLeft + printWidth / 2, trimTop + printHeight / 2 - 0.15, { align: 'center' })
        doc.setFontSize(9)
        doc.text(`Strip ${stripNumber} of ${totalStrips}`, trimLeft + printWidth / 2, trimTop + printHeight / 2 + 0.1, { align: 'center' })
        doc.setFontSize(8)
        doc.text(`Print size: ${printWidth.toFixed(3)}" × ${printHeight.toFixed(3)}" (includes bleed)`, trimLeft + printWidth / 2, trimTop + printHeight / 2 + 0.3, { align: 'center' })
        doc.setFontSize(7)
        doc.setTextColor(200, 100, 100)
        doc.text('PLACE ARTWORK HERE — CMYK', trimLeft + printWidth / 2, trimTop + printHeight / 2 + 0.5, { align: 'center' })
      } else {
        // Customer proof — no marks, with watermark
        doc.setFillColor(240, 242, 248)
        doc.rect(0, 0, pageW, pageH, 'F')

        doc.setFontSize(14)
        doc.setTextColor(150, 150, 160)
        doc.text(panel.label, pageW / 2, pageH / 2 - 0.2, { align: 'center' })
        doc.setFontSize(9)
        doc.text(`Strip ${stripNumber} of ${totalStrips}`, pageW / 2, pageH / 2 + 0.1, { align: 'center' })

        // Diagonal watermark
        doc.setFontSize(28)
        doc.setTextColor(220, 220, 230)
        doc.text('PROOF ONLY — NOT FOR REPRODUCTION', pageW / 2, pageH / 2, {
          align: 'center',
          angle: 45,
        })

        // Footer
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 160)
        doc.text('PROOF ONLY — NOT FOR REPRODUCTION', pageW / 2, pageH - 0.2, { align: 'center' })
      }

      return doc
    }

    // ── Generate individual panel PDFs ──
    if (exportOptions.individualPanels) {
      const panelFolder = zip.folder('panels')!
      for (const { panel, strips } of allStrips) {
        for (const strip of strips) {
          const doc = generateStripPDF(panel, strip.stripNumber, strip.totalStrips, strip.printWidth, strip.printHeight)
          const pdfBytes = doc.output('arraybuffer')
          panelFolder.file(`${strip.filename}.pdf`, pdfBytes)
        }
      }
    }

    // ── Generate combined PDF ──
    if (exportOptions.combinedFile) {
      const combinedDoc = new jsPDF({ unit: 'in', format: 'letter' })

      // Cover page
      combinedDoc.setFontSize(24)
      combinedDoc.setTextColor(20, 20, 40)
      combinedDoc.text('PRINT PRODUCTION PACKAGE', 4.25, 2, { align: 'center' })
      combinedDoc.setFontSize(16)
      combinedDoc.text(jobName, 4.25, 2.6, { align: 'center' })
      combinedDoc.setFontSize(11)
      combinedDoc.setTextColor(100, 100, 120)
      combinedDoc.text(`Vehicle: ${vehicleData.label}`, 4.25, 3.2, { align: 'center' })
      combinedDoc.text(`Material: ${materialType === 'cast' ? 'Cast Vinyl (53.5" max width)' : 'Cut Vinyl (51.5" max width)'}`, 4.25, 3.5, { align: 'center' })
      combinedDoc.text(`Total panels: ${selectedPanelDefs.length}`, 4.25, 3.8, { align: 'center' })
      combinedDoc.text(`Total strips: ${allStrips.reduce((t, p) => t + p.strips.length, 0)}`, 4.25, 4.1, { align: 'center' })
      combinedDoc.text(`Date: ${dateStr}`, 4.25, 4.4, { align: 'center' })

      // Add each strip as a page
      for (const { panel, strips } of allStrips) {
        for (const strip of strips) {
          combinedDoc.addPage([strip.printWidth + 1, strip.printHeight + 1], strip.printWidth > strip.printHeight ? 'landscape' : 'portrait')
          // Minimal info on combined pages
          combinedDoc.setFontSize(10)
          combinedDoc.setTextColor(100)
          combinedDoc.text(`${panel.label} — Strip ${strip.stripNumber}/${strip.totalStrips}`, 0.5, 0.4)
          combinedDoc.setFillColor(240, 240, 248)
          combinedDoc.rect(0.5, 0.6, strip.printWidth, strip.printHeight, 'F')
          combinedDoc.setDrawColor(200, 0, 0)
          combinedDoc.setLineWidth(0.008);
          (combinedDoc as any).setLineDash([0.08, 0.04]);
          combinedDoc.rect(0.5, 0.6, strip.printWidth, strip.printHeight);
          (combinedDoc as any).setLineDash([]);
        }
      }

      const combinedBytes = combinedDoc.output('arraybuffer')
      zip.file('combined-print-package.pdf', combinedBytes)
    }

    // ── Production Brief PDF ──
    if (exportOptions.productionBrief) {
      const briefDoc = new jsPDF({ unit: 'in', format: 'letter' })
      briefDoc.setFontSize(20)
      briefDoc.setTextColor(20, 20, 40)
      briefDoc.text('PRODUCTION BRIEF', 4.25, 1, { align: 'center' })

      briefDoc.setFontSize(11)
      briefDoc.setTextColor(60, 60, 80)
      const briefLines = [
        ['Job', jobName],
        ['Vehicle', vehicleData.label],
        ['Material', materialType === 'cast' ? 'Cast Vinyl' : 'Cut Vinyl'],
        ['Max Width', materialType === 'cast' ? '53.5"' : '51.5"'],
        ['Bleed', '0.125" all sides'],
        ['Seam Overlap', '0.5"'],
        ['Color Mode', 'CMYK'],
        ['Target DPI', '300 DPI'],
        ['Min DPI', '150 DPI'],
        ['Date', dateStr],
      ]
      let y = 1.8
      briefLines.forEach(([k, v]) => {
        briefDoc.setTextColor(100, 100, 120)
        briefDoc.text(k, 1, y)
        briefDoc.setTextColor(20, 20, 40)
        briefDoc.text(v, 3.5, y)
        y += 0.3
      })

      y += 0.3
      briefDoc.setFontSize(13)
      briefDoc.setTextColor(20, 20, 40)
      briefDoc.text('PANEL BREAKDOWN', 1, y)
      y += 0.3

      briefDoc.setFontSize(9)
      allStrips.forEach(({ panel, strips }) => {
        briefDoc.setTextColor(40, 40, 80)
        briefDoc.text(`${panel.label}  (${panel.width}" × ${panel.height}" · ${panel.sqft} sqft)`, 1, y)
        y += 0.22
        strips.forEach(strip => {
          briefDoc.setTextColor(100, 100, 120)
          briefDoc.text(
            `  Strip ${strip.stripNumber}/${strip.totalStrips}: ${strip.printWidth.toFixed(2)}" × ${strip.printHeight.toFixed(2)}" (w/ bleed)  ${strip.hasTopOverlap ? '↑0.5" overlap ' : ''}${strip.hasBottomOverlap ? '↓0.5" overlap' : ''}`,
            1.2, y
          )
          y += 0.2
          if (y > 10) { briefDoc.addPage(); y = 1 }
        })
        y += 0.1
      })

      const briefBytes = briefDoc.output('arraybuffer')
      zip.file('production-brief.pdf', briefBytes)
    }

    // ── Customer Proof PDF ──
    if (exportOptions.customerProof) {
      const proofDoc = new jsPDF({ unit: 'in', format: 'letter' })
      let firstPage = true
      for (const { panel, strips } of allStrips) {
        for (const strip of strips) {
          if (!firstPage) proofDoc.addPage([strip.printWidth + 1, strip.printHeight + 1])
          // Add watermarked panel placeholder
          proofDoc.setFillColor(240, 240, 248)
          proofDoc.rect(0.5, 0.5, Math.min(strip.printWidth, 7.5), Math.min(strip.printHeight, 10), 'F')
          proofDoc.setFontSize(14)
          proofDoc.setTextColor(150, 150, 170)
          proofDoc.text(panel.label, 4.25, 5, { align: 'center' })
          proofDoc.setFontSize(22)
          proofDoc.setTextColor(210, 215, 230)
          proofDoc.text('PROOF ONLY', 4.25, 6, { align: 'center', angle: 30 })
          proofDoc.setFontSize(8)
          proofDoc.setTextColor(160, 160, 180)
          proofDoc.text('NOT FOR REPRODUCTION', 4.25, 10.5, { align: 'center' })
          firstPage = false
        }
      }
      const proofBytes = proofDoc.output('arraybuffer')
      zip.file('customer-proof.pdf', proofBytes)
    }

    // ── Material Cut List ──
    if (exportOptions.materialCutList) {
      let cutList = `MATERIAL CUT LIST\n`
      cutList += `Job: ${jobName}\n`
      cutList += `Date: ${dateStr}\n`
      cutList += `Material: ${materialType === 'cast' ? 'Cast Vinyl (53.5" max width)' : 'Cut Vinyl (51.5" max width)'}\n`
      cutList += `Vehicle: ${vehicleData.label}\n\n`
      cutList += `${'PANEL'.padEnd(35)} ${'STRIP'.padEnd(10)} ${'WIDTH'.padEnd(10)} ${'HEIGHT'.padEnd(10)} SQFT\n`
      cutList += `${'-'.repeat(80)}\n`

      let totalLF = 0
      let totalSqft = 0
      for (const { panel, strips } of allStrips) {
        for (const strip of strips) {
          cutList += `${strip.panelLabel.padEnd(35)} ${`${strip.stripNumber}/${strip.totalStrips}`.padEnd(10)} ${strip.printWidth.toFixed(2).padEnd(10)} ${strip.printHeight.toFixed(2).padEnd(10)} ${strip.sqft.toFixed(2)}\n`
          totalLF += strip.printWidth / 12
          totalSqft += strip.sqft
        }
      }
      cutList += `${'-'.repeat(80)}\n`
      cutList += `TOTALS: ${allStrips.reduce((t, p) => t + p.strips.length, 0)} strips | ${totalLF.toFixed(2)} linear feet | ${totalSqft.toFixed(2)} sqft\n`

      zip.file('material-cut-list.txt', cutList)
    }

    // ── Generate ZIP ──
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${jobName.replace(/[^a-z0-9]/gi, '-')}-print-files.zip"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    })
  } catch (err: any) {
    console.error('[print-files export error]', err)
    return NextResponse.json({ error: err.message || 'Export failed' }, { status: 500 })
  }
}
