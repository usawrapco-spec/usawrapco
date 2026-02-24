import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: Request) {
  try {
    const { entryId, notes, jobId, durationMinutes } = await req.json()
    if (!notes) return NextResponse.json({ summary: '' })

    const admin = getSupabaseAdmin()

    // Get job context if available
    let jobContext = ''
    if (jobId) {
      const { data: job } = await admin
        .from('projects')
        .select('title, vehicle_desc, type, pipe_stage')
        .eq('id', jobId)
        .single()
      if (job) {
        jobContext = `Job: ${job.title} (${job.type}, ${job.vehicle_desc || 'N/A'}). Stage: ${job.pipe_stage}.`
      }
    }

    const hours = Math.floor((durationMinutes || 0) / 60)
    const mins = (durationMinutes || 0) % 60

    // Call Claude for summary
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ summary: notes }) // fallback to raw notes
    }

    const anthropic = new Anthropic({ apiKey })
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: 'You are a professional work log summarizer for a vehicle wrap shop. Clean up employee notes into concise, professional bullet points. Keep it brief (2-4 bullets max).',
      messages: [{
        role: 'user',
        content: `Time logged: ${hours}h ${mins}m. ${jobContext}\nEmployee notes: "${notes}"\n\nGenerate a clean professional summary.`
      }]
    })

    const summary = message.content[0].type === 'text' ? message.content[0].text : notes

    // Save summary to entry
    if (entryId) {
      await admin
        .from('time_clock_entries')
        .update({ ai_summary: summary })
        .eq('id', entryId)
    }

    return NextResponse.json({ summary })
  } catch (error: any) {
    return NextResponse.json({ summary: '', error: error.message }, { status: 200 })
  }
}
