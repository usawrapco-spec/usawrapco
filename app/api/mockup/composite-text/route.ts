import { NextRequest, NextResponse } from 'next/server'
import { compositeText, logHealth } from '@/lib/mockup/pipeline'

export async function POST(req: NextRequest) {
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

  try {
    const result = await compositeText({
      mockup_id, template_id, artwork_url,
      company_name, tagline, phone, website,
      font_choice, brand_colors, org_id: orgId,
    })
    return NextResponse.json(result)
  } catch (err: any) {
    await logHealth(orgId, 'composite-text', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
