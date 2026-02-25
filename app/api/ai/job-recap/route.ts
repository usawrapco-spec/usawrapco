import Anthropic from '@anthropic-ai/sdk'
import { getSupabaseAdmin } from '@/lib/supabase/service'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  try {
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

    const prompt = `You are an AI assistant for USA Wrap Co, a vehicle wrap shop CRM.

Analyze this job and provide a concise recap with actionable insights:

JOB INFO:
- Client: ${fd.client || proj.title || 'Unknown'}
- Vehicle: ${fd.vehicle || proj.vehicle_desc || 'Not specified'}
- Stage: ${proj.pipe_stage || 'sales_in'}
- Agent: ${fd.agent || 'Unassigned'}
- Installer: ${fd.installer || 'Unassigned'}
- Install Date: ${fd.installDate || proj.install_date || 'Not scheduled'}

FINANCIALS:
- Sale Price: $${proj.revenue || fin.sale || 0}
- Profit: $${proj.profit || fin.profit || 0}
- GPM: ${proj.gpm || fin.gpm || 0}%
- Lead Type: ${fd.leadType || 'inbound'}

STATUS:
- Deposit: ${fd.deposit ? 'YES' : 'NO'}
- Contract Signed: ${fd.contractSigned ? 'YES' : 'NO'}
- Design Needed: ${fd.designNeeded ? 'YES' : 'NO'}
- Design Status: ${fd.assetStatus || 'Unknown'}

RECENT MESSAGES: ${recentMessages ? recentMessages.slice(0, 5).map((m: any) => `[${m.channel}] ${m.content}`).join(' | ') : 'None'}

Provide a JSON response with these exact fields:
{
  "summary": "2-3 sentence summary of current job status",
  "next_best_action": "Single most important next step",
  "blockers": ["list", "of", "blockers"],
  "who_needs_to_respond": "person or team who needs to act now",
  "health": "green|yellow|red",
  "health_reason": "why this health score",
  "draft_customer_message": "suggested next message to send to customer"
}`

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
