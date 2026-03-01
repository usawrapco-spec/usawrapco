// supabase/functions/pnw-data-sync/index.ts
// Cron: runs daily at 6am UTC
// Fetches: NOAA marine alerts, WDFW closures, updates pnw_alerts table

import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

async function fetchNoaaAlerts(): Promise<any[]> {
  const zones = ['PZZ130', 'PZZ131', 'PZZ132', 'WAZ516']
  const alerts: any[] = []

  for (const zone of zones) {
    try {
      const res = await fetch(`https://api.weather.gov/alerts/active?zone=${zone}`, {
        headers: { 'User-Agent': 'PNWNavigator/1.0 (admin@usawrapco.com)' }
      })
      if (!res.ok) continue
      const data = await res.json()
      const features = data.features || []
      for (const f of features) {
        const p = f.properties
        alerts.push({
          alert_id: f.id,
          source: 'NOAA',
          alert_type: p.event,
          headline: p.headline,
          description: p.description,
          severity: p.severity,
          effective: p.effective,
          expires: p.expires,
          area: p.areaDesc,
          is_active: true,
          raw_data: f,
          updated_at: new Date().toISOString(),
        })
      }
    } catch (err) {
      console.error(`Zone ${zone} fetch error:`, err)
    }
  }
  return alerts
}

async function upsertAlerts(alerts: any[]): Promise<void> {
  if (alerts.length === 0) return

  const res = await fetch(`${SUPABASE_URL}/rest/v1/pnw_alerts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify(alerts),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Upsert failed: ${err}`)
  }
}

async function deactivateExpiredAlerts(): Promise<void> {
  const now = new Date().toISOString()
  await fetch(`${SUPABASE_URL}/rest/v1/pnw_alerts?expires=lt.${now}&is_active=eq.true`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ is_active: false }),
  })
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    console.log('PNW data sync started:', new Date().toISOString())

    // 1. Fetch and upsert NOAA alerts
    const alerts = await fetchNoaaAlerts()
    await upsertAlerts(alerts)
    console.log(`Upserted ${alerts.length} alerts`)

    // 2. Deactivate expired alerts
    await deactivateExpiredAlerts()
    console.log('Deactivated expired alerts')

    return new Response(JSON.stringify({
      success: true,
      alerts_synced: alerts.length,
      timestamp: new Date().toISOString(),
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('Sync error:', err)
    return new Response(JSON.stringify({
      success: false,
      error: String(err),
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
