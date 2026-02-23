import { NextRequest, NextResponse } from 'next/server'
import { jsPDF } from 'jspdf'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      designId,
      panels = [],
      vehicleType = 'Unknown Vehicle',
      totalSqft = 0,
      options = {},
    } = body

    // Generate a professional Production Brief PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter',
    })

    const pageW = 215.9
    const pageH = 279.4
    const margin = 15
    let y = margin

    // ── Header ──
    doc.setFillColor(13, 15, 20)
    doc.rect(0, 0, pageW, 40, 'F')

    doc.setTextColor(79, 127, 255)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('USA WRAP CO', margin, 20)

    doc.setTextColor(232, 234, 237)
    doc.setFontSize(14)
    doc.text('Production Brief', margin, 30)

    doc.setTextColor(90, 96, 128)
    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, pageW - margin - 60, 20)
    doc.text(`Design ID: ${designId?.slice(-8) || 'N/A'}`, pageW - margin - 60, 28)

    y = 50

    // ── Vehicle Info ──
    doc.setTextColor(79, 127, 255)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('VEHICLE & COVERAGE', margin, y)
    y += 6

    doc.setDrawColor(79, 127, 255)
    doc.setLineWidth(0.5)
    doc.line(margin, y, pageW - margin, y)
    y += 6

    doc.setTextColor(232, 234, 237)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Vehicle Type: ${vehicleType}`, margin, y)
    y += 6
    doc.text(`Total Sqft to Order: ${totalSqft} sqft`, margin, y)
    y += 6
    doc.text(`Number of Panels: ${panels.length}`, margin, y)
    y += 10

    // ── Panel List ──
    if (panels.length > 0) {
      doc.setTextColor(79, 127, 255)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('PANEL DETAILS', margin, y)
      y += 6

      doc.setDrawColor(79, 127, 255)
      doc.line(margin, y, pageW - margin, y)
      y += 6

      // Table header
      doc.setFillColor(19, 21, 28)
      doc.rect(margin, y - 2, pageW - margin * 2, 8, 'F')
      doc.setTextColor(90, 96, 128)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('#', margin + 2, y + 4)
      doc.text('Panel Name', margin + 10, y + 4)
      doc.text('Notes', margin + 80, y + 4)
      y += 10

      panels.forEach((panel: string, i: number) => {
        if (y > pageH - 30) {
          doc.addPage()
          y = margin + 10
        }
        doc.setTextColor(232, 234, 237)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.text(String(i + 1), margin + 2, y)
        doc.text(panel, margin + 10, y)
        doc.text('—', margin + 80, y)
        y += 7
      })
      y += 6
    }

    // ── Print Specs ──
    if (y > pageH - 60) {
      doc.addPage()
      y = margin + 10
    }

    doc.setTextColor(79, 127, 255)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('PRINT SPECIFICATIONS', margin, y)
    y += 6

    doc.setDrawColor(79, 127, 255)
    doc.line(margin, y, pageW - margin, y)
    y += 6

    const specs = [
      ['Material Width', '54 inches'],
      ['Bleed', '0.125" all sides'],
      ['Minimum Resolution', '150 DPI at print size'],
      ['Color Mode', 'CMYK'],
      ['Overlaminate', 'Yes — specify type'],
      ['Total Print Panels', String(Math.max(1, Math.ceil(totalSqft / 30)))],
    ]

    doc.setTextColor(232, 234, 237)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    specs.forEach(([label, value]) => {
      doc.setTextColor(90, 96, 128)
      doc.text(label + ':', margin, y)
      doc.setTextColor(232, 234, 237)
      doc.text(value, margin + 55, y)
      y += 7
    })

    y += 6

    // ── Install Notes ──
    if (y > pageH - 50) {
      doc.addPage()
      y = margin + 10
    }

    doc.setTextColor(79, 127, 255)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('INSTALL NOTES', margin, y)
    y += 6

    doc.setDrawColor(79, 127, 255)
    doc.line(margin, y, pageW - margin, y)
    y += 8

    const installNotes = [
      '1. Clean all surfaces with isopropyl alcohol (70%+) before installation',
      '2. Install in temperature range 60°F – 90°F (15°C – 32°C)',
      '3. Use heat gun for complex curves and recesses',
      '4. Avoid installing in direct sunlight — work in shade or indoors',
      '5. Allow 24 hours cure time before washing',
      '6. Apply edge sealer to all cut edges',
    ]

    doc.setTextColor(232, 234, 237)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    installNotes.forEach(note => {
      if (y > pageH - 20) { doc.addPage(); y = margin + 10 }
      const lines = doc.splitTextToSize(note, pageW - margin * 2)
      doc.text(lines, margin, y)
      y += lines.length * 5 + 3
    })

    // ── Footer ──
    const totalPages = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFillColor(13, 15, 20)
      doc.rect(0, pageH - 10, pageW, 10, 'F')
      doc.setTextColor(90, 96, 128)
      doc.setFontSize(8)
      doc.text('USA Wrap Co — Production Brief — Confidential', margin, pageH - 3)
      doc.text(`Page ${i} of ${totalPages}`, pageW - margin - 20, pageH - 3)
    }

    // Return PDF as bytes
    const pdfBytes = doc.output('arraybuffer')
    const buffer = Buffer.from(pdfBytes)

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="production-brief-${designId?.slice(-8) || 'export'}.pdf"`,
        'Content-Length': String(buffer.length),
      },
    })
  } catch (err: any) {
    console.error('export-design error:', err)
    return NextResponse.json({ error: err.message || 'Export failed' }, { status: 500 })
  }
}
