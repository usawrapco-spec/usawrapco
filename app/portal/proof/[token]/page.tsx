import LaunchPay from "@/components/financing/LaunchPay";

interface PageProps { params: { token: string } }

export default async function ProofPage({ params }: PageProps) {
  const data = { revenue: 4600, depositPaid: 250, balance: 4350, vehicle_desc: "2024 Ford Transit", title: "Full Vehicle Wrap" };

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800 px-5 py-8 text-center">
        <h1 className="text-2xl font-bold mb-1">Your Design Proof</h1>
        <p className="text-zinc-400 text-sm">{data.vehicle_desc} · {data.title}</p>
        <div className="inline-flex items-center gap-2 mt-3 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-4 py-1.5">
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <span className="text-yellow-400 text-sm font-medium">Awaiting Your Approval</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-6 space-y-5">
        {/* Proof image */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="aspect-video bg-zinc-800 flex items-center justify-center">
            <span className="text-zinc-600 text-sm">Design proof renders here</span>
          </div>
          <div className="p-4 flex gap-3">
            <button className="flex-1 bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl transition-all text-sm">
              ✓ Approve Design
            </button>
            <button className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 rounded-xl border border-zinc-700 transition-all text-sm">
              Request Changes
            </button>
          </div>
        </div>

        {/* Payment with LaunchPay */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <p className="text-zinc-500 text-xs uppercase tracking-wider font-medium">Payment</p>
          <div className="flex justify-between text-sm"><span className="text-zinc-400">Project total</span><span className="text-white font-semibold">${data.revenue.toLocaleString()}</span></div>
          <div className="flex justify-between text-sm"><span className="text-zinc-400">Deposit paid</span><span className="text-green-400">-${data.depositPaid}</span></div>
          <div className="border-t border-zinc-800 pt-3 flex justify-between">
            <span className="text-white font-semibold">Balance due at install</span>
            <span className="text-2xl font-bold text-white">${data.balance.toLocaleString()}</span>
          </div>
          <LaunchPay amount={data.balance} variant="inline" showPrequal context="customer" />
        </div>

        <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl text-base transition-all">
          Pay Balance Now — ${data.balance.toLocaleString()}
        </button>
      </div>
    </main>
  );
}
