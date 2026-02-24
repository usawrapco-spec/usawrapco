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
  const admin = getSupabaseAdmin()

  // ── Auto-calculate & persist commission on close ──────────────
  try {
    const fd = project.form_data || {}
    const finData = project.fin_data || {}
    const revenue = project.revenue || finData.sale || 0
    const materialCost = finData.material || finData.material_cost || 0
    const laborCost = finData.labor || finData.labor_cost || 0
    const designFee = finData.designFee || finData.design_fee || 150
    const misc = finData.misc || 0

    // Load agent's commission override
    let agentOverride: number | null = null
    if (project.agent_id) {
      const { data: agentProfile } = await admin.from('profiles')
        .select('commission_rate_override').eq('id', project.agent_id).single()
      if (agentProfile?.commission_rate_override != null) {
        agentOverride = agentProfile.commission_rate_override / 100
      }
    }

    // Load shop commission rates from settings
    const { data: commSettings } = await admin.from('shop_settings')
      .select('key, value').eq('org_id', orgId).eq('category', 'commission')
    const settingsMap: Record<string, number> = {}
    commSettings?.forEach((s: any) => { settingsMap[s.key] = parseFloat(s.value) })

    // Map lead source to commission engine source key
    const leadType = fd.leadType || 'inbound'
    const sourceMap: Record<string, string> = {
      inbound: 'commission_inbound', outbound: 'commission_outbound',
      referral: 'commission_referral', walk_in: 'commission_walkin',
      repeat: 'commission_repeat', presold: 'commission_inbound',
      cross_referral: 'commission_cross_referral',
    }
    const settingKey = sourceMap[leadType] || 'commission_inbound'
    const sourceRate = settingsMap[settingKey] != null
      ? settingsMap[settingKey] / 100
      : undefined // fall back to engine defaults

    const netProfit = revenue - materialCost - laborCost - designFee - misc
    const gpm = revenue > 0 ? (netProfit / revenue) * 100 : 0
    const commRate = agentOverride ?? sourceRate ?? (leadType === 'outbound' ? 0.06 : 0.045)
    const commission = Math.max(0, netProfit * commRate)

    // Torq bonus
    const torqRate = (settingsMap['torq_bonus'] ?? 1) / 100
    const torqBonus = fd.usedTorq ? Math.max(0, netProfit * torqRate) : 0

    // High GPM bonus
    const gpmBonusRate = (settingsMap['gpm_bonus'] ?? 2) / 100
    const gpmBonus = gpm > 73 ? Math.max(0, netProfit * gpmBonusRate) : 0

    // Production bonus
    const prodBonusRate = (settingsMap['production_bonus_rate'] ?? 5) / 100
    const productionBonus = Math.max(0, (netProfit * prodBonusRate) - designFee)

    const totalCommission = commission + torqBonus + gpmBonus

    // Persist to project
    await admin.from('projects').update({
      commission: totalCommission,
      profit: netProfit,
      gpm: Math.round(gpm * 10) / 10,
    }).eq('id', project.id)

    // Log commission calculation to activity_log
    await admin.from('activity_log').insert({
      org_id: orgId,
      project_id: project.id,
      actor_id: project.agent_id,
      action: 'commission_calculated',
      entity_type: 'project',
      entity_id: project.id,
      details: {
        revenue, netProfit, gpm: Math.round(gpm * 10) / 10,
        commRate, commission, torqBonus, gpmBonus, productionBonus,
        totalCommission, leadType, agentOverride,
      },
    })
  } catch (err) {
    console.error('Commission auto-calc error:', err)
  }

  // ── Notifications ─────────────────────────────────────────────
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
