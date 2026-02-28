export const calcImpressions = (miles: number, sqft: number): number => {
  const sqftMult = sqft > 500 ? 1.3 : sqft > 350 ? 1.15 : 1.0
  return Math.round(miles * 2800 * sqftMult)
}

export const calcAnnualCPM = (wrapSqft: number, annualImpressions: number): string => {
  if (annualImpressions === 0) return '0.0000'
  return ((wrapSqft * 8.5) / (annualImpressions / 1000)).toFixed(4)
}

export const fmtImpressions = (n: number): string => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return n.toString()
}
