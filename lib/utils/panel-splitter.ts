export const ROLL_WIDTH = 54
export const MAX_WIDTH_CAST = 53.5
export const MAX_WIDTH_CUT = 51.5
export const BLEED = 0.125
export const SEAM_OVERLAP = 0.5
export const TARGET_DPI = 300
export const MIN_DPI = 150
export const SAFE_ZONE_FROM_EDGE = 0.5

export interface PanelDef {
  id: string
  label: string
  width: number
  height: number
  sqft: number
}

export interface PanelStrip {
  panelId: string
  panelLabel: string
  stripNumber: number
  totalStrips: number
  startY: number
  endY: number
  printWidth: number
  printHeight: number
  hasTopOverlap: boolean
  hasBottomOverlap: boolean
  sqft: number
  filename: string
}

export function splitPanel(panel: PanelDef, materialType: 'cast' | 'cut'): PanelStrip[] {
  const maxWidth = materialType === 'cast' ? MAX_WIDTH_CAST : MAX_WIDTH_CUT
  const overlap = SEAM_OVERLAP

  // Panel height becomes the print width (rolled horizontally)
  if (panel.height <= maxWidth) {
    return [{
      panelId: panel.id,
      panelLabel: panel.label,
      stripNumber: 1,
      totalStrips: 1,
      startY: 0,
      endY: panel.height,
      printWidth: panel.height + BLEED * 2,
      printHeight: panel.width + BLEED * 2,
      hasTopOverlap: false,
      hasBottomOverlap: false,
      sqft: panel.sqft,
      filename: `${panel.label.replace(/\s/g, '_')}_Strip_1of1`,
    }]
  }

  // Needs multiple strips
  const strips: PanelStrip[] = []
  let currentY = 0
  let stripNum = 1
  const usableWidth = maxWidth - overlap
  const totalStrips = Math.ceil(panel.height / usableWidth)

  while (currentY < panel.height) {
    const endY = Math.min(currentY + maxWidth, panel.height)
    const isFirst = stripNum === 1
    const isLast = endY >= panel.height

    const actualStartY = isFirst ? 0 : currentY - overlap
    const actualEndY = isLast ? panel.height : endY
    const stripHeight = actualEndY - actualStartY
    const stripSqft = (stripHeight * panel.width) / 144

    strips.push({
      panelId: panel.id,
      panelLabel: panel.label,
      stripNumber: stripNum,
      totalStrips,
      startY: actualStartY,
      endY: actualEndY,
      printWidth: stripHeight + BLEED * 2,
      printHeight: panel.width + BLEED * 2,
      hasTopOverlap: !isFirst,
      hasBottomOverlap: !isLast,
      sqft: stripSqft,
      filename: `${panel.label.replace(/\s/g, '_')}_Strip_${stripNum}of${totalStrips}`,
    })

    currentY = endY
    stripNum++
  }

  return strips
}

export function calculateLinearFeet(strips: PanelStrip[]): number {
  return strips.reduce((total, strip) => total + (strip.printWidth / 12), 0)
}

export function calculateMaterialCost(linearFeet: number, pricePerLinearFoot: number): number {
  return linearFeet * pricePerLinearFoot
}

export function getDpiStatus(canvasPx: number, printInches: number): {
  dpi: number
  status: 'good' | 'acceptable' | 'low'
  label: string
} {
  const dpi = Math.round(canvasPx / printInches)
  if (dpi >= TARGET_DPI) return { dpi, status: 'good', label: 'Production Ready' }
  if (dpi >= MIN_DPI) return { dpi, status: 'acceptable', label: 'Acceptable — minor quality loss' }
  return { dpi, status: 'low', label: 'Too low — increase canvas resolution' }
}
