import { ORG_ID } from '@/lib/org'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      customer_id,
      org_id,
      services_requested,
      vehicle_year,
      vehicle_make,
      vehicle_model,
      is_same_vehicle,
      is_new_vehicle,
      urgency,
      budget_range,
      notes,
      photos,
    } = body

    const db = supabaseAdmin()

    let aiQuoteEstimate: number | null = null
    let aiQuoteReasoning: string | null = null

    // AI instant estimate from photos
    if (photos && photos.length > 0 && services_requested?.length > 0) {
      try {
        const Anthropic = (await import('@anthropic-ai/sdk')).default
        const client = new Anthropic()

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const imageContent: any[] = photos.slice(0, 4).map((url: string) => ({
          type: 'image',
          source: { type: 'url', url },
        }))

        const vehicleDesc = [vehicle_year, vehicle_make, vehicle_model].filter(Boolean).join(' ')
        const servicesStr = Array.isArray(services_requested)
          ? services_requested.map((s: string | { service_type: string }) =>
              typeof s === 'string' ? s : s.service_type
            ).join(', ')
          : String(services_requested)

        const response = await client.messages.create({
          model: 'claude-opus-4-6',
          max_tokens: 400,
          messages: [{
            role: 'user',
            content: [
              ...imageContent,
              {
                type: 'text',
                text: `You are an estimating expert for USA Wrap Co, a premium vehicle wrap shop in the Seattle/Pacific Northwest area.

A past customer wants new service on their ${vehicleDesc || 'vehicle'}.
Services requested: ${servicesStr}
${notes ? `Additional notes: ${notes}` : ''}

Analyze the vehicle photos and provide a rough price estimate. Consider:
- Vehicle size and complexity
- Any current wrap condition that may need removal/prep
- Services requested
- Pacific Northwest market pricing

Typical rates: full wrap $2,500-$5,000, partial $800-$2,000, PPF front $1,200-$2,500, PPF full $4,000-$8,000, window tint $250-$600, chrome delete $300-$600, DekWave decking $2,000-$5,000

Respond in JSON only:
{
  "estimate_low": 2500,
  "estimate_high": 4000,
  "reasoning": "Brief explanation (1-2 sentences)",
  "flags": []
}

flags options: "needs_surface_prep", "existing_wrap_removal", "custom_design", "expedited_pricing"`,
              },
            ],
          }],
        })

        const aiText = response.content[0].type === 'text' ? response.content[0].text : '{}'
        const jsonMatch = aiText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const aiData = JSON.parse(jsonMatch[0])
          // Store midpoint of range as estimate
          if (aiData.estimate_low && aiData.estimate_high) {
            aiQuoteEstimate = Math.round((aiData.estimate_low + aiData.estimate_high) / 2)
          }
          aiQuoteReasoning = aiData.reasoning || null
        }
      } catch (aiErr) {
        console.error('AI estimate failed:', aiErr)
      }
    }

    const { data: request, error } = await db
      .from('reorder_requests')
      .insert({
        customer_id,
        org_id: org_id || ORG_ID,
        services_requested: services_requested || [],
        vehicle_year,
        vehicle_make,
        vehicle_model,
        is_same_vehicle: is_same_vehicle || false,
        is_new_vehicle: is_new_vehicle || false,
        urgency: urgency || 'flexible',
        budget_range,
        notes,
        photos: photos || [],
        ai_quote_estimate: aiQuoteEstimate,
        ai_quote_reasoning: aiQuoteReasoning,
        status: 'pending',
      })
      .select('id, request_token')
      .single()

    if (error) {
      console.error('Reorder insert error:', error)
      return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })
    }

    // Notify customer
    if (customer_id) {
      await db.from('customer_notifications').insert({
        customer_id,
        type: 'new_service_available',
        title: 'Service request received!',
        message: `We got your request for ${Array.isArray(services_requested) ? services_requested.join(', ') : 'new service'}. We'll have a quote to you within 24 hours.`,
        action_url: '#reorder',
        action_label: 'View Request',
      })
    }

    return NextResponse.json({
      request_id: request?.id,
      request_token: request?.request_token,
      ai_quote_estimate: aiQuoteEstimate,
      ai_quote_reasoning: aiQuoteReasoning,
    })
  } catch (err) {
    console.error('Reorder POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const db = supabaseAdmin()

  let query = db
    .from('reorder_requests')
    .select(`
      *,
      customer:customer_id(id, name, email, phone)
    `)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ requests: data })
}
