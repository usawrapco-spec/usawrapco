import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const maxDuration = 30

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const { projectId, orgId, message, history = [], context } = await req.json()

    if (!message) {
      return NextResponse.json({ error: 'message required' }, { status: 400 })
    }

    const {
      title = '',
      stage = '',
      customerName = '',
      customerPhone = '',
      vehicleYear = '',
      vehicleMake = '',
      vehicleModel = '',
      designBrief = '',
      signoffConfirmed = false,
      installContact = {},
      productionData = {},
      installChecklist = {},
    } = context || {}

    const vehicle = [vehicleYear, vehicleMake, vehicleModel].filter(Boolean).join(' ') || 'Not set'
    const checklistDone = Object.values(installChecklist as Record<string, boolean>).filter(Boolean).length
    const checklistTotal = Object.keys(installChecklist as Record<string, boolean>).length

    const systemPrompt = `You are the Project Concierge for USA WRAP CO, an expert vehicle wrap shop AI assistant.

You are managing this specific job:
- Job: ${title}
- Stage: ${stage}
- Customer: ${customerName}${customerPhone ? ` (${customerPhone})` : ''}
- Vehicle: ${vehicle}
- Design Brief: ${designBrief ? `"${designBrief.slice(0, 200)}"` : 'NOT ENTERED'}
- Customer Scope Sign-off: ${signoffConfirmed ? 'SIGNED' : 'NOT SIGNED'}
- On-Site Contact: ${installContact.name ? `${installContact.name}, ${installContact.phone || 'no phone'}` : 'Not set'}
- Print Material: ${productionData.material_type || 'Not specified'}
- Laminate: ${productionData.laminate || 'Not specified'}
- Install Checklist: ${checklistDone}/${checklistTotal} items done

PIPELINE STAGES: sales_in → production → install → prod_review → sales_close → done

Your role:
- Help the team track this job, identify what's missing, draft communications, answer questions
- Be concise and direct — this is a fast-paced shop environment
- When drafting customer messages, keep them short and professional
- Flag risks proactively (missing info, upcoming deadlines, incomplete items)
- You know all departments: Sales, Design, Production, Install
- Never make up information — if you don't know something specific to this job, say so

Respond in plain text. Use short paragraphs. For lists use bullet points with "•".`

    const messages = [
      ...(history as { role: 'user' | 'assistant'; content: string }[]).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ]

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: systemPrompt,
      messages,
    })

    const content = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ content })
  } catch (err) {
    console.error('Project Concierge error:', err)
    return NextResponse.json({ error: 'AI error' }, { status: 500 })
  }
}
