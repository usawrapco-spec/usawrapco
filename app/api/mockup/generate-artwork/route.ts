import { NextRequest, NextResponse } from 'next/server'
import { generateArtwork, logHealth } from '@/lib/mockup/pipeline'

export async function POST(req: NextRequest) {
  const { mockup_id, ideogram_prompt, org_id } = await req.json()

  if (!mockup_id || !ideogram_prompt) {
    return NextResponse.json({ error: 'mockup_id and ideogram_prompt required' }, { status: 400 })
  }

  const orgId = org_id || 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

  if (!process.env.REPLICATE_API_TOKEN) {
    await logHealth(orgId, 'generate-artwork', 'REPLICATE_API_TOKEN not set')
    return NextResponse.json({ error: 'Replicate not configured' }, { status: 503 })
  }

  try {
    const result = await generateArtwork({ mockup_id, ideogram_prompt, org_id: orgId })
    return NextResponse.json(result)
  } catch (err: any) {
    await logHealth(orgId, 'generate-artwork', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
