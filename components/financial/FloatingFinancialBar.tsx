'use client';

import { useState, useEffect, useRef } from 'react';

interface FinancialData {
  revenue: number;
  profit: number;
  gpm: number;
  commission: number;
  fin_data?: {
    material_cost?: number;
    labor_cost?: number;
    design_fee?: number;
    cogs?: number;
    install_pay?: number;
    hrs_budget?: number;
    material_sqft?: number;
    labor_pct?: number;
    comm_base?: number;
    comm_inbound?: number;
    comm_gpm_bonus?: number;
  };
}

interface FloatingFinancialBarProps {
  project: FinancialData;
  className?: string;
}

export default function FloatingFinancialBar({ project, className = '' }: FloatingFinancialBarProps) {
  const [expanded, setExpanded] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  const fin = project.fin_data || {};
  const revenue = project.revenue || 0;
  const profit = project.profit || 0;
  const gpm = project.gpm || 0;
  const commission = project.commission || 0;
  const installPay = fin.install_pay || 0;
  const hrsBudget = fin.hrs_budget || 0;
  const cogs = fin.cogs || (revenue - profit);
  const materialCost = fin.material_cost || 0;
  const laborCost = fin.labor_cost || 0;
  const designFee = fin.design_fee || 0;
  const materialSqft = fin.material_sqft || 0;
  const laborPct = fin.labor_pct || 0;

  useEffect(() => {
    const handleScroll = () => {
      if (barRef.current) {
        const rect = barRef.current.getBoundingClientRect();
        setIsSticky(rect.top <= 0);
      }
    };

    const scrollParent = barRef.current?.closest('[class*="overflow"]') || window;
    scrollParent.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollParent.removeEventListener('scroll', handleScroll);
  }, []);

  const pct = (val: number) => revenue > 0 ? ((val / revenue) * 100).toFixed(0) : '0';

  return (
    <div
      ref={barRef}
      className={`sticky top-0 z-10 border border-[#1e2d4a] rounded-xl 
        bg-gradient-to-br from-[#0f1829] to-[#162036] 
        shadow-lg transition-all duration-300 ${isSticky ? 'rounded-none border-x-0 shadow-2xl' : ''} ${className}`}
      style={{ padding: '14px 18px' }}
    >
      {/* Top row - key metrics */}
      <div className="flex flex-wrap gap-3 justify-center">
        {[
          { label: 'SALE', value: `$${revenue.toLocaleString()}`, color: 'text-cyan-400' },
          { label: 'PROFIT', value: `$${profit.toLocaleString()}`, color: 'text-green-400' },
          { label: 'GPM', value: `${gpm}%`, color: gpm >= 70 ? 'text-green-400' : gpm >= 50 ? 'text-yellow-400' : 'text-red-400' },
          { label: 'INSTALL PAY', value: `$${installPay.toLocaleString()}`, color: 'text-orange-400' },
          { label: 'HRS BUDGET', value: `${hrsBudget}h`, color: 'text-purple-400' },
          { label: 'COGS', value: `$${cogs.toLocaleString()}`, color: 'text-red-400' },
          { label: 'COMMISSION', value: `$${commission.toLocaleString()}`, color: 'text-pink-400' },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-[#111827] border border-[#1e2d4a] rounded-lg px-4 py-2 text-center min-w-[90px]"
          >
            <span className="block text-[9px] font-bold tracking-[1.5px] text-gray-500 uppercase">
              {item.label}
            </span>
            <span className={`block font-mono text-lg font-bold mt-0.5 ${item.color}`}>
              {item.value}
            </span>
          </div>
        ))}
      </div>

      {/* Expandable breakdown */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-[#1e2d4a] animate-in slide-in-from-top-2">
          {/* Line item breakdown */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            {[
              { label: `Material (${materialSqft} sqft)`, value: materialCost, pct: pct(materialCost) },
              { label: `Labor (${laborPct}%)`, value: laborCost, pct: pct(laborCost) },
              { label: 'Design Fee', value: designFee, pct: pct(designFee) },
              { label: 'COGS Total', value: cogs, pct: pct(cogs), valueColor: 'text-red-400' },
              { label: 'GP (Profit)', value: profit, pct: `${gpm}`, valueColor: 'text-green-400' },
              { label: 'Sales Comm. (on GP)', value: commission, pct: pct(commission), valueColor: 'text-pink-400' },
              { label: 'Net Profit', value: profit, valueColor: 'text-green-400' },
              { label: 'Total Sale', value: revenue, pct: '100', valueColor: 'text-cyan-400' },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-center py-1 text-sm">
                <span className="text-gray-400">{row.label}</span>
                <span>
                  <span className={`font-mono font-semibold ${row.valueColor || 'text-gray-200'}`}>
                    ${row.value.toLocaleString()}
                  </span>
                  {row.pct && (
                    <span className="text-gray-500 text-xs ml-1.5">{row.pct}%</span>
                  )}
                </span>
              </div>
            ))}
          </div>

          {/* Margin target */}
          <div className="mt-3 pt-3 border-t border-[#1e2d4a]">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-gray-500 font-semibold uppercase tracking-wide text-[10px]">Margin Target</span>
              <span className="font-mono text-green-400 font-bold">{gpm}%</span>
            </div>
            <div className="w-full h-1 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 relative">
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-white shadow-lg shadow-green-400/50"
                style={{ left: `${Math.min(gpm, 100)}%`, transform: 'translate(-50%, -50%)' }}
              />
            </div>
          </div>

          {/* Commission breakdown */}
          <div className="mt-3 p-3 bg-green-500/5 border border-green-500/15 rounded-lg">
            <div className="text-[10px] font-bold tracking-[1px] text-green-400 uppercase mb-1.5">
              🟢 Sales Commission
            </div>
            <div className="text-xs text-gray-400 mb-2">
              Inbound 7% of GP (✓ +2% &gt;73% GPM)
            </div>
            <div className="flex gap-1.5">
              {[
                { label: `Base ${fin.comm_base || 4.5}%`, active: true },
                { label: `+${fin.comm_inbound || 1}% Inbnd`, active: true },
                { label: `+${fin.comm_gpm_bonus || 2}% GPM>73 ${gpm > 73 ? '✓' : '✗'}`, active: gpm > 73 },
              ].map((tier) => (
                <span
                  key={tier.label}
                  className={`px-2.5 py-1 rounded text-xs font-semibold border ${
                    tier.active
                      ? 'bg-green-500/15 border-green-500/30 text-green-400'
                      : 'bg-[#111827] border-[#1e2d4a] text-gray-500'
                  }`}
                >
                  {tier.label}
                </span>
              ))}
            </div>
            <div className="font-mono text-2xl font-bold text-green-400 mt-2">
              ${commission.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <div className="flex justify-center mt-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-500 text-xs font-semibold px-4 py-1 rounded-full border border-[#1e2d4a] 
            hover:text-gray-300 hover:border-purple-500 transition-all"
        >
          {expanded ? '▲ Hide Breakdown' : '▼ Show Full Breakdown'}
        </button>
      </div>
    </div>
  );
}
