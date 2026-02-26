import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { receipt_url } = body

  if (!receipt_url) return NextResponse.json({ error: 'receipt_url required' }, { status: 400 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 503 })

  let extracted: any = {}
  try {
    // Dynamically import to avoid build-time instantiation
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const anthropic = new Anthropic({ apiKey })

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'url', url: receipt_url },
          },
          {
            type: 'text',
            text: `Extract the following from this receipt image and return ONLY valid JSON (no markdown):
{
  "merchant_name": "store or vendor name",
  "date": "YYYY-MM-DD format",
  "amount": 0.00,
  "category": "one of: fuel, tools, supplies, materials, parking, tolls, meals, lodging, uniform, training, other",
  "description": "brief description of what was purchased",
  "payment_method": "one of: personal_card, cash, company_card, other"
}
If you cannot determine a field, use null.`,
          },
        ],
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
    // Strip markdown code fences if present
    const clean = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    extracted = JSON.parse(clean)
  } catch (err: any) {
    console.error('Receipt scan error:', err)
    return NextResponse.json({ error: 'Failed to extract receipt data', details: err.message }, { status: 500 })
  }

  return NextResponse.json({ extracted, ai_extracted: true })
}
