export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, description, userName } = await req.json()

  const prompt = `You are the friendly AI guide for USA WRAP CO, a vehicle wrap shop CRM.
The user (${userName || 'new user'}) is viewing the tour step: "${title}".
Context: ${description}

Write a single enthusiastic 1-2 sentence narration (max 130 chars) that highlights the key benefit. Friendly, energetic, no emojis. Just the narration text, nothing else.`

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic()
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = (message.content[0] as any).text?.trim() || description
    return Response.json({ narration: text })
  } catch {
    return Response.json({ narration: description })
  }
}
