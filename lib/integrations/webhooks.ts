import { getSupabaseAdmin } from '@/lib/supabase/service'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

interface IntegrationConfig {
  api_key?: string
  location_id?: string
  webhook_url?: string
  channel?: string
  secret_key?: string
  account_sid?: string
  auth_token?: string
  from_number?: string
  [key: string]: string | undefined
}

async function getIntegrationConfig(orgId: string, integrationId: string): Promise<IntegrationConfig | null> {
  try {
    const admin = getSupabaseAdmin()
    const { data } = await admin
      .from('integrations')
      .select('config, enabled')
      .eq('org_id', orgId)
      .eq('integration_id', integrationId)
      .eq('enabled', true)
      .single()
    return data?.config || null
  } catch {
    return null
  }
}

// ── Slack ─────────────────────────────────────────────────────────
export async function notifySlack(orgId: string, message: string, opts?: { color?: string; fields?: { title: string; value: string }[] }) {
  const cfg = await getIntegrationConfig(orgId, 'slack')
  if (!cfg?.webhook_url) return

  const payload: any = {
    text: message,
    channel: cfg.channel || '#shop-alerts',
  }

  if (opts?.fields) {
    payload.attachments = [{
      color: opts.color || '#4f7fff',
      fields: opts.fields.map(f => ({ title: f.title, value: f.value, short: true })),
    }]
  }

  try {
    await fetch(cfg.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {}
}

// ── GoHighLevel ───────────────────────────────────────────────────
const GHL_STAGE_MAP: Record<string, string> = {
  sales_in:    'New Lead',
  production:  'In Production',
  install:     'Install Scheduled',
  prod_review: 'Quality Review',
  sales_close: 'Closing',
  done:        'Won',
}

export async function syncToGoHighLevel(orgId: string, action: 'create_contact' | 'update_opportunity', data: any) {
  const cfg = await getIntegrationConfig(orgId, 'gohighlevel')
  if (!cfg?.api_key || !cfg?.location_id) return

  const baseUrl = 'https://rest.gohighlevel.com/v1'
  const headers = {
    'Authorization': `Bearer ${cfg.api_key}`,
    'Content-Type': 'application/json',
    'Version': '2021-07-28',
  }

  try {
    if (action === 'create_contact') {
      await fetch(`${baseUrl}/contacts/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          locationId: cfg.location_id,
          firstName: data.customer_name?.split(' ')[0] || data.title,
          lastName: data.customer_name?.split(' ').slice(1).join(' ') || '',
          email: data.email || '',
          phone: data.phone || '',
          name: data.customer_name || data.title,
          source: 'USA Wrap CRM',
          tags: ['wrap-crm', 'auto-synced'],
          customField: {
            vehicle: data.vehicle_desc || '',
            job_id: data.id || '',
          },
        }),
      })
    } else if (action === 'update_opportunity') {
      const stage = GHL_STAGE_MAP[data.pipe_stage] || data.pipe_stage
      // Search for existing opportunity by job ID in custom field
      // For simplicity, create/update an opportunity
      await fetch(`${baseUrl}/opportunities/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          pipelineId: cfg.pipeline_id || '',
          locationId: cfg.location_id,
          name: data.title || 'Vehicle Wrap Job',
          pipelineStageId: stage,
          status: data.pipe_stage === 'done' ? 'won' : 'open',
          monetaryValue: data.revenue || 0,
          assignedTo: cfg.default_user_id || '',
          contactId: data.ghl_contact_id || '',
        }),
      })
    }
  } catch {}
}

// ── Stage Change Webhooks ─────────────────────────────────────────
export async function onStageAdvanced(orgId: string, project: any, fromStage: string, toStage: string, actorName: string) {
  const stageLabel = (stage: string) => ({
    sales_in: 'Sales', production: 'Production', install: 'Install',
    prod_review: 'QC Review', sales_close: 'Sales Close', done: 'Done',
  }[stage] || stage)

  // Slack notification
  await notifySlack(orgId,
    `✅ *${project.title || 'Job'}* advanced: ${stageLabel(fromStage)} → ${stageLabel(toStage)}`,
    {
      color: 'good',
      fields: [
        { title: 'Job', value: project.title || '—' },
        { title: 'By', value: actorName },
        { title: 'Stage', value: `${stageLabel(fromStage)} → ${stageLabel(toStage)}` },
        { title: 'Revenue', value: `$${Math.round(project.revenue || 0).toLocaleString()}` },
      ],
    }
  )

  // GHL sync
  await syncToGoHighLevel(orgId, 'update_opportunity', { ...project, pipe_stage: toStage })
}

export async function onSendBack(orgId: string, project: any, fromStage: string, toStage: string, reason: string, actorName: string) {
  await notifySlack(orgId,
    `⚠️ *${project.title || 'Job'}* sent back: ${fromStage} → ${toStage}\nReason: ${reason}`,
    {
      color: 'warning',
      fields: [
        { title: 'Job', value: project.title || '—' },
        { title: 'By', value: actorName },
        { title: 'Reason', value: reason },
      ],
    }
  )
}

export async function onJobClosed(orgId: string, project: any, actorName: string) {
  await notifySlack(orgId,
    `🎉 *${project.title || 'Job'}* closed — Revenue: $${Math.round(project.revenue || 0).toLocaleString()}`,
    {
      color: '#22c07a',
      fields: [
        { title: 'Job', value: project.title || '—' },
        { title: 'Closed By', value: actorName },
        { title: 'Revenue', value: `$${Math.round(project.revenue || 0).toLocaleString()}` },
        { title: 'GPM', value: project.gpm ? `${Math.round(project.gpm)}%` : '—' },
      ],
    }
  )
  await syncToGoHighLevel(orgId, 'update_opportunity', { ...project, pipe_stage: 'done' })
}
