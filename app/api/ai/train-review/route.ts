import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getSupabaseAdmin()
    const { data: profile } = await admin
      .from('profiles')
      .select('role, org_id, name')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
    }

    const { instruction, answers } = await req.json()
    if (!instruction?.trim()) {
      return NextResponse.json({ error: 'Instruction text is required' }, { status: 400 })
    }

    const systemPrompt = `You are an AI instruction optimizer for V.I.N.Y.L., a business AI assistant for a vehicle wrap shop (USA Wrap Co).

Your job is to evaluate training instructions that the business owner writes for V.I.N.Y.L. and either improve them or ask clarifying questions.

Rules:
- Instructions should be specific, actionable, and clear
- They tell V.I.N.Y.L. how to behave, what to watch for, or what to prioritize
- Good examples: "Always flag estimates over $5,000 that haven't been followed up in 48 hours", "When summarizing the pipeline, group by install week"
- Bad examples: "Be better", "Do good things" (too vague)

You MUST respond with valid JSON only, no markdown, no code fences.

If the instruction is clear and actionable:
{"type":"improved","improved":"<your optimized version>","explanation":"<brief explanation of what you changed and why>"}

If the instruction is vague or ambiguous and you need more info:
{"type":"question","questions":["<question 1>","<question 2>"]}

Keep improvements concise. Max 2 questions if asking.`

    const userMessage = answers
      ? `Original instruction: "${instruction}"\n\nThe owner provided these answers to your questions:\n${answers}\n\nNow produce an improved, finalized instruction based on their answers.`
      : `Please review this training instruction for V.I.N.Y.L.:\n\n"${instruction}"`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!res.ok) {
      console.error('[train-review] Anthropic error:', await res.text())
      return NextResponse.json({ error: 'AI request failed' }, { status: 500 })
    }

    const aiData = await res.json()
    const text = aiData.content?.[0]?.text ?? ''

    try {
      const parsed = JSON.parse(text)
      return NextResponse.json(parsed)
    } catch {
      return NextResponse.json({
        type: 'improved',
        improved: instruction.trim(),
        explanation: 'Could not parse AI response. Using original instruction.',
      })
    }
  } catch (err: any) {
    console.error('[train-review] error:', err)
    return NextResponse.json({ error: err.message || 'Review failed' }, { status: 500 })
  }
}
