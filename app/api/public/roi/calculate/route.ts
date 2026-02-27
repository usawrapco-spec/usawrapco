import { INDUSTRIES, CPM_COMPARISONS } from '@/lib/roi/constants'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      industry,
      avgJobValue,
      numVehicles = 1,
      primaryCity,
    } = body

    if (!industry) {
      return Response.json({ error: 'Industry required' }, { status: 400 })
    }

    const ind = INDUSTRIES.find(i => i.label === industry)
    const conversionRate = ind?.conversionRate || 0.010
    const avgLtv = avgJobValue || (ind ? Math.round((ind.ltvMin + ind.ltvMax) / 2) : 1000)

    // Base: 50k impressions/month per vehicle (industry standard)
    const monthlyImpressions = 50000 * numVehicles
    const dailyImpressions = Math.round(monthlyImpressions / 22)
    const yearlyImpressions = monthlyImpressions * 12

    // Leads = impressions * conversion rate
    const monthlyLeads = Math.round(monthlyImpressions * conversionRate)
    const monthlyRevenue = monthlyLeads * avgLtv
    const annualRevenue = monthlyRevenue * 12

    // ROI assuming $3,500 per wrap, 5 year lifespan
    const wrapCost = 3500 * numVehicles
    const fiveYearRevenue = annualRevenue * 5
    const roiMultiplier = wrapCost > 0 ? Math.round((fiveYearRevenue / wrapCost) * 10) / 10 : 0

    // CPM for wraps
    const monthlyCost = wrapCost / (5 * 12)
    const effectiveCPM = monthlyImpressions > 0
      ? Math.round((monthlyCost / (monthlyImpressions / 1000)) * 100) / 100
      : 0

    return Response.json({
      dailyImpressions,
      monthlyImpressions,
      yearlyImpressions,
      monthlyLeads,
      monthlyRevenue,
      annualRevenue,
      roiMultiplier,
      effectiveCPM,
      cpmComparisons: CPM_COMPARISONS,
      conversionRate,
    })
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }
}
