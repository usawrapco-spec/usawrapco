'use client'
// app/pay/[token]/PayPageClient.tsx
// Mirrors Wrapmate's financing UX — dual "Pay Now" / "Pay Monthly" flow
// Wisetack primary, QuickSpark + Synchrony as secondary options

import { useState, useEffect } from 'react'
import {
  CheckCircle2, CreditCard, Shield, Clock, ChevronDown,
  ExternalLink, Phone, Mail, Banknote, TrendingDown,
  Star, ArrowRight, Info, Zap, Leaf
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────
interface LineItem {
  id: string; name: string; description?: string
  quantity: number; unit: string; unit_price: number
  extended_price: number; sort_order: number
}
interface Invoice {
  id: string; invoice_number: string; title: string | null; status: string
  total: number; subtotal: number; tax_amount: number; tax_percent: number
  amount_paid: number; balance_due: number; invoice_date: string; due_date: string | null
  notes: string | null; line_items_detail: LineItem[]; pay_link_token: string
  customers: { name: string; email: string | null; phone: string | null; company: string | null } | null
  projects: { title: string; vehicle_desc: string | null } | null
  payments: { amount: number; method: string; payment_date: string }[]
}
interface FinancingOption { months: number; apr: number; monthly: number; label: string; badge?: string }

// ─── Monthly payment calculator ─────────────────────────────────────────────
function calcMonthly(amount: number, months: number, apr: number): number {
  if (apr === 0) return amount / months
  const r = apr / 100 / 12
  return amount * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
}

function getFinancingOptions(amount: number): FinancingOption[] {
  return [
    { months: 3,  apr: 0,    monthly: calcMonthly(amount, 3,  0),    label: '3 months',  badge: '0% APR' },
    { months: 6,  apr: 0,    monthly: calcMonthly(amount, 6,  0),    label: '6 months',  badge: '0% APR' },
    { months: 12, apr: 8.9,  monthly: calcMonthly(amount, 12, 8.9),  label: '12 months', badge: 'Most Popular' },
    { months: 24, apr: 14.9, monthly: calcMonthly(amount, 24, 14.9), label: '24 months' },
    { months: 36, apr: 18.9, monthly: calcMonthly(amount, 36, 18.9), label: '36 months' },
    { months: 60, apr: 23.9, monthly: calcMonthly(amount, 60, 23.9), label: '60 months' },
  ]
}

const fmt  = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0)
const fmtN = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)

