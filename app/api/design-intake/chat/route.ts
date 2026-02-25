import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  try {
    const { token, message, chatHistory } = await req.json()

    if (!token || !message) {
      return NextResponse.json({ error: 'Token and message required' }, { status: 400 })
    }

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({
        reply: "I'm not available right now, but our team will review your intake and reach out soon!",
      })
    }

    const admin = getSupabaseAdmin()

    // Load intake session data for context
    const { data: session } = await admin.from('design_intake_sessions')
      .select('*')
      .eq('token', token)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const services = (session.services_selected || []).join(', ') || 'not specified'
    const vehicleInfo = session.vehicle_data ? JSON.stringify(session.vehicle_data) : 'none'
    const brandInfo = session.brand_data ? JSON.stringify(session.brand_data) : 'none'

    const systemPrompt = `You are a friendly, creative design concierge for USA Wrap Co, a premium vehicle wrap and branding company based in Washington state. You are helping ${session.contact_name || 'a client'} with their ${services} project.

Context from their intake:
- Business: ${session.business_name || 'not provided'}
- Services requested: ${services}
- Vehicle info: ${vehicleInfo}
- Brand info: ${brandInfo}

Your job is to ask smart follow-up questions to deeply understand their vision. Be warm, professional, creative, and encouraging. Keep responses concise - 2-3 sentences max. Ask one question at a time.

Based on their selected services:
- If vehicle wrap: ask about coverage preference (full/partial/spot), color change vs printed, any text/phone numbers to include
- If logo design: ask about style preferences, competitors they do NOT want to look like, adjectives that describe the brand
- If trailer/fleet: ask about viewing distance, primary use (events, road, parked), lighting conditions
- If marine/boat: ask about viewing conditions, hull vs deck coverage

Always ask about:
- "What's the ONE thing you want people to feel when they see this design?"
- "Any colors or styles you absolutely want to avoid?"
- "Do you have a deadline or event coming up?"

After 4-6 exchanges, wrap up naturally by saying something like: "Perfect - I have everything I need to brief our design team. One last thing..." then guide them to complete the style preference screen.`

    // Build messages for Claude
    const messages = (chatHistory || []).map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }))
    messages.push({ role: 'user', content: message })

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6-20250514',
        max_tokens: 300,
        system: systemPrompt,
        messages,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('[design-intake/chat] Claude error:', errText)
      return NextResponse.json({
        reply: "I'm having a moment - could you try that again?",
      })
    }

    const data = await response.json()
    const reply = data.content?.[0]?.text || "Could you tell me more about that?"

    // Save updated chat history
    const now = new Date().toISOString()
    const updatedHistory = [
      ...(session.ai_chat_history || []),
      { role: 'user', content: message, timestamp: now },
      { role: 'assistant', content: reply, timestamp: now },
    ]

    await admin.from('design_intake_sessions')
      .update({ ai_chat_history: updatedHistory, updated_at: now })
      .eq('token', token)

    return NextResponse.json({ reply })
  } catch (err) {
    console.error('[design-intake/chat] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
