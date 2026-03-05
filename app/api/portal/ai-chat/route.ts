import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// Tool definitions for agentic capabilities
const tools: Anthropic.Tool[] = [
  {
    name: 'request_quote',
    description: 'Submit a quote request for a new vehicle wrap or service. Use when the customer asks for a quote or wants to start a new project.',
    input_schema: {
      type: 'object' as const,
      properties: {
        vehicle_description: { type: 'string', description: 'Year, make, model of vehicle' },
        service_type: { type: 'string', description: 'Type of service: full_wrap, partial_wrap, color_change, commercial, etc.' },
        notes: { type: 'string', description: 'Additional notes from the customer' },
      },
      required: ['vehicle_description', 'service_type'],
    },
  },
  {
    name: 'update_address',
    description: 'Update the customer installation address. Use when the customer provides their address for a mobile install.',
    input_schema: {
      type: 'object' as const,
      properties: {
        address: { type: 'string', description: 'Full street address' },
      },
      required: ['address'],
    },
  },
  {
    name: 'request_schedule_change',
    description: 'Request a change to their installation schedule. Use when the customer wants to reschedule.',
    input_schema: {
      type: 'object' as const,
      properties: {
        preferred_dates: { type: 'string', description: 'Customer preferred dates/times' },
        reason: { type: 'string', description: 'Reason for the change' },
      },
      required: ['preferred_dates'],
    },
  },
]

export async function POST(req: NextRequest) {
  try {
    const { token, messages } = await req.json() as { token: string; messages: ChatMessage[] }
    if (!token || !messages?.length) {
      return NextResponse.json({ error: 'Missing token or messages' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    // Look up customer
    const { data: customer } = await admin
      .from('customers')
      .select('id, name, email, phone, company_name, org_id')
      .eq('portal_token', token)
      .single()

    if (!customer) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Fetch project context
    const { data: projects } = await admin
      .from('projects')
      .select('id, title, vehicle_desc, pipe_stage, install_date, revenue, type, is_mobile_install, install_address')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(5)

    // Fetch latest invoice
    const { data: invoices } = await admin
      .from('invoices')
      .select('total, status, due_date')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(3)

    // Build context
    const projectContext = (projects || []).map(p =>
      `- ${p.title}: ${p.vehicle_desc || 'N/A'} | Stage: ${p.pipe_stage} | Install: ${p.install_date || 'TBD'}`
    ).join('\n')

    const invoiceContext = (invoices || []).map(inv =>
      `- $${inv.total} (${inv.status}) ${inv.due_date ? `due ${inv.due_date}` : ''}`
    ).join('\n')

    const systemPrompt = `You are the USA Wrap Co AI assistant, helping ${customer.name || 'the customer'} with their vehicle wrap project.

ABOUT USA WRAP CO:
- Professional vehicle wrap shop in Gig Harbor, WA
- Services: full wraps, partial wraps, color changes, commercial fleet graphics, signs, apparel
- Contact: 253-525-8148, sales@usawrapco.com
- Address: 4124 124th St NW, Gig Harbor, WA 98332

CUSTOMER: ${customer.name}${customer.company_name ? ` (${customer.company_name})` : ''}

THEIR PROJECTS:
${projectContext || 'No active projects'}

INVOICES:
${invoiceContext || 'No invoices'}

GUIDELINES:
- Be friendly, professional, and concise
- Answer questions about wrap care, materials (3M, Avery), timelines, and pricing ranges
- For specific pricing, suggest they request a formal quote
- If they want to take an action (request quote, update address, reschedule), use the provided tools
- Keep responses under 200 words unless they need detailed info
- Never share internal pricing formulas or commission structures`

    // Call Claude with tools
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: systemPrompt,
      tools,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    })

    // Handle tool use
    let assistantText = ''
    let toolResults: string[] = []

    for (const block of response.content) {
      if (block.type === 'text') {
        assistantText += block.text
      } else if (block.type === 'tool_use') {
        const input = block.input as Record<string, string>

        if (block.name === 'request_quote') {
          // Create an estimate from the portal
          await admin.from('estimates').insert({
            org_id: customer.org_id,
            customer_id: customer.id,
            status: 'draft',
            source: 'portal_ai',
            notes: `AI quote request: ${input.vehicle_description} - ${input.service_type}. ${input.notes || ''}`,
          })
          toolResults.push(`Quote request submitted for ${input.vehicle_description} (${input.service_type}). The team will follow up shortly!`)
        } else if (block.name === 'update_address') {
          await admin.from('customers').update({ address: input.address }).eq('id', customer.id)
          await admin.from('projects')
            .update({ install_address: input.address })
            .eq('customer_id', customer.id)
            .eq('is_mobile_install', true)
            .is('install_address', null)
          toolResults.push(`Address updated to: ${input.address}`)
        } else if (block.name === 'request_schedule_change') {
          // Create a portal message for the team
          await admin.from('portal_messages').insert({
            customer_id: customer.id,
            sender_name: customer.name || 'Customer',
            body: `Schedule change request: Preferred dates: ${input.preferred_dates}. Reason: ${input.reason || 'Not specified'}`,
            direction: 'outbound',
            read: false,
          })
          toolResults.push(`Schedule change request sent to the team. Preferred: ${input.preferred_dates}`)
        }
      }
    }

    // If tools were used, append results to the response
    if (toolResults.length > 0) {
      assistantText += (assistantText ? '\n\n' : '') + toolResults.join('\n')
    }

    return NextResponse.json({
      role: 'assistant',
      content: assistantText || 'I understand. How else can I help you?',
    })
  } catch (err) {
    console.error('[portal/ai-chat]', err)
    return NextResponse.json({ error: 'AI service error' }, { status: 500 })
  }
}
