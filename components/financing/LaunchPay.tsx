"use client";

import { useState } from "react";
import { Rocket, ChevronRight, CheckCircle, Zap, Shield, X, ArrowRight } from "lucide-react";

interface LaunchPayProps {
  amount: number;
  variant?: "card" | "inline" | "compact" | "hero";
  showPrequal?: boolean;
  className?: string;
  context?: "customer" | "dealer" | "affiliate"; // slight copy variation per audience
}

function calcMonthly(amount: number, months: number, apr: number): number {
  if (apr === 0) return Math.ceil(amount / months);
  const r = apr / 12;
  return Math.ceil((amount * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1));
}

export default function LaunchPay({
  amount,
  variant = "card",
  showPrequal = true,
  className = "",
  context = "customer",
}: LaunchPayProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const m3  = calcMonthly(amount, 3,  0);
  const m12 = calcMonthly(amount, 12, 0.15);
  const m24 = calcMonthly(amount, 24, 0.18);

  if (amount < 50) return null;

  // ── COMPACT ──────────────────────────────────────────────────────────────
  if (variant === "compact") {
    return (
      <span className={`inline-flex items-center gap-1.5 text-sm ${className}`}>
        <span className="text-zinc-400">or from</span>
        <span className="text-white font-bold">${m12}/mo</span>
        <span className="text-zinc-500">via</span>
        <LaunchPayBadge size="xs" />
        {showPrequal && (
          <>
            <button
              onClick={() => setModalOpen(true)}
              className="text-[#00C2FF] hover:text-white text-xs underline underline-offset-2 transition-colors ml-0.5"
            >
              Check rate
            </button>
            {modalOpen && <PrequalModal amount={amount} m3={m3} m12={m12} m24={m24} onClose={() => setModalOpen(false)} context={context} />}
          </>
        )}
      </span>
    );
  }

  // ── INLINE ────────────────────────────────────────────────────────────────
  if (variant === "inline") {
    return (
      <>
        <div
          className={`relative overflow-hidden flex items-center justify-between rounded-2xl border border-[#00C2FF]/20 bg-gradient-to-r from-[#00C2FF]/8 to-transparent px-4 py-3.5 ${className}`}
          style={{ background: "linear-gradient(135deg, rgba(0,194,255,0.08) 0%, rgba(0,194,255,0.02) 100%)" }}
        >
          {/* Subtle glow line at top */}
          <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#00C2FF]/40 to-transparent" />

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#00C2FF]/15 border border-[#00C2FF]/25 flex items-center justify-center flex-shrink-0">
              <Rocket className="w-3.5 h-3.5 text-[#00C2FF]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <LaunchPayBadge size="sm" />
              </div>
              <p className="text-zinc-400 text-xs mt-0.5">
                As low as <span className="text-white font-semibold">${m3}/mo</span> · 0% APR for 3 months
              </p>
            </div>
          </div>

          {showPrequal && (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 bg-[#00C2FF]/10 hover:bg-[#00C2FF]/20 border border-[#00C2FF]/30 text-[#00C2FF] hover:text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-all whitespace-nowrap"
            >
              Pre-approve
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
        {modalOpen && <PrequalModal amount={amount} m3={m3} m12={m12} m24={m24} onClose={() => setModalOpen(false)} context={context} />}
      </>
    );
  }

  // ── HERO ─────────────────────────────────────────────────────────────────
  if (variant === "hero") {
    return (
      <>
        <div className={`relative overflow-hidden rounded-3xl ${className}`}
          style={{ background: "linear-gradient(135deg, #0a1628 0%, #0d1f3c 50%, #071322 100%)", border: "1px solid rgba(0,194,255,0.2)" }}
        >
          {/* Background radial glow */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20 blur-3xl"
            style={{ background: "radial-gradient(circle, #00C2FF 0%, transparent 70%)" }} />

          <div className="relative p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <LaunchPayBadge size="lg" />
                <p className="text-zinc-500 text-xs mt-1">Instant financing for your project</p>
              </div>
              <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 text-xs font-semibold">30-sec approval</span>
              </div>
            </div>

            {/* Big monthly number */}
            <div className="text-center py-2">
              <p className="text-zinc-500 text-sm mb-1">Starting from</p>
              <div className="flex items-end justify-center gap-1">
                <span className="text-5xl font-black text-white">${m3}</span>
                <span className="text-zinc-400 text-lg mb-2">/mo</span>
              </div>
              <p className="text-[#00C2FF] text-sm font-medium mt-1">0% APR · 3-month plan</p>
            </div>

            {/* Plans grid */}
            <div className="grid grid-cols-3 gap-2">
              <HeroPlanTile months={3}  monthly={m3}  apr="0%"   highlight />
              <HeroPlanTile months={12} monthly={m12} apr="~15%" />
              <HeroPlanTile months={24} monthly={m24} apr="~18%" />
            </div>

            {/* Trust row */}
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-400" /> No credit impact</span>
              <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-[#00C2FF]" /> No hidden fees</span>
              <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-yellow-400" /> Instant decision</span>
            </div>

            {/* CTA */}
            {showPrequal && (
              <button
                onClick={() => setModalOpen(true)}
                className="w-full font-bold py-4 rounded-2xl text-sm transition-all flex items-center justify-center gap-2 relative overflow-hidden group"
                style={{ background: "linear-gradient(135deg, #00C2FF, #0088CC)" }}
              >
                <span className="relative z-10 flex items-center gap-2 text-white">
                  <Rocket className="w-4 h-4" />
                  Get Pre-Approved in 30 Seconds
                  <ChevronRight className="w-4 h-4" />
                </span>
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
              </button>
            )}

            <p className="text-zinc-600 text-[11px] text-center">
              Financing powered by <span className="text-zinc-500">Affirm</span> · Subject to credit approval · Rates vary by creditworthiness
            </p>
          </div>
        </div>
        {modalOpen && <PrequalModal amount={amount} m3={m3} m12={m12} m24={m24} onClose={() => setModalOpen(false)} context={context} />}
      </>
    );
  }

  // ── CARD (default) ────────────────────────────────────────────────────────
  return (
    <>
      <div
        className={`relative overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-900 ${className}`}
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00C2FF]/50 to-transparent" />

        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00C2FF]/10 border border-[#00C2FF]/20 flex items-center justify-center">
              <Rocket className="w-4 h-4 text-[#00C2FF]" />
            </div>
            <div>
              <LaunchPayBadge size="sm" />
              <p className="text-zinc-500 text-[11px] mt-0.5">Financing available for this project</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-full px-2.5 py-1">
            <Zap className="w-3 h-3 text-green-400" />
            <span className="text-green-400 text-[11px] font-semibold">Instant</span>
          </div>
        </div>

        {/* Plans */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-2.5">
            <PlanTile months={3}  monthly={m3}  apr="0%"   badge="Most Popular" highlight />
            <PlanTile months={12} monthly={m12} apr="~15%" />
            <PlanTile months={24} monthly={m24} apr="~18%" />
          </div>

          {/* Trust */}
          <div className="flex items-center gap-3 text-[11px] text-zinc-500">
            <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-400" /> No credit impact</span>
            <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-[#00C2FF]" /> No hidden fees</span>
          </div>

          {showPrequal && (
            <button
              onClick={() => setModalOpen(true)}
              className="w-full font-bold py-3.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 text-white relative overflow-hidden group"
              style={{ background: "linear-gradient(135deg, #00C2FF, #0088CC)" }}
            >
              <Rocket className="w-4 h-4" />
              Check My Rate — 30 Seconds
              <ChevronRight className="w-4 h-4" />
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
            </button>
          )}

          <p className="text-zinc-600 text-[11px] text-center">
            Powered by <span className="text-zinc-500 font-medium">Affirm</span> · Soft check only · Rates based on creditworthiness
          </p>
        </div>
      </div>
      {modalOpen && <PrequalModal amount={amount} m3={m3} m12={m12} m24={m24} onClose={() => setModalOpen(false)} context={context} />}
    </>
  );
}

// ── SUB-COMPONENTS ────────────────────────────────────────────────────────────

function LaunchPayBadge({ size = "sm" }: { size?: "xs" | "sm" | "lg" }) {
  const sizes = { xs: "text-xs gap-1", sm: "text-sm gap-1.5", lg: "text-xl gap-2" };
  const iconSizes = { xs: "w-3 h-3", sm: "w-3.5 h-3.5", lg: "w-5 h-5" };
  return (
    <span className={`inline-flex items-center font-black tracking-tight ${sizes[size]}`}>
      <Rocket className={`${iconSizes[size]} text-[#00C2FF]`} />
      <span className="text-white">Launch</span>
      <span style={{ color: "#00C2FF" }}>Pay</span>
    </span>
  );
}

function PlanTile({ months, monthly, apr, badge, highlight = false }: {
  months: number; monthly: number; apr: string; badge?: string; highlight?: boolean;
}) {
  return (
    <div className={`relative rounded-xl border p-3 text-center transition-all ${
      highlight
        ? "border-[#00C2FF]/40 bg-[#00C2FF]/8"
        : "border-zinc-700/80 bg-zinc-800/60"
    }`}>
      {badge && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap text-white"
          style={{ background: "linear-gradient(135deg, #00C2FF, #0088CC)" }}>
          {badge}
        </div>
      )}
      <p className={`text-lg font-black mt-1 ${highlight ? "text-[#00C2FF]" : "text-white"}`}>
        ${monthly}
      </p>
      <p className="text-zinc-500 text-[10px]">/mo</p>
      <p className="text-zinc-500 text-[10px] mt-0.5">{months}mo · {apr}</p>
    </div>
  );
}

function HeroPlanTile({ months, monthly, apr, highlight = false }: {
  months: number; monthly: number; apr: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-3 text-center ${
      highlight ? "border-[#00C2FF]/50 bg-[#00C2FF]/10" : "border-white/8 bg-white/4"
    }`}>
      <p className={`text-base font-black ${highlight ? "text-[#00C2FF]" : "text-white"}`}>${monthly}<span className="text-xs font-normal text-zinc-500">/mo</span></p>
      <p className="text-zinc-500 text-[10px] mt-0.5">{months}mo · {apr}</p>
    </div>
  );
}

function PrequalModal({ amount, m3, m12, m24, onClose, context }: {
  amount: number; m3: number; m12: number; m24: number;
  onClose: () => void; context: string;
}) {
  const ctaCopy = {
    customer: "Get Pre-Approved Now",
    dealer: "Show Customer Their Rate",
    affiliate: "Share Financing Link",
  }[context] ?? "Get Pre-Approved Now";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-sm rounded-3xl overflow-hidden"
        style={{ background: "linear-gradient(145deg, #0d1f3c, #071322)", border: "1px solid rgba(0,194,255,0.25)" }}>

        {/* Top glow line */}
        <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#00C2FF]/60 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <LaunchPayBadge size="sm" />
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/8 hover:bg-white/15 flex items-center justify-center transition-colors">
            <X className="w-3.5 h-3.5 text-zinc-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Amount */}
          <div className="rounded-2xl border border-white/8 bg-white/4 p-4 text-center">
            <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Project Total</p>
            <p className="text-4xl font-black text-white">${amount.toLocaleString()}</p>
          </div>

          {/* Plans */}
          <div className="space-y-2.5">
            <ModalRow months={3}  monthly={m3}  label="0% APR · Interest-Free" highlight />
            <ModalRow months={12} monthly={m12} label="~15% APR" />
            <ModalRow months={24} monthly={m24} label="~18% APR" />
          </div>

          {/* Trust grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: "✓", text: "No credit score impact" },
              { icon: "✓", text: "No late fees, ever" },
              { icon: "✓", text: "Instant decision" },
              { icon: "✓", text: "No origination fees" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-zinc-400">
                <span className="text-green-400 font-bold">{item.icon}</span>
                {item.text}
              </div>
            ))}
          </div>

          {/* CTA */}
          <a
            href="https://www.affirm.com/apps/prequal"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full font-bold py-4 rounded-2xl text-sm flex items-center justify-center gap-2 text-white relative overflow-hidden group"
            style={{ background: "linear-gradient(135deg, #00C2FF, #0088CC)" }}
          >
            <Rocket className="w-4 h-4" />
            {ctaCopy}
            <ChevronRight className="w-4 h-4" />
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
          </a>

          <p className="text-zinc-600 text-[10px] text-center leading-relaxed">
            Financing powered by <span className="text-zinc-500">Affirm</span> · Rates are estimates based on creditworthiness.
            Checking qualification does not affect your credit score.
            Loans made by Affirm's lending partners.
          </p>
        </div>
      </div>
    </div>
  );
}

function ModalRow({ months, monthly, label, highlight = false }: {
  months: number; monthly: number; label: string; highlight?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between rounded-xl px-4 py-3 border ${
      highlight ? "border-[#00C2FF]/30 bg-[#00C2FF]/8" : "border-white/8 bg-white/4"
    }`}>
      <div>
        <p className="text-white font-semibold text-sm">{months}-month plan</p>
        <p className="text-zinc-500 text-xs">{label}</p>
      </div>
      <p className={`text-xl font-black ${highlight ? "text-[#00C2FF]" : "text-white"}`}>
        ${monthly}<span className="text-xs font-normal text-zinc-500">/mo</span>
      </p>
    </div>
  );
}
