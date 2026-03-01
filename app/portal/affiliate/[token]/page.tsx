import LaunchPay from "@/components/financing/LaunchPay";
import { DollarSign, TrendingUp, ChevronRight } from "lucide-react";

interface PageProps { params: { token: string } }

export default async function AffiliatePortalPage({ params }: PageProps) {
  const affiliate = {
    name: "Pacific Boat Brokers",
    rep: "Jason Mills",
    stats: { pendingCommission: 1240, paidCommission: 3870 },
    jobs: [
      { id: "aff_001", customerName: "Rick Samuelson",     vehicle: "2023 Sea Ray SDX 270",      package: "Full Boat Wrap",  revenue: 7200,  commission: 135, status: "in_progress" },
      { id: "aff_002", customerName: "Coastal Properties", vehicle: "3× 2024 Ram ProMaster",     package: "Fleet Wrap × 3", revenue: 13800, commission: 259, status: "deposit_pending" },
    ],
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800 px-5 py-6">
        <div className="max-w-2xl mx-auto">
          <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Affiliate Portal · USA Wrap Co</p>
          <h1 className="text-xl font-bold">{affiliate.name}</h1>
          <p className="text-zinc-400 text-sm">{affiliate.rep}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-green-500/20 bg-green-500/5 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2"><DollarSign className="w-4 h-4 text-green-400" /><span className="text-zinc-400 text-xs">Pending</span></div>
            <p className="text-2xl font-bold text-white">${affiliate.stats.pendingCommission.toLocaleString()}</p>
          </div>
          <div className="border border-blue-500/20 bg-blue-500/5 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-blue-400" /><span className="text-zinc-400 text-xs">Total Earned</span></div>
            <p className="text-2xl font-bold text-white">${affiliate.stats.paidCommission.toLocaleString()}</p>
          </div>
        </div>

        {/* Jobs */}
        <p className="text-zinc-500 text-xs uppercase tracking-wider font-medium">Your Referred Jobs</p>
        {affiliate.jobs.map((job) => (
          <div key={job.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-start justify-between gap-3">
              <div>
                <p className="text-white font-semibold">{job.customerName}</p>
                <p className="text-zinc-400 text-sm">{job.vehicle}</p>
                <p className="text-zinc-500 text-xs">{job.package}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-white font-bold text-lg">${job.revenue.toLocaleString()}</p>
                <p className="text-green-400 text-sm">+${job.commission} commission</p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-3">
              {/* LaunchPay — affiliate context, CTA says "Share Financing Link" */}
              <LaunchPay amount={job.revenue} variant="inline" showPrequal context="affiliate" />
              {job.status === "deposit_pending" && (
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
          <p className="text-zinc-400 text-sm mb-4">Earn 2.5% commission on every job</p>
          <button className="bg-green-600 hover:bg-green-500 text-white font-semibold px-6 py-3 rounded-xl transition-all text-sm">
            Share My Referral Link
          </button>
        </div>
      </div>
    </main>
  );
}
