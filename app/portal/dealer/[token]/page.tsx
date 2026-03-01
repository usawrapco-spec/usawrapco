import LaunchPay from "@/components/financing/LaunchPay";
import { ChevronRight, TrendingUp } from "lucide-react";

interface PageProps { params: { token: string } }

export default async function DealerPortalPage({ params }: PageProps) {
  // Wire to real Supabase query by dealer token in production
  const data = {
    dealerName: "Harbor Marine & Auto",
    salesRep: "Kevin Wallace",
    jobs: [
      { id: "job_001", vehicle: "2024 Grady-White 336 Canyon", type: "Boat Wrap", package: "Full Hull Wrap", revenue: 8400, status: "deposit_pending", customerName: "Mark Thompson" },
      { id: "job_002", vehicle: "2025 Ford Transit 350", type: "Fleet Wrap", package: "Full Commercial Wrap", revenue: 4600, status: "in_design", customerName: "Harbor Seafood Co." },
    ],
  };

  const statusMeta: Record<string, { label: string; color: string }> = {
    deposit_pending: { label: "Awaiting Deposit", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
    in_design:       { label: "In Design",        color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    approved:        { label: "Design Approved",  color: "text-green-400 bg-green-500/10 border-green-500/20" },
    scheduled:       { label: "Install Scheduled",color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800 px-5 py-6">
        <div className="max-w-2xl mx-auto">
          <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Dealer Portal · USA Wrap Co</p>
          <h1 className="text-xl font-bold">{data.dealerName}</h1>
          <p className="text-zinc-400 text-sm">Managed by {data.salesRep}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-4">

        {data.jobs.map((job) => {
          const meta = statusMeta[job.status];
          return (
            <div key={job.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800 flex items-start justify-between gap-3">
                <div>
                  <p className="text-white font-semibold">{job.vehicle}</p>
                  <p className="text-zinc-400 text-sm">{job.customerName} · {job.package}</p>
                </div>
                <div className={`flex items-center gap-1.5 border rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap ${meta.color}`}>
                  <div className="w-1.5 h-1.5 rounded-full bg-current" />
                  {meta.label}
                </div>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">Project value</span>
                  <span className="text-2xl font-bold text-white">${job.revenue.toLocaleString()}</span>
                </div>
                {/* LaunchPay — dealer context, CTA says "Show Customer Their Rate" */}
                <LaunchPay amount={job.revenue} variant="inline" showPrequal context="dealer" />
                {job.status === "deposit_pending" && (
                  <a href={`/onboard/${job.id}`}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm">
                    Start Wrap Process <ChevronRight className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          );
        })}

        {/* New wrap CTA */}
        <div className="bg-gradient-to-br from-blue-600/15 to-blue-900/10 border border-blue-500/20 rounded-2xl p-5 text-center">
          <TrendingUp className="w-6 h-6 text-blue-400 mx-auto mb-2" />
          <p className="text-white font-semibold mb-1">Add another vehicle?</p>
          <p className="text-zinc-400 text-sm mb-4">Start a new quote for your customer in 60 seconds</p>
          <button className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl transition-all text-sm">
            Start New Quote
          </button>
        </div>
      </div>
    </main>
  );
}
