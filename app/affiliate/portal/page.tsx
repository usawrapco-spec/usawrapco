/**
 * Affiliate Dealer Transparency Portal
 * Public-facing (no auth required) — accessed via unique code
 * Route: /affiliate/portal?code=ABCDEF123
 */
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import AffiliatePortalClient from '@/components/affiliate/AffiliatePortalClient'

export default async function AffiliatePortalPage({
  searchParams,
}: {
  searchParams: { code?: string }
}) {
  const code = searchParams.code
  if (!code) notFound()

  const admin = getSupabaseAdmin()

  // Lookup affiliate by code
  const { data: affiliate } = await admin
    .from('affiliates')
    .select('*')
    .eq('unique_code', code)
    .single()

  if (!affiliate || affiliate.status === 'inactive') notFound()

  // Fetch jobs sourced by this affiliate
  let projects: any[] = []
  try {
    const { data: comms } = await admin
      .from('affiliate_commissions')
      .select('project_id, amount, status')
      .eq('affiliate_id', affiliate.id)

    if (comms && comms.length > 0) {
      const projectIds = comms.map((c: any) => c.project_id).filter(Boolean)
      if (projectIds.length > 0) {
        const { data: projs } = await admin
          .from('projects')
          .select('id, title, pipe_stage, status, revenue, profit, vehicle_desc, form_data, created_at, install_date')
          .in('id', projectIds)
        projects = (projs || []).map(p => ({
          ...p,
          commission: comms.find((c: any) => c.project_id === p.id),
        }))
      }
    }
  } catch {}

  // Commission summary
  const totalEarned = projects.reduce((s, p) => s + (p.commission?.amount || 0), 0)
  const totalOwed = projects.filter(p => p.commission?.status === 'pending').reduce((s, p) => s + (p.commission?.amount || 0), 0)
  const totalPaid = projects.filter(p => p.commission?.status === 'paid').reduce((s, p) => s + (p.commission?.amount || 0), 0)

  return (
    <AffiliatePortalClient
      affiliate={affiliate}
      projects={projects}
      totalEarned={totalEarned}
      totalOwed={totalOwed}
      totalPaid={totalPaid}
    />
  )
}
