import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

interface ServiceStatus {
  ok: boolean
  latency: number
  error?: string
}

async function checkService(
  url: string,
  headers: Record<string, string>,
  validStatuses: number[] = [200],
): Promise<ServiceStatus> {
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(url, { headers, signal: controller.signal })
    clearTimeout(timeout)
    return { ok: validStatuses.includes(res.status), latency: Date.now() - start }
  } catch (e: any) {
    return { ok: false, latency: Date.now() - start, error: e.message }
  }
}

export async function GET() {
  const [replicate, claude, stripe] = await Promise.all([
    checkService(
      'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell',
      { Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN || 'none'}` },
      [200, 401],
    ),
    checkService(
      'https://api.anthropic.com/v1/models',
      { 'x-api-key': process.env.ANTHROPIC_API_KEY || '', 'anthropic-version': '2023-06-01' },
      [200, 401],
    ),
    checkService(
      'https://api.stripe.com/v1/balance',
      { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY || 'none'}` },
      [200, 401, 403],
    ),
  ])

  const services = { replicate, claude, stripe }
  const admin = getSupabaseAdmin()

  // Update system_alerts for each service
  for (const [service, status] of Object.entries(services)) {
    try {
      if (!status.ok) {
        const { data: existing } = await admin
          .from('system_alerts')
          .select('id')
          .eq('service', service)
          .is('resolved_at', null)
          .maybeSingle()
        if (!existing) {
          await admin.from('system_alerts').insert({
            service,
            status: 'down',
            message: status.error || `${service} API is not responding`,
          })
        }
      } else {
        await admin
          .from('system_alerts')
          .update({ resolved_at: new Date().toISOString() })
          .eq('service', service)
          .is('resolved_at', null)
      }
    } catch {
      /* non-fatal */
    }
  }

  return NextResponse.json({
    ok: replicate.ok && claude.ok && stripe.ok,
    services,
    checked_at: new Date().toISOString(),
  })
}
