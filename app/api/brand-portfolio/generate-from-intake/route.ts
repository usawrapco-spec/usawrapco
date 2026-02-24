import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

// POST /api/brand-portfolio/generate-from-intake
// Reads a completed customer_intake record, runs AI brand analysis, creates brand_portfolio
export async function POST(req: NextRequest) {
  try {
    const { token, intakeId } = await req.json()
    if (!token && !intakeId) {
      return NextResponse.json({ error: 'token or intakeId required' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    // Fetch the intake record
    let query = admin.from('customer_intake').select('*')
    if (token) query = query.eq('token', token)
    else query = query.eq('id', intakeId)
    const { data: intake, error: intakeErr } = await query.single()
    if (intakeErr || !intake) {
      return NextResponse.json({ error: 'Intake not found' }, { status: 404 })
    }

    // Check if portfolio already exists for this project
    if (intake.project_id) {
      const { data: existing } = await admin
        .from('brand_portfolios')
        .select('id')
        .eq('project_id', intake.project_id)
        .single()
      if (existing) {
        return NextResponse.json({ portfolio_id: existing.id, existing: true })
      }
    }

    // Extract branding data from intake
    const brandingMeta = intake.branding_meta || {}
    const scraped = brandingMeta.scraped_data || {}

    const companyName = scraped.companyName || scraped.name || intake.customer_name || ''
    const websiteUrl = brandingMeta.website_url || ''
    const logoUrl = scraped.logoUrl || ''
    const rawColors = scraped.colors || []
    const brandColors = rawColors.map((c: any) => ({
      hex: typeof c === 'string' ? c : c.hex,
      name: c.name || '',
      usage: 'brand',
    }))
    const phone = scraped.phone || intake.customer_phone || ''
    const email = scraped.email || intake.customer_email || ''
    const services = scraped.services || []
    const aboutText = scraped.aboutText || ''
    const socialLinks = scraped.socialLinks || {}
    const tagline = scraped.tagline || ''
    const scrapedImages = scraped.images || []

    // Get org_id from the project
    let orgId: string | null = null
    if (intake.project_id) {
      const { data: project } = await admin
        .from('projects')
        .select('org_id')
        .eq('id', intake.project_id)
        .single()
      orgId = project?.org_id || null
    }

    // Run AI brand analysis if we have enough data
    let aiAnalysis: any = null
    let aiRecommendations: any = null

    if ((companyName || websiteUrl) && process.env.ANTHROPIC_API_KEY) {
      try {
        const analysisRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/analyze-brand`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName,
            url: websiteUrl,
            tagline,
            colors: brandColors,
            services,
            aboutText,
            phone,
            email,
            socialLinks,
            logoUrl,
          }),
        })
        if (analysisRes.ok) {
          const analysisJson = await analysisRes.json()
          if (analysisJson.analysis) {
            aiAnalysis = analysisJson.analysis
            aiRecommendations = {
              strengths: analysisJson.analysis.strengths || [],
              gaps: analysisJson.analysis.gaps || [],
              wrap_recommendation: analysisJson.analysis.wrap_recommendation || '',
              headline: analysisJson.analysis.headline || '',
            }
          }
        }
      } catch { /* non-fatal */ }
    }

    // Use AI-cleaned services if available
    const cleanServices: string[] = aiAnalysis?.clean_services?.length
      ? aiAnalysis.clean_services
      : services

    // Create the brand portfolio record
    const portfolioPayload: any = {
      org_id: orgId,
      project_id: intake.project_id || null,
      company_name: companyName,
      website_url: websiteUrl,
      logo_url: logoUrl,
      brand_colors: brandColors,
      tagline,
      phone,
      email,
      services: cleanServices,
      social_links: socialLinks,
      about_text: aboutText,
      scraped_images: scrapedImages,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (aiAnalysis) {
      portfolioPayload.ai_brand_analysis = aiAnalysis
    }
    if (aiRecommendations) {
      portfolioPayload.ai_recommendations = aiRecommendations
    }

    const { data: portfolio, error: insertErr } = await admin
      .from('brand_portfolios')
      .insert(portfolioPayload)
      .select()
      .single()

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 400 })
    }

    return NextResponse.json({ portfolio_id: portfolio.id, portfolio, existing: false })
  } catch (err: any) {
    console.error('generate-from-intake error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
