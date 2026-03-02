import { NextRequest, NextResponse } from 'next/server'
import { polishMockup, logHealth } from '@/lib/mockup/pipeline'

export async function POST(req: NextRequest) {
  const { mockup_id, composited_url, org_id } = await req.json()

  if (!mockup_id || !composited_url) {
    return NextResponse.json({ error: 'mockup_id and composited_url required' }, { status: 400 })
  }

  const orgId = org_id || 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

  try {
    const result = await polishMockup({ mockup_id, composited_url, org_id: orgId })
    return NextResponse.json(result)
  } catch (err: any) {
    await logHealth(orgId, 'mockup-polish', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
