import { getSupabaseAdmin } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import LaunchPay from '@/components/financing/LaunchPay'
import { DollarSign, TrendingUp, ChevronRight } from 'lucide-react'

interface PageProps { params: { token: string } }

export default async function SalesAgentPortalPage({ params }: PageProps) {
  const admin = getSupabaseAdmin()

  // Fetch sales agent by portal_token
  const { data: agent } = await admin
    .from('affiliates')
    .select('*')
    .eq('portal_token', params.token)
    .eq('status', 'active')
    .single()

  if (!agent) return notFound()

  // Fetch commissions with project details
  const { data: commissions } = await admin
    .from('affiliate_commissions')
    .select('*, project:project_id(id, title, vehicle_desc, revenue, stage, customer:customer_id(name, company))')
    .eq('affiliate_id', agent.id)
    .order('created_at', { ascending: false })

  const jobs = (commissions || [])
    .filter(c => c.project)
    .map(c => ({
      id: c.project.id,
      customerName: c.project.customer?.name || c.project.customer?.company || 'Customer',
      vehicle: c.project.vehicle_desc || c.project.title,
      package: c.project.title,
      revenue: c.project.revenue || 0,
      commission: c.amount || 0,
      status: c.project.stage || 'pending',
    }))

  const pendingCommission = jobs.reduce((s, j) => {
    const c = commissions?.find(c => c.project?.id === j.id)
    return s + (c?.status === 'pending' ? (c.amount || 0) : 0)
  }, 0)

  const totalEarned = jobs.reduce((s, j) => {
    const c = commissions?.find(c => c.project?.id === j.id)
    return s + (c?.status === 'paid' ? (c.amount || 0) : 0)
  }, 0)

  const commissionRate = agent.commission_structure?.rate || 7

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800 px-5 py-6">
        <div className="max-w-2xl mx-auto">
          <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Sales Agent Portal · USA Wrap Co</p>
          <h1 className="text-xl font-bold">{agent.name}</h1>
          {agent.company && <p className="text-zinc-400 text-sm">{agent.company}</p>}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-green-500/20 bg-green-500/5 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-green-400" />
              <span className="text-zinc-400 text-xs">Pending</span>
            </div>
            <p className="text-2xl font-bold text-white">${pendingCommission.toLocaleString()}</p>
          </div>
          <div className="border border-blue-500/20 bg-blue-500/5 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span className="text-zinc-400 text-xs">Total Earned</span>
            </div>
            <p className="text-2xl font-bold text-white">${totalEarned.toLocaleString()}</p>
          </div>
        </div>

        {/* Jobs */}
        <p className="text-zinc-500 text-xs uppercase tracking-wider font-medium">Your Referred Jobs</p>

        {jobs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-zinc-400 text-sm">No referred jobs yet. Share your referral link to start earning.</p>
          </div>
        )}

        {jobs.map((job) => (
          <div key={job.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-start justify-between gap-3">
              <div>
                <p className="text-white font-semibold">{job.customerName}</p>
                <p className="text-zinc-400 text-sm">{job.vehicle}</p>
                <p className="text-zinc-500 text-xs">{job.package}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-white font-bold text-lg">${job.revenue.toLocaleString()}</p>
                <p className="text-green-400 text-sm">+${job.commission.toLocaleString()} commission</p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-3">
              <LaunchPay amount={job.revenue} variant="inline" showPrequal context="affiliate" />
              {(job.status === 'deposit_pending' || job.status === 'estimate') && (
                <a href={`/onboard/${job.id}`}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm">
                  Send to Customer <ChevronRight className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        ))}

        {/* Refer CTA */}
        <div className="bg-gradient-to-br from-green-600/15 to-green-900/10 border border-green-500/20 rounded-2xl p-5 text-center">
          <p className="text-white font-semibold mb-1">Refer a new customer</p>
          <p className="text-zinc-400 text-sm mb-4">Earn {commissionRate}% commission on every job</p>
          <button className="bg-green-600 hover:bg-green-500 text-white font-semibold px-6 py-3 rounded-xl transition-all text-sm">
            Share My Referral Link
          </button>
        </div>
      </div>
    </main>
  )
}
