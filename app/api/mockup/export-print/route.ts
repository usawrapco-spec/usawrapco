import { NextRequest, NextResponse } from 'next/server'
import { exportPrint, logHealth } from '@/lib/mockup/pipeline'

export async function POST(req: NextRequest) {
  const { mockup_id, upscaled_url, org_id } = await req.json()

  if (!mockup_id || !upscaled_url) {
    return NextResponse.json({ error: 'mockup_id and upscaled_url required' }, { status: 400 })
  }

  const orgId = org_id || 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

  try {
    const result = await exportPrint({ mockup_id, upscaled_url, org_id: orgId })
    return NextResponse.json(result)
  } catch (err: any) {
    await logHealth(orgId, 'export-print', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
