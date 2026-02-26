import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { prospect, step, campaign_name, industry } = await req.json()
  if (!prospect) return NextResponse.json({ error: 'prospect required' }, { status: 400 })

  const anthropic = new Anthropic()
  const stepDescriptions: Record<number, string> = {
    1: 'Cold intro — introduce our vehicle wrap services, mention their specific business type and location. Be personable and professional. Short paragraphs.',
    2: 'Follow-up — they haven\'t replied to our first email. Reference the first email, add value (mention a relevant case study or stat). Still friendly, not pushy.',
    3: 'Value add — share a specific benefit or case study relevant to their industry. Maybe mention a limited-time offer or fleet discount.',
    4: 'Final — this is the last email in the sequence. Create urgency without being aggressive. Offer an easy next step (reply, call, or click a link).',
  }

  const stepDesc = stepDescriptions[step || 1] || stepDescriptions[1]

  const prompt = `Write a professional but conversational cold outreach email for a vehicle wrap company.

Business we're emailing:
- Name: ${prospect.business_name || prospect.name || 'Business Owner'}
- Industry: ${industry || prospect.industry || 'local business'}
- Location: ${prospect.address || prospect.buyer_location || 'their area'}
- Website: ${prospect.website || 'N/A'}

Our company: USA Wrap Co — professional vehicle wraps, fleet graphics, color changes, PPF
Campaign: ${campaign_name || 'General Outreach'}
Email step: ${step || 1} of 4
Step instructions: ${stepDesc}

Rules:
- Subject line first (on its own line prefixed with "Subject: ")
- Then blank line
- Then email body in HTML (use <p> tags, keep it clean)
- Keep it under 150 words
- Include a clear CTA
- Don't be overly salesy
- Mention their business by name if known
- Sound like a real person, not a template
- End with a signature: Best, Kevin | USA Wrap Co | (253) 555-WRAP`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = (response.content[0] as any).text || ''
    const subjectMatch = text.match(/Subject:\s*(.+)/i)
    const subject = subjectMatch?.[1]?.trim() || `Vehicle Wraps for ${prospect.business_name || 'Your Fleet'}`
    const bodyStart = text.indexOf('\n', text.indexOf('Subject:'))
    const body = text.slice(bodyStart).trim()

    return NextResponse.json({ subject, body })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'AI failed' }, { status: 500 })
  }
}
