import { getSupabaseAdmin } from '@/lib/supabase/service'

interface LogMockupActivityParams {
  org_id: string
  customer_id?: string | null
  project_id?: string | null
  mockup_id: string
  action: string
  details?: string
  metadata?: Record<string, unknown>
  actor_type?: 'user' | 'customer' | 'system' | 'ai'
  actor_id?: string | null
}

export async function logMockupActivity(params: LogMockupActivityParams) {
  try {
    const admin = getSupabaseAdmin()
    await admin.from('activity_log').insert({
      org_id: params.org_id,
      customer_id: params.customer_id || null,
      job_id: params.project_id || null,
      actor_type: params.actor_type || 'system',
      actor_id: params.actor_id || null,
      action: params.action,
      details: params.details || null,
      metadata: {
        type: params.action,
        mockup_id: params.mockup_id,
        ...(params.metadata || {}),
      },
    })
  } catch (err) {
    // Non-blocking — don't fail the mockup pipeline if logging fails
    console.error('[logMockupActivity]', err)
  }
}
