import Anthropic from '@anthropic-ai/sdk'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: Request) {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const { projectId, project, recentMessages } = await req.json()
    if (!projectId && !project) return Response.json({ error: 'projectId required' }, { status: 400 })

    let proj = project
    if (!proj && projectId) {
      const admin = getSupabaseAdmin()
      const { data } = await admin.from('projects').select('*').eq('id', projectId).single()
      proj = data
    }

    if (!proj) return Response.json({ error: 'Project not found' }, { status: 404 })

    const fd = (proj.form_data as any) || {}
    const fin = (proj.fin_data as any) || {}

    const recentMsgsText = recentMessages
      ? (recentMessages as any[]).slice(0, 5).map((m: any) => '[' + m.channel + '] ' + m.content).join(' | ')
      : 'None'

    const prompt = 'You are an AI assistant for USA Wrap Co, a vehicle wrap shop CRM.\n\n' +
      'Analyze this job and provide a concise recap with actionable insights:\n\n' +
      'JOB INFO:\n' +
      '- Client: ' + (fd.client || proj.title || 'Unknown') + '\n' +
      '- Vehicle: ' + (fd.vehicle || proj.vehicle_desc || 'Not specified') + '\n' +
      '- Stage: ' + (proj.pipe_stage || 'sales_in') + '\n' +
      '- Agent: ' + (fd.agent || 'Unassigned') + '\n' +
      '- Installer: ' + (fd.installer || 'Unassigned') + '\n' +
      '- Install Date: ' + (fd.installDate || proj.install_date || 'Not scheduled') + '\n\n' +
      'FINANCIALS:\n' +
      '- Sale Price: $' + (proj.revenue || fin.sale || 0) + '\n' +
      '- Profit: $' + (proj.profit || fin.profit || 0) + '\n' +
      '- GPM: ' + (proj.gpm || fin.gpm || 0) + '%\n' +
      '- Lead Type: ' + (fd.leadType || 'inbound') + '\n\n' +
      'STATUS:\n' +
      '- Deposit: ' + (fd.deposit ? 'YES' : 'NO') + '\n' +
      '- Contract Signed: ' + (fd.contractSigned ? 'YES' : 'NO') + '\n' +
      '- Design Needed: ' + (fd.designNeeded ? 'YES' : 'NO') + '\n' +
      '- Design Status: ' + (fd.assetStatus || 'Unknown') + '\n\n' +
      'RECENT MESSAGES: ' + recentMsgsText + '\n\n' +
      'Provide a JSON response with these exact fields:\n' +
      '{\n' +
      '  "summary": "2-3 sentence summary of current job status",\n' +
      '  "next_best_action": "Single most important next step",\n' +
      '  "blockers": ["list", "of", "blockers"],\n' +
      '  "who_needs_to_respond": "person or team who needs to act now",\n' +
      '  "health": "green|yellow|red",\n' +
      '  "health_reason": "why this health score",\n' +
      '  "draft_customer_message": "suggested next message to send to customer"\n' +
      '}'

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const recap = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: text, health: 'yellow' }

    // Cache in DB if we have projectId
    if (projectId) {
      const admin = getSupabaseAdmin()
      await admin.from('ai_recaps').upsert({
        project_id: projectId,
        recap_data: recap,
        generated_at: new Date().toISOString(),
      }, { onConflict: 'project_id' }).then(() => {})
    }

    return Response.json({ recap })
  } catch (err) {
    console.error('[job-recap] error:', err)
    return Response.json({ error: 'AI unavailable' }, { status: 503 })
  }
}
