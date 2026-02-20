'use client'

import { useState, useEffect, useCallback } from 'react'
import { Receipt } from 'lucide-react'
import type { Profile } from '@/types'

// ─── 2024 Federal Tax Brackets (Single Filer) ────────────────────────────────
const FEDERAL_BRACKETS = [
  { min: 0,       max: 11600,   rate: 0.10 },
  { min: 11600,   max: 47150,   rate: 0.12 },
  { min: 47150,   max: 100525,  rate: 0.22 },
  { min: 100525,  max: 191950,  rate: 0.24 },
  { min: 191950,  max: 243725,  rate: 0.32 },
  { min: 243725,  max: 609350,  rate: 0.35 },
  { min: 609350,  max: Infinity, rate: 0.37 },
]

const STANDARD_DEDUCTION = 14600 // 2024 single filer
const MILEAGE_RATE = 0.67        // 2024 IRS standard mileage rate
const SE_TAX_RATE = 0.153        // 15.3% self-employment tax
const SE_TAXABLE_PCT = 0.9235    // 92.35% of net earnings subject to SE tax

// Quarterly payment due dates
const QUARTERLY_DATES = [
  { quarter: 'Q1', due: 'Apr 15, 2025', period: 'Jan 1 - Mar 31' },
  { quarter: 'Q2', due: 'Jun 15, 2025', period: 'Apr 1 - May 31' },
  { quarter: 'Q3', due: 'Sep 15, 2025', period: 'Jun 1 - Aug 31' },
  { quarter: 'Q4', due: 'Jan 15, 2026', period: 'Sep 1 - Dec 31' },
]

interface TaxInputs {
  totalEarnings: string
  businessExpenses: string
  milesDriven: string
  officeSqft: string
  homeSqft: string
  rentMortgage: string
  stateTaxRate: string
  filingStatus: 'single' | 'married'
}

const DEFAULT_INPUTS: TaxInputs = {
  totalEarnings: '',
  businessExpenses: '',
  milesDriven: '',
  officeSqft: '',
  homeSqft: '',
  rentMortgage: '',
  stateTaxRate: '0',
  filingStatus: 'single',
}

function calcFederalTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0
  let tax = 0
  for (const bracket of FEDERAL_BRACKETS) {
    if (taxableIncome <= bracket.min) break
    const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min
    tax += taxableInBracket * bracket.rate
  }
  return tax
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtWhole(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function TaxCalculatorClient({ profile }: { profile: Profile }) {
  const storageKey = `usawrap_1099_${profile.org_id}`

  const [inputs, setInputs] = useState<TaxInputs>(DEFAULT_INPUTS)
  const [calculated, setCalculated] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        setInputs((prev) => ({ ...prev, ...parsed }))
      }
    } catch {
      // ignore parse errors
    }
  }, [storageKey])

  // Save to localStorage whenever inputs change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(inputs))
    } catch {
      // ignore quota errors
    }
  }, [inputs, storageKey])

  const update = useCallback((field: keyof TaxInputs, value: string) => {
    setInputs((prev) => ({ ...prev, [field]: value }))
  }, [])

  // ─── Calculations ────────────────────────────────────────────────────────────
  const totalEarnings = parseFloat(inputs.totalEarnings) || 0
  const businessExpenses = parseFloat(inputs.businessExpenses) || 0
  const milesDriven = parseFloat(inputs.milesDriven) || 0
  const officeSqft = parseFloat(inputs.officeSqft) || 0
  const homeSqft = parseFloat(inputs.homeSqft) || 0
  const rentMortgage = parseFloat(inputs.rentMortgage) || 0
  const stateTaxRate = parseFloat(inputs.stateTaxRate) || 0

  // Deductions
  const mileageDeduction = milesDriven * MILEAGE_RATE
  const homeOfficeDeduction = homeSqft > 0 ? (officeSqft / homeSqft) * rentMortgage * 12 : 0
  const totalDeductions = businessExpenses + mileageDeduction + homeOfficeDeduction

  // Net earnings
  const netEarnings = Math.max(0, totalEarnings - totalDeductions)

  // Self-employment tax
  const seTaxableAmount = netEarnings * SE_TAXABLE_PCT
  const selfEmploymentTax = seTaxableAmount * SE_TAX_RATE

  // Half of SE tax is deductible for income tax purposes
  const seDeduction = selfEmploymentTax / 2

  // Adjusted gross income for federal tax
  const agi = Math.max(0, netEarnings - seDeduction)

  // Taxable income after standard deduction
  const taxableIncome = Math.max(0, agi - STANDARD_DEDUCTION)

  // Federal income tax
  const federalIncomeTax = calcFederalTax(taxableIncome)

  // State income tax
  const stateTax = agi * (stateTaxRate / 100)

  // Total tax liability
  const totalTax = selfEmploymentTax + federalIncomeTax + stateTax

  // Effective tax rate
  const effectiveRate = totalEarnings > 0 ? (totalTax / totalEarnings) * 100 : 0

  // Quarterly payment
  const quarterlyPayment = totalTax / 4

  // Marginal bracket
  const currentBracket = FEDERAL_BRACKETS.find(
    (b) => taxableIncome >= b.min && taxableIncome < b.max
  )
  const marginalRate = currentBracket ? currentBracket.rate * 100 : 0

  // ─── Input field component ──────────────────────────────────────────────────
  const InputField = ({
    label,
    field,
    prefix = '',
    suffix = '',
    placeholder = '0',
  }: {
    label: string
    field: keyof TaxInputs
    prefix?: string
    suffix?: string
    placeholder?: string
  }) => (
    <div>
      <label className="field-label">{label}</label>
      <div className="relative">
        {prefix && (
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text3 text-sm font-mono"
          >
            {prefix}
          </span>
        )}
        <input
          type="number"
          className="field font-mono"
          style={{
            paddingLeft: prefix ? '1.5rem' : undefined,
            paddingRight: suffix ? '3rem' : undefined,
          }}
          value={inputs[field]}
          onChange={(e) => update(field, e.target.value)}
          placeholder={placeholder}
        />
        {suffix && (
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text3 text-xs"
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto space-y-6 anim-fade-up">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--purple)', opacity: 0.9 }}
        >
          <Receipt size={20} className="text-white" />
        </div>
        <div>
          <h1
            className="text-2xl font-extrabold text-text1 tracking-tight"
            style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
          >
            1099 Tax Calculator
          </h1>
          <p className="text-sm text-text3">
            Estimate self-employment taxes &amp; quarterly payments (2024 rates)
          </p>
        </div>
      </div>

      {/* ─── Input Section ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income & Expenses */}
        <div className="card space-y-4">
          <div className="section-label">Income &amp; Expenses</div>

          <InputField
            label="Total 1099 Earnings"
            field="totalEarnings"
            prefix="$"
            placeholder="0.00"
          />
          <InputField
            label="Business Expenses"
            field="businessExpenses"
            prefix="$"
            placeholder="0.00"
          />
          <div>
            <label className="field-label">State Tax Rate</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                className="field font-mono w-28"
                value={inputs.stateTaxRate}
                onChange={(e) => update('stateTaxRate', e.target.value)}
                placeholder="0"
                min="0"
                max="15"
                step="0.1"
              />
              <span className="text-text3 text-xs">% (0% = no state income tax)</span>
            </div>
          </div>
        </div>

        {/* Deductions */}
        <div className="card space-y-4">
          <div className="section-label">Deductions</div>

          <InputField
            label="Mileage (Miles Driven)"
            field="milesDriven"
            suffix="miles"
            placeholder="0"
          />
          <p className="text-xs text-text3 -mt-2">
            IRS standard rate: ${MILEAGE_RATE}/mile (2024)
          </p>

          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="Office Space"
              field="officeSqft"
              suffix="sqft"
              placeholder="0"
            />
            <InputField
              label="Total Home"
              field="homeSqft"
              suffix="sqft"
              placeholder="0"
            />
          </div>

          <InputField
            label="Monthly Rent / Mortgage"
            field="rentMortgage"
            prefix="$"
            placeholder="0.00"
          />
          {officeSqft > 0 && homeSqft > 0 && (
            <p className="text-xs text-text3 -mt-2">
              Office ratio: {((officeSqft / homeSqft) * 100).toFixed(1)}% of home
            </p>
          )}
        </div>
      </div>

      {/* ─── Calculate Button ───────────────────────────────────────────────── */}
      <div className="flex justify-center">
        <button
          className="btn-primary px-8 py-3 text-base font-bold"
          style={{ fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.5px' }}
          onClick={() => setCalculated(true)}
        >
          Calculate Tax Estimate
        </button>
      </div>

      {/* ─── Results ────────────────────────────────────────────────────────── */}
      {calculated && totalEarnings > 0 && (
        <div className="space-y-6 anim-fade-up">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Tax Liability */}
            <div className="card text-center">
              <div className="text-xs font-bold text-text3 uppercase tracking-widest mb-2">
                Total Tax Liability
              </div>
              <div
                className="text-3xl font-bold mono"
                style={{ color: 'var(--red)', fontFamily: 'JetBrains Mono, monospace' }}
              >
                ${fmt(totalTax)}
              </div>
              <div className="flex justify-center gap-2 mt-2">
                <span className="badge-purple text-xs">
                  SE ${fmt(selfEmploymentTax)}
                </span>
                <span className="badge-accent text-xs">
                  Fed ${fmt(federalIncomeTax)}
                </span>
                {stateTax > 0 && (
                  <span className="badge-amber text-xs">
                    State ${fmt(stateTax)}
                  </span>
                )}
              </div>
            </div>

            {/* Effective Tax Rate */}
            <div className="card text-center">
              <div className="text-xs font-bold text-text3 uppercase tracking-widest mb-2">
                Effective Tax Rate
              </div>
              <div
                className="text-3xl font-bold"
                style={{
                  color: effectiveRate > 30 ? 'var(--red)' : effectiveRate > 20 ? 'var(--amber)' : 'var(--green)',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                {effectiveRate.toFixed(1)}%
              </div>
              <div className="text-xs text-text3 mt-2">
                Marginal bracket: {marginalRate}%
              </div>
            </div>

            {/* Quarterly Payment */}
            <div className="card text-center">
              <div className="text-xs font-bold text-text3 uppercase tracking-widest mb-2">
                Quarterly Payment
              </div>
              <div
                className="text-3xl font-bold"
                style={{ color: 'var(--cyan)', fontFamily: 'JetBrains Mono, monospace' }}
              >
                ${fmt(quarterlyPayment)}
              </div>
              <div className="text-xs text-text3 mt-2">
                4 payments / year
              </div>
            </div>
          </div>

          {/* ─── Deduction Breakdown ──────────────────────────────────────────── */}
          <div className="card">
            <div className="section-label">Deduction Breakdown</div>
            <div className="space-y-2">
              {[
                { label: 'Business Expenses', value: businessExpenses, color: 'var(--accent)' },
                { label: `Mileage Deduction (${fmtWhole(milesDriven)} mi x $${MILEAGE_RATE})`, value: mileageDeduction, color: 'var(--cyan)' },
                { label: `Home Office Deduction (${officeSqft > 0 && homeSqft > 0 ? ((officeSqft / homeSqft) * 100).toFixed(1) : 0}% of $${fmt(rentMortgage * 12)}/yr)`, value: homeOfficeDeduction, color: 'var(--purple)' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-text2">{item.label}</span>
                  <span className="mono text-sm font-semibold" style={{ color: item.color, fontFamily: 'JetBrains Mono, monospace' }}>
                    -${fmt(item.value)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between items-center py-2 border-t border-border">
                <span className="text-sm font-bold text-text1">Total Deductions</span>
                <span className="mono text-sm font-bold" style={{ color: 'var(--green)', fontFamily: 'JetBrains Mono, monospace' }}>
                  -${fmt(totalDeductions)}
                </span>
              </div>
            </div>
          </div>

          {/* ─── Tax Breakdown ────────────────────────────────────────────────── */}
          <div className="card">
            <div className="section-label">Tax Computation</div>
            <div className="space-y-2">
              {[
                { label: 'Gross 1099 Earnings', value: totalEarnings, color: 'var(--text1)', bold: true },
                { label: 'Total Deductions', value: -totalDeductions, color: 'var(--green)', bold: false },
                { label: 'Net Earnings', value: netEarnings, color: 'var(--cyan)', bold: true },
                { label: `SE Taxable (${(SE_TAXABLE_PCT * 100).toFixed(2)}% of net)`, value: seTaxableAmount, color: 'var(--text2)', bold: false },
                { label: `Self-Employment Tax (${(SE_TAX_RATE * 100).toFixed(1)}%)`, value: selfEmploymentTax, color: 'var(--purple)', bold: false },
                { label: 'SE Tax Deduction (50%)', value: -seDeduction, color: 'var(--green)', bold: false },
                { label: 'Adjusted Gross Income', value: agi, color: 'var(--text1)', bold: true },
                { label: `Standard Deduction (${inputs.filingStatus === 'single' ? 'Single' : 'MFJ'})`, value: -STANDARD_DEDUCTION, color: 'var(--green)', bold: false },
                { label: 'Taxable Income', value: taxableIncome, color: 'var(--amber)', bold: true },
                { label: 'Federal Income Tax', value: federalIncomeTax, color: 'var(--accent)', bold: false },
                ...(stateTax > 0 ? [{ label: `State Tax (${stateTaxRate}%)`, value: stateTax, color: 'var(--amber)', bold: false }] : []),
              ].map((item, i) => (
                <div
                  key={i}
                  className={`flex justify-between items-center py-2 ${item.bold ? 'border-t border-border' : 'border-b border-border/30'}`}
                >
                  <span className={`text-sm ${item.bold ? 'font-bold text-text1' : 'text-text2'}`}>
                    {item.label}
                  </span>
                  <span
                    className={`text-sm ${item.bold ? 'font-bold' : 'font-semibold'}`}
                    style={{ color: item.color, fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {item.value < 0 ? '-' : ''}${fmt(Math.abs(item.value))}
                  </span>
                </div>
              ))}
              <div className="flex justify-between items-center py-3 border-t-2 border-border mt-2">
                <span className="text-base font-extrabold text-text1" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
                  TOTAL TAX LIABILITY
                </span>
                <span
                  className="text-xl font-bold"
                  style={{ color: 'var(--red)', fontFamily: 'JetBrains Mono, monospace' }}
                >
                  ${fmt(totalTax)}
                </span>
              </div>
            </div>
          </div>

          {/* ─── Federal Bracket Visualization ────────────────────────────────── */}
          <div className="card">
            <div className="section-label">Federal Tax Brackets (2024 Single)</div>
            <div className="space-y-1.5">
              {FEDERAL_BRACKETS.filter((b) => b.max !== Infinity || taxableIncome > b.min).map((bracket) => {
                const bracketWidth = bracket.max === Infinity
                  ? Math.max(taxableIncome - bracket.min, 0)
                  : bracket.max - bracket.min
                const filled = Math.min(Math.max(taxableIncome - bracket.min, 0), bracketWidth)
                const fillPct = bracketWidth > 0 ? (filled / bracketWidth) * 100 : 0
                const taxInBracket = filled * bracket.rate
                const isActive = taxableIncome > bracket.min

                return (
                  <div
                    key={bracket.min}
                    className="flex items-center gap-3"
                    style={{ opacity: isActive ? 1 : 0.4 }}
                  >
                    <span className="text-xs text-text3 w-10 text-right mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      {(bracket.rate * 100).toFixed(0)}%
                    </span>
                    <div className="flex-1 h-5 rounded bg-surface2 overflow-hidden relative">
                      <div
                        className="h-full rounded transition-all duration-500"
                        style={{
                          width: `${fillPct}%`,
                          background: `linear-gradient(90deg, var(--accent), var(--purple))`,
                        }}
                      />
                    </div>
                    <span
                      className="text-xs w-24 text-right mono"
                      style={{
                        color: isActive ? 'var(--text1)' : 'var(--text3)',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      ${fmt(taxInBracket)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ─── Quarterly Payment Schedule ───────────────────────────────────── */}
          <div className="card">
            <div className="section-label">Quarterly Payment Schedule</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {QUARTERLY_DATES.map((q) => (
                <div
                  key={q.quarter}
                  className="rounded-xl p-4 border border-border/50 text-center"
                  style={{ background: 'var(--surface2)' }}
                >
                  <div
                    className="text-lg font-extrabold mb-1"
                    style={{ color: 'var(--cyan)', fontFamily: 'Barlow Condensed, sans-serif' }}
                  >
                    {q.quarter}
                  </div>
                  <div
                    className="text-xl font-bold mono mb-2"
                    style={{ color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    ${fmt(quarterlyPayment)}
                  </div>
                  <div className="text-xs text-text3 font-semibold">{q.due}</div>
                  <div className="text-xs text-text3 mt-0.5">{q.period}</div>
                </div>
              ))}
            </div>
            <div
              className="mt-4 p-3 rounded-lg border border-border/50 flex items-center justify-between"
              style={{ background: 'rgba(79, 127, 255, 0.06)' }}
            >
              <span className="text-sm font-semibold text-text2">Annual Total (4 quarters)</span>
              <span
                className="text-lg font-bold"
                style={{ color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}
              >
                ${fmt(totalTax)}
              </span>
            </div>
          </div>

          {/* ─── Take-Home Summary ────────────────────────────────────────────── */}
          <div className="card" style={{ background: 'linear-gradient(135deg, var(--surface), var(--surface2))' }}>
            <div className="section-label">Take-Home Summary</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Gross Income', value: totalEarnings, color: 'var(--text1)' },
                { label: 'Deductions', value: totalDeductions, color: 'var(--green)' },
                { label: 'Total Tax', value: totalTax, color: 'var(--red)' },
                { label: 'Take-Home', value: Math.max(0, totalEarnings - totalDeductions - totalTax), color: 'var(--cyan)' },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <div className="text-xs font-bold text-text3 uppercase tracking-widest mb-1">
                    {item.label}
                  </div>
                  <div
                    className="text-xl font-bold"
                    style={{ color: item.color, fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    ${fmt(item.value)}
                  </div>
                </div>
              ))}
            </div>
            {/* Visual bar */}
            <div className="mt-4 h-3 rounded-full overflow-hidden flex" style={{ background: 'var(--surface)' }}>
              {totalEarnings > 0 && (
                <>
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${(totalDeductions / totalEarnings) * 100}%`,
                      background: 'var(--green)',
                      opacity: 0.7,
                    }}
                    title={`Deductions: ${((totalDeductions / totalEarnings) * 100).toFixed(1)}%`}
                  />
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${(totalTax / totalEarnings) * 100}%`,
                      background: 'var(--red)',
                      opacity: 0.7,
                    }}
                    title={`Tax: ${((totalTax / totalEarnings) * 100).toFixed(1)}%`}
                  />
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${(Math.max(0, totalEarnings - totalDeductions - totalTax) / totalEarnings) * 100}%`,
                      background: 'var(--cyan)',
                      opacity: 0.7,
                    }}
                    title={`Take-Home: ${((Math.max(0, totalEarnings - totalDeductions - totalTax) / totalEarnings) * 100).toFixed(1)}%`}
                  />
                </>
              )}
            </div>
            <div className="flex justify-between mt-1.5 text-xs text-text3">
              <span>Deductions ({totalEarnings > 0 ? ((totalDeductions / totalEarnings) * 100).toFixed(1) : 0}%)</span>
              <span>Tax ({effectiveRate.toFixed(1)}%)</span>
              <span>Take-Home ({totalEarnings > 0 ? ((Math.max(0, totalEarnings - totalDeductions - totalTax) / totalEarnings) * 100).toFixed(1) : 0}%)</span>
            </div>
          </div>

          {/* ─── Reset Button ─────────────────────────────────────────────────── */}
          <div className="flex justify-center">
            <button
              className="btn-ghost"
              onClick={() => {
                setInputs(DEFAULT_INPUTS)
                setCalculated(false)
              }}
            >
              Reset Calculator
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
