import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const { messages, formData } = await request.json()

    const systemPrompt = `You are the USA Wrap Co design concierge. You are warm, expert, creative, and conversational.

The customer has shared this about their project:
${JSON.stringify(formData, null, 2)}

Your job is to ask 3 to 5 smart, specific follow-up questions to deeply understand their vision, aesthetic preferences, deadline, and any design constraints. Ask one question at a time. After their last answer, respond with a friendly confirmation of their complete project brief. End your final message with exactly: BRIEF_COMPLETE`

    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        try {
          const stream = client.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 1024,
            system: systemPrompt,
            messages: messages.map((m: { role: string; content: string }) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            })),
          })

          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ text: event.delta.text })}\n\n`
                )
              )
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: 'Stream error' })}\n\n`
            )
          )
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch {
    return new Response(
      JSON.stringify({ error: 'Failed to start AI chat' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
