import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

// Allow calls from authenticated users OR internal server-to-server with INTERNAL_API_SECRET

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || ''
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || ''
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || ''
const STRIPE_PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''

async function sendSMS(to: string, body: string): Promise<string | null> {
  if (!TWILIO_ACCOUNT_SID || TWILIO_ACCOUNT_SID.startsWith('PLACEHOLDER')) {
    console.log('[VINYL] Quote SMS (demo):', { to, body: body.slice(0, 200) })
    return 'demo_sid_' + Date.now()
  }
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: TWILIO_PHONE_NUMBER, Body: body }),
    })
    const data = await res.json()
    return data.sid || null
  } catch { return null }
}

export async function POST(req: Request) {
  // Allow internal server-to-server calls or authenticated user calls
  const internalSecret = req.headers.get('x-internal-secret')
  if (!internalSecret || internalSecret !== process.env.INTERNAL_API_SECRET) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()
  const { conversation_id } = await req.json()

  if (!conversation_id) {
    return NextResponse.json({ error: 'conversation_id required' }, { status: 400 })
  }

  // Load conversation
  const { data: convo } = await admin.from('conversations')
    .select('*')
    .eq('id', conversation_id)
    .single()

  if (!convo) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })

  // Load pricing rules
  const { data: pricingRules } = await admin.from('pricing_rules')
    .select('*')
    .eq('org_id', convo.org_id)
    .eq('active', true)

  // Calculate quote from vehicle_info + wrap_preferences (stored in tags jsonb)
  const convoTags = (convo.tags as any) || {}
  const vehicleInfo = convoTags.vehicle_info || {}
  const prefs = convoTags.wrap_preferences || {}
  const vehicleCat = (vehicleInfo as any).category || (vehicleInfo as any).type || 'sedan'
  const wrapType = (prefs as any).wrap_type || 'full_wrap'

  // Find matching pricing rule
  const rule = (pricingRules || []).find((r: any) =>
    r.vehicle_category?.toLowerCase() === vehicleCat.toLowerCase() &&
    r.wrap_type?.toLowerCase() === wrapType.toLowerCase()
  )

  let basePrice = rule?.base_price || 3500 // Default full wrap price
  let sqft = (vehicleInfo as any).sqft || 0
  if (sqft > 0 && rule?.price_per_sqft) {
    basePrice = Math.max(basePrice, sqft * rule.price_per_sqft)
  }

  // Apply complexity multiplier
  const complexity = (prefs as any).complexity || 'standard'
  const complexityMult = rule?.complexity_multiplier?.[complexity] || 1
  const total = Math.round(basePrice * complexityMult)
  const deposit = 250

  // Store quote data
  const quoteData = {
    base_price: basePrice,
    complexity_multiplier: complexityMult,
    total,
    deposit,
    vehicle_category: vehicleCat,
    wrap_type: wrapType,
    created_at: new Date().toISOString(),
  }

  await admin.from('conversations').update({
    tags: { ...convoTags, quote_data: quoteData, lead_stage: 'quoting' },
    updated_at: new Date().toISOString(),
  }).eq('id', conversation_id)

  // Format message
  const depositUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://usawrapco.com'}/deposit?conversation_id=${conversation_id}&amount=${deposit}`
  const quoteMsg = `Here's your quote for a ${wrapType.replace('_', ' ')} on your ${vehicleCat}:\n\nTotal: $${total.toLocaleString()}\nDesign Deposit: $${deposit}\n\nReady to get started? Secure your spot with a $${deposit} design deposit:\n${depositUrl}\n\nQuestions? Just reply here!`

  // Send via appropriate channel
  if (convo.channel === 'sms' && convo.contact_phone) {
    await sendSMS(convo.contact_phone, quoteMsg)
  }

  // Log the quote message
  await admin.from('messages').insert({
    org_id: convo.org_id,
    conversation_id,
    direction: 'outbound',
    content: quoteMsg,
    channel: convo.channel,
    metadata: { ai_reasoning: `Auto-generated quote: $${total} for ${wrapType} on ${vehicleCat}`, ai_confidence: 1.0 },
  })

  return NextResponse.json({ success: true, quote: quoteData })
}