// ─── Main Component ──────────────────────────────────────────────────────────
export default function PayPageClient({
  invoice, token, wisetackMerchantUrl
}: {
  invoice: Invoice
  token: string
  wisetackMerchantUrl?: string
}) {
  const [payMode, setPayMode] = useState<'choose' | 'card' | 'financing'>('choose')
  const [selectedOption, setSelectedOption] = useState<FinancingOption | null>(null)
  const [showAllOptions, setShowAllOptions] = useState(false)
  const [paying, setPaying] = useState(false)
  const [successParam, setSuccessParam] = useState(false)

  const total   = parseFloat(invoice.total as any) || 0
  const paid    = parseFloat(invoice.amount_paid as any) || 0
  const balance = parseFloat(invoice.balance_due as any) || 0
  const isPaid  = invoice.status === 'paid' || balance <= 0
  const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date() && !isPaid

  const lineItems = Array.isArray(invoice.line_items_detail) ? invoice.line_items_detail : []
  const financingOptions = getFinancingOptions(balance)
  const defaultOption = financingOptions.find(o => o.badge === 'Most Popular') || financingOptions[0]

  const vehicleStr = invoice.projects?.vehicle_desc || null

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search)
      setSuccessParam(p.get('success') === 'true')
    }
    if (defaultOption) setSelectedOption(defaultOption)
  }, [])

  const handlePayNow = async () => {
    setPaying(true)
    try {
      const res = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id, token, amount: balance })
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (err) {
      console.error('Payment error:', err)
    } finally {
      setPaying(false)
    }
  }

  const handleApplyFinancing = () => {
    const baseUrl = wisetackMerchantUrl || 'https://www.wisetack.com/apply'
    const params = new URLSearchParams({
      amount: Math.round(balance).toString(),
      ...(invoice.customers?.phone ? { phone: invoice.customers.phone.replace(/\D/g, '') } : {}),
      ref: invoice.invoice_number || token,
    })
    window.open(`${baseUrl}?${params}`, '_blank')
  }

  if (isPaid || successParam) {
    return (
      <div className="min-h-screen bg-[#080810] flex flex-col">
        <TopBanner />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-sm w-full text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">All Paid Up!</h1>
            <p className="text-gray-400 mb-2">Invoice {invoice.invoice_number}</p>
            <p className="text-3xl font-bold text-emerald-400 mb-6">{fmt(total)}</p>
            <p className="text-sm text-gray-500">
              A receipt has been sent to {invoice.customers?.email || 'your email'}.
            </p>
            <p className="text-sm text-gray-500 mt-2">Thank you for choosing USA Wrap Co!</p>
          </div>
        </div>
        <Footer customer={invoice.customers} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      <TopBanner />
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">

        {/* Invoice Header */}
        <div className="bg-[#0e0e1a] border border-white/8 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[11px] font-mono text-gray-500 uppercase tracking-wider">
                  {invoice.invoice_number}
                </span>
                {isOverdue && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded font-semibold uppercase tracking-wide">
                    Overdue
                  </span>
                )}
              </div>
              <h1 className="text-base font-semibold text-white leading-tight">
                {invoice.title || invoice.projects?.title || 'Vehicle Wrap Services'}
              </h1>
              {vehicleStr && <p className="text-sm text-gray-500 mt-0.5">{vehicleStr}</p>}
              {invoice.customers?.company && (
                <p className="text-xs text-gray-600 mt-0.5">{invoice.customers.company}</p>
              )}
            </div>
            <div className="text-right ml-4 flex-shrink-0">
              <p className="text-[11px] text-gray-500 mb-0.5">Balance Due</p>
              <p className="text-2xl font-bold text-white tracking-tight">{fmtN(balance)}</p>
              {paid > 0 && <p className="text-xs text-emerald-500 mt-0.5">{fmtN(paid)} paid</p>}
            </div>
          </div>
          <div className="flex gap-4 pt-3 border-t border-white/5">
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider">Invoice Date</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {invoice.invoice_date ? new Date(invoice.invoice_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider">Due Date</p>
              <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-400 font-semibold' : 'text-gray-400'}`}>
                {invoice.due_date ? new Date(invoice.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Upon Receipt'}
              </p>
            </div>
            {invoice.customers?.name && (
              <div className="ml-auto text-right">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider">Billed To</p>
                <p className="text-xs text-gray-400 mt-0.5">{invoice.customers.name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Line Items */}
        {lineItems.length > 0 && (
          <div className="bg-[#0e0e1a] border border-white/8 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Services & Items</p>
            </div>
            <div className="divide-y divide-white/5">
              {lineItems.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map((item, idx) => (
                <div key={item.id || idx} className="flex items-start justify-between px-5 py-3">
                  <div className="flex-1 pr-4">
                    <p className="text-sm font-medium text-white">{item.name}</p>
                    {item.description && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.description}</p>}
                    {item.quantity !== 1 && (
                      <p className="text-xs text-gray-600 mt-1">{item.quantity} {item.unit} × {fmt(item.unit_price)}</p>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-white flex-shrink-0">
                    {fmt(item.extended_price || item.quantity * item.unit_price)}
                  </p>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 bg-white/2 border-t border-white/5 space-y-1.5">
              {(parseFloat(invoice.tax_amount as any) || 0) > 0 && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Tax ({invoice.tax_percent || 0}%)</span>
                  <span>{fmt(parseFloat(invoice.tax_amount as any))}</span>
                </div>
              )}
              {paid > 0 && (
                <div className="flex justify-between text-xs text-emerald-500">
                  <span>Payments received</span><span>−{fmt(paid)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-white pt-1 border-t border-white/8">
                <span>Balance Due</span><span>{fmt(balance)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── CHOOSE PAYMENT MODE ──────────────────────────────────────── */}
        {payMode === 'choose' && balance >= 200 && (
          <div className="space-y-3">
            {/* Pay in Full */}
            <button
              onClick={() => setPayMode('card')}
              className="w-full group relative overflow-hidden bg-[#0e0e1a] hover:bg-[#14142a] border border-white/10 hover:border-[#6366f1]/40 rounded-2xl p-5 text-left transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-[#6366f1]/15 border border-[#6366f1]/20 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-5 h-5 text-[#6366f1]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Pay in Full</p>
                    <p className="text-xs text-gray-500 mt-0.5">Credit / Debit · Apple Pay · Google Pay</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-white">{fmtN(balance)}</p>
                  <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-[#6366f1] transition-colors" />
                </div>
              </div>
            </button>

            {/* Pay Monthly — Wisetack */}
            {balance >= 500 && (
              <button
                onClick={() => setPayMode('financing')}
                className="w-full group relative overflow-hidden bg-[#0a1210] hover:bg-[#0c1a14] border border-emerald-500/25 hover:border-emerald-500/50 rounded-2xl p-5 text-left transition-all duration-200"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                <div className="flex items-start justify-between relative">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <TrendingDown className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-white">Pay Monthly</p>
                        <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/25 text-emerald-400 rounded font-bold">0% Available</span>
                      </div>
                      <p className="text-xs text-gray-500">No hard credit pull to check your rate</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-400">
                        {fmt(defaultOption?.monthly || 0)}<span className="text-xs text-gray-500 font-normal">/mo</span>
                      </p>
                      <p className="text-[10px] text-gray-600">from {defaultOption?.months} mo</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-emerald-400 transition-colors" />
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5 relative">
                  <div className="flex -space-x-1">
                    {['bg-blue-500','bg-purple-500','bg-pink-500','bg-orange-400'].map((c,i) => (
                      <div key={i} className={`w-5 h-5 rounded-full ${c} border border-[#0a1210] flex items-center justify-center text-[8px] text-white font-bold`}>
                        {['JM','SR','KL','DW'][i]}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-500">88% of customers were happy they chose monthly payments</p>
                </div>
              </button>
            )}

            <div className="flex items-center justify-center gap-5 py-1">
              <span className="flex items-center gap-1.5 text-[10px] text-gray-600"><Shield className="w-3 h-3" /> SSL Secured</span>
              <span className="flex items-center gap-1.5 text-[10px] text-gray-600"><Clock className="w-3 h-3" /> Instant receipt</span>
              <span className="flex items-center gap-1.5 text-[10px] text-gray-600"><Star className="w-3 h-3" /> 5-star rated</span>
            </div>
          </div>
        )}

        {/* ── PAY IN FULL CARD FLOW ────────────────────────────────────── */}
        {payMode === 'card' && (
          <div className="space-y-3">
            <button onClick={() => setPayMode('choose')} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">← Back</button>
            <div className="bg-[#0e0e1a] border border-white/8 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[#6366f1]/15 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-[#6366f1]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Pay in Full</p>
                  <p className="text-xs text-gray-500">Secure checkout via Stripe</p>
                </div>
                <div className="ml-auto">
                  <p className="text-xl font-bold text-white">{fmt(balance)}</p>
                </div>
              </div>
              <button
                onClick={handlePayNow}
                disabled={paying}
                className="w-full flex items-center justify-center gap-3 bg-[#6366f1] hover:bg-[#5558d9] disabled:opacity-60 text-white font-semibold py-4 rounded-xl text-base transition-colors"
              >
                {paying ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Redirecting...</>
                ) : (
                  <><CreditCard className="w-4 h-4" /> Pay {fmt(balance)} Now</>
                )}
              </button>
              <p className="text-center text-[10px] text-gray-600 mt-3">Secured by Stripe · Cards, Apple Pay, Google Pay accepted</p>
            </div>
            {balance >= 500 && (
              <button onClick={() => setPayMode('financing')} className="w-full text-center text-xs text-emerald-500 hover:text-emerald-400 py-2 transition-colors">
                Or pay from {fmt(defaultOption?.monthly || 0)}/mo with financing →
              </button>
            )}
          </div>
        )}

        {/* ── WISETACK FINANCING FLOW ──────────────────────────────────── */}
        {payMode === 'financing' && balance >= 500 && (
          <div className="space-y-3">
            <button onClick={() => setPayMode('choose')} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">← Back</button>

            <div className="bg-[#08110e] border border-emerald-500/25 rounded-2xl overflow-hidden">
              {/* Wisetack header */}
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Wisetack Financing</p>
                      <p className="text-[10px] text-emerald-400/70">Backed by U.S. Bank · Powered by Wisetack</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_,i) => <Star key={i} className="w-3 h-3 text-amber-400 fill-current" />)}
                  </div>
                </div>
              </div>

              {/* Plan Selector */}
              <div className="px-5 pb-2">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-3">Select Your Plan</p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {financingOptions.slice(0, showAllOptions ? 6 : 4).map(opt => (
                    <button
                      key={opt.months}
                      onClick={() => setSelectedOption(opt)}
                      className={`relative text-left p-3.5 rounded-xl border transition-all duration-150 ${
                        selectedOption?.months === opt.months
                          ? 'bg-emerald-500/15 border-emerald-500/50'
                          : 'bg-white/3 border-white/8 hover:border-white/15'
                      }`}
                    >
                      {opt.badge && (
                        <span className={`absolute -top-1.5 left-2.5 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${
                          opt.badge === '0% APR' ? 'bg-emerald-500 text-white' : 'bg-[#6366f1] text-white'
                        }`}>{opt.badge}</span>
                      )}
                      <p className="text-base font-bold text-white mt-1">{fmt(opt.monthly)}<span className="text-[10px] font-normal text-gray-500">/mo</span></p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{opt.label}</p>
                      {opt.apr === 0
                        ? <p className="text-[9px] text-emerald-400">Interest free</p>
                        : <p className="text-[9px] text-gray-600">{opt.apr}% APR</p>
                      }
                    </button>
                  ))}
                </div>
                {!showAllOptions && (
                  <button onClick={() => setShowAllOptions(true)} className="w-full text-[10px] text-gray-600 hover:text-gray-400 py-1.5 flex items-center justify-center gap-1 transition-colors">
                    <ChevronDown className="w-3 h-3" /> Show more (up to 60 months)
                  </button>
                )}
              </div>

              {/* Selected plan summary */}
              {selectedOption && (
                <div className="mx-5 mb-4 p-3.5 bg-white/4 rounded-xl border border-white/8">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs"><span className="text-gray-500">Total financed</span><span className="text-white font-medium">{fmt(balance)}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-gray-500">Plan</span><span className="text-white">{selectedOption.months} monthly payments</span></div>
                    {selectedOption.apr === 0
                      ? <div className="flex justify-between text-xs"><span className="text-gray-500">Interest</span><span className="text-emerald-400 font-medium">$0.00 — Interest free</span></div>
                      : <div className="flex justify-between text-xs"><span className="text-gray-500">Total repaid</span><span className="text-gray-300">{fmt(selectedOption.monthly * selectedOption.months)}</span></div>
                    }
                    <div className="flex justify-between items-center pt-2 mt-1 border-t border-white/8">
                      <span className="text-xs text-gray-400">Your monthly payment</span>
                      <span className="text-xl font-bold text-emerald-400">{fmt(selectedOption.monthly)}<span className="text-xs text-gray-500 font-normal">/mo</span></span>
                    </div>
                  </div>
                </div>
              )}

              {/* Main CTA */}
              <div className="px-5 pb-5">
                <button
                  onClick={handleApplyFinancing}
                  className="w-full flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 rounded-xl text-base transition-colors shadow-lg shadow-emerald-500/20"
                >
                  <Zap className="w-5 h-5" />
                  Check My Rate — No Credit Impact
                </button>
                <p className="text-center text-[10px] text-gray-600 mt-2.5 leading-relaxed">
                  60-second application · Soft pull only · Instant decision 24/7<br />
                  Approval from {fmt(calcMonthly(balance, 60, 23.9))}/mo · {fmt(balance)} financed
                </p>
              </div>

              {/* How it works */}
              <div className="border-t border-white/5 px-5 py-4">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-3">How It Works</p>
                <div className="space-y-3">
                  {[
                    { n: '1', text: 'Apply in 60 seconds — soft credit check, no impact to score', color: 'bg-[#6366f1]/20 text-[#818cf8]' },
                    { n: '2', text: 'Get an instant decision and pick the plan that fits your budget', color: 'bg-emerald-500/20 text-emerald-400' },
                    { n: '3', text: 'USA Wrap Co gets paid immediately. You pay Wisetack monthly.', color: 'bg-amber-500/20 text-amber-400' },
                  ].map(s => (
                    <div key={s.n} className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded-full ${s.color} flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5`}>{s.n}</div>
                      <p className="text-xs text-gray-400 leading-relaxed">{s.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Disclaimer */}
              <div className="px-5 pb-5">
                <p className="text-[9px] text-gray-700 leading-relaxed">
                  *All financing is subject to credit approval. Your terms may vary. Payment options through Wisetack are provided by our lending partners. For example, a {fmt(balance)} purchase could cost {fmt(calcMonthly(balance, 12, 8.9))}/mo for 12 months based on 8.9% APR. Offers range 0–35.9% APR based on creditworthiness. State interest rate caps may apply. No other financing charges or participation fees. See wisetack.com/faqs.
                </p>
              </div>
            </div>

            <button onClick={() => setPayMode('card')} className="w-full text-center text-xs text-gray-600 hover:text-gray-400 py-2 transition-colors">
              Or pay {fmt(balance)} in full →
            </button>

            {/* Other providers */}
            <OtherProviders />
          </div>
        )}

        {/* Simple pay for small amounts */}
        {payMode === 'choose' && balance > 0 && balance < 200 && (
          <button onClick={handlePayNow} disabled={paying} className="w-full flex items-center justify-center gap-3 bg-[#6366f1] hover:bg-[#5558d9] disabled:opacity-60 text-white font-semibold py-4 rounded-xl text-base transition-colors">
            <CreditCard className="w-4 h-4" />
            {paying ? 'Redirecting...' : `Pay ${fmt(balance)}`}
          </button>
        )}
        {payMode === 'choose' && balance >= 200 && balance < 500 && (
          <div className="space-y-2">
            <button onClick={() => setPayMode('card')} className="w-full flex items-center justify-center gap-2 bg-[#6366f1] hover:bg-[#5558d9] text-white font-semibold py-4 rounded-xl text-base transition-colors">
              <CreditCard className="w-4 h-4" /> Pay {fmt(balance)}
            </button>
            <p className="text-center text-xs text-gray-600">Monthly financing available on balances $500+</p>
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div className="bg-[#0e0e1a] border border-white/8 rounded-2xl p-4">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Notes from USA Wrap Co</p>
            <p className="text-sm text-gray-400 leading-relaxed">{invoice.notes}</p>
          </div>
        )}
      </div>

      <Footer customer={invoice.customers} />
    </div>
  )
}

function OtherProviders() {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-[#0e0e1a] border border-white/8 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-gray-500" />
          <p className="text-xs text-gray-500">Other financing options</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-white/5 p-4 space-y-4">
          {[
            { emoji: '⚡', name: 'QuickSpark / TimePayment', badge: 'Best for Businesses', color: 'text-blue-400 bg-blue-400/10', desc: 'Equipment financing — wraps qualify as Section 179 deductible. 12–60 months. Approves most businesses even with low credit.', url: 'https://www.quickspark.com' },
            { emoji: '💳', name: 'Synchrony Car Care', badge: 'Consumer Card', color: 'text-purple-400 bg-purple-400/10', desc: 'Promotional 0% APR financing card. Works at automotive service locations nationwide. Apply in minutes online.', url: 'https://www.mysynchrony.com' },
          ].map(p => (
            <div key={p.name} className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0 mt-0.5">{p.emoji}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="text-sm font-medium text-white">{p.name}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${p.color}`}>{p.badge}</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{p.desc}</p>
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs text-[#6366f1] hover:text-[#818cf8]">
                  Apply <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TopBanner() {
  return (
    <div className="bg-[#0d0d1a] border-b border-white/5 py-3 px-4">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#6366f1] flex items-center justify-center">
            <Leaf className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-white">USA Wrap Co</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <Shield className="w-3 h-3" /> Secure Payment Portal
        </div>
      </div>
    </div>
  )
}

function Footer({ customer }: { customer: any }) {
  return (
    <div className="text-center py-8 px-4 space-y-1.5">
      <p className="text-xs font-medium text-gray-500">USA Wrap Co · Gig Harbor, WA</p>
      <div className="flex items-center justify-center gap-4 text-[10px] text-gray-700">
        <a href="mailto:fleet@usawrapco.com" className="flex items-center gap-1 hover:text-gray-500 transition-colors"><Mail className="w-3 h-3" /> fleet@usawrapco.com</a>
        <a href="tel:+12535550000" className="flex items-center gap-1 hover:text-gray-500 transition-colors"><Phone className="w-3 h-3" /> (253) 555-0000</a>
      </div>
      <p className="text-[9px] text-gray-800 mt-2">© 2026 USA Wrap Co · Payments secured by Stripe · Financing by Wisetack</p>
    </div>
  )
}
