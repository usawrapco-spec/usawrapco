import { NextRequest, NextResponse } from 'next/server'
import { upscaleMockup, logHealth } from '@/lib/mockup/pipeline'

export async function POST(req: NextRequest) {
  const { mockup_id, concept_url, org_id } = await req.json()

  if (!mockup_id || !concept_url) {
    return NextResponse.json({ error: 'mockup_id and concept_url required' }, { status: 400 })
  }

  const orgId = org_id || 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

  try {
    const result = await upscaleMockup({ mockup_id, concept_url, org_id: orgId })
    return NextResponse.json(result)
  } catch (err: any) {
    await logHealth(orgId, 'mockup-upscale', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
