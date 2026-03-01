import LaunchPay from "@/components/financing/LaunchPay";

interface PageProps { params: { token: string } }

async function getOnboardingData(token: string) {
  // Replace with real Supabase query:
  // const { data } = await supabase.from("projects")
  //   .select("revenue, title, vehicle_desc")
  //   .eq("checkout->onboard_token", token).single();
  return { revenue: 4600, title: "Full Vehicle Wrap", vehicle_desc: "2024 Ford Transit", depositAmount: 250 };
}

export default async function OnboardPage({ params }: PageProps) {
  const data = await getOnboardingData(params.token);
  const balance = data.revenue - data.depositAmount;

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800 px-5 py-8 text-center">
        <h1 className="text-2xl font-bold text-white mb-1">Let&apos;s Design Your Wrap</h1>
        <p className="text-zinc-400 text-sm">{data.vehicle_desc} · {data.title}</p>
      </div>

      <div className="max-w-lg mx-auto px-5 py-6 space-y-5">

        {/* LaunchPay hero — prominent at the top of the flow */}
        <LaunchPay amount={data.revenue} variant="hero" showPrequal context="customer" />

        {/* Project summary */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
          <p className="text-zinc-500 text-xs uppercase tracking-wider font-medium">Project Summary</p>
          <div className="flex items-center justify-between">
            <span className="text-zinc-300">{data.title}</span>
            <span className="text-white font-bold">${data.revenue.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Design deposit (due today)</span>
            <span className="text-white">${data.depositAmount}</span>
          </div>
          <div className="border-t border-zinc-800 pt-3 flex items-center justify-between">
            <span className="text-zinc-400 text-sm">Balance at install</span>
            <div className="text-right">
              <p className="text-white font-semibold">${balance.toLocaleString()}</p>
              <LaunchPay amount={balance} variant="compact" showPrequal={false} />
            </div>
          </div>
        </div>

        {/* Deposit CTA */}
        <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl text-base transition-all">
          Pay $250 Design Deposit
        </button>
        <p className="text-zinc-600 text-xs text-center">Secure checkout via Stripe · LaunchPay financing available at final invoice</p>
      </div>
    </main>
  );
}
