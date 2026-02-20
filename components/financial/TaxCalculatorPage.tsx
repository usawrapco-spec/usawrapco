'use client'

import { useState } from 'react'
import {
  Receipt,
  Calculator,
  DollarSign,
  Car,
  Home,
  Printer,
  TrendingDown,
  FileText,
  Info,
} from 'lucide-react'

interface TaxCalculatorPageProps {
  profile: any
}

const MILEAGE_RATE = 0.67

const FEDERAL_BRACKETS = [
  { min: 0,       max: 11000,   rate: 0.10 },
  { min: 11000,   max: 44725,   rate: 0.12 },
  { min: 44725,   max: 95375,   rate: 0.22 },
  { min: 95375,   max: 182100,  rate: 0.24 },
  { min: 182100,  max: 231250,  rate: 0.32 },
  { min: 231250,  max: 578125,  rate: 0.35 },
  { min: 578125,  max: Infinity, rate: 0.37 },
]

const SE_TAX_RATE = 0.153

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const fmtMoneyDecimal = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

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

export default function TaxCalculatorPage({ profile }: TaxCalculatorPageProps) {
  const [totalEarnings, setTotalEarnings] = useState('')
  const [businessExpenses, setBusinessExpenses] = useState('')
  const [milesDriven, setMilesDriven] = useState('')
  const [homeOfficeDeduction, setHomeOfficeDeduction] = useState('')
  const [calculated, setCalculated] = useState(false)

  // Parsed values
  const earnings = parseFloat(totalEarnings) || 0
  const expenses = parseFloat(businessExpenses) || 0
  const miles = parseFloat(milesDriven) || 0
  const homeOffice = parseFloat(homeOfficeDeduction) || 0
  const mileageDeduction = miles * MILEAGE_RATE

  // Computations
  const agi = Math.max(0, earnings - expenses - mileageDeduction - homeOffice)
  const selfEmploymentTax = agi * SE_TAX_RATE
  const federalIncomeTax = calcFederalTax(agi)
  const totalEstimatedTax = selfEmploymentTax + federalIncomeTax
  const quarterlyPayment = totalEstimatedTax / 4

  function handleCalculate() {
    setCalculated(true)
  }

  function handlePrint() {
    window.print()
  }

  // Find current bracket
  const currentBracket = FEDERAL_BRACKETS.find(b => agi >= b.min && agi < b.max)
  const marginalRate = currentBracket ? (currentBracket.rate * 100).toFixed(0) : '0'

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: '#8b5cf6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Receipt size={22} color="#fff" />
        </div>
        <div>
          <h1 style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 28,
            fontWeight: 900,
            color: '#e8eaed',
            margin: 0,
          }}>
            1099 Tax Estimator
          </h1>
          <p style={{ fontSize: 13, color: '#5a6080', margin: 0, marginTop: 2 }}>
            Estimate self-employment taxes and quarterly payments
          </p>
        </div>
      </div>

      {/* Input Fields Section */}
      <div style={{
        background: '#13151c',
        border: '1px solid #1a1d27',
        borderRadius: 12,
        padding: 24,
        marginBottom: 20,
      }}>
        <div style={{
          fontSize: 12,
          fontWeight: 700,
          color: '#5a6080',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontFamily: 'Barlow Condensed, sans-serif',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <Calculator size={14} style={{ color: '#4f7fff' }} />
          Income & Deductions
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Total Earnings */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              <DollarSign size={12} />
              Total Earnings ($)
            </label>
            <input
              type="number"
              placeholder="0"
              value={totalEarnings}
              onChange={e => { setTotalEarnings(e.target.value); setCalculated(false) }}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#0d0f14',
                border: '1px solid #1a1d27',
                borderRadius: 8,
                color: '#e8eaed',
                fontSize: 14,
                fontFamily: "'JetBrains Mono', monospace",
                outline: 'none',
              }}
            />
          </div>

          {/* Business Expenses */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              <TrendingDown size={12} />
              Business Expenses ($)
            </label>
            <input
              type="number"
              placeholder="0"
              value={businessExpenses}
              onChange={e => { setBusinessExpenses(e.target.value); setCalculated(false) }}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#0d0f14',
                border: '1px solid #1a1d27',
                borderRadius: 8,
                color: '#e8eaed',
                fontSize: 14,
                fontFamily: "'JetBrains Mono', monospace",
                outline: 'none',
              }}
            />
          </div>

          {/* Miles Driven */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              <Car size={12} />
              Miles Driven
            </label>
            <input
              type="number"
              placeholder="0"
              value={milesDriven}
              onChange={e => { setMilesDriven(e.target.value); setCalculated(false) }}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#0d0f14',
                border: '1px solid #1a1d27',
                borderRadius: 8,
                color: '#e8eaed',
                fontSize: 14,
                fontFamily: "'JetBrains Mono', monospace",
                outline: 'none',
              }}
            />
            <div style={{ fontSize: 11, color: '#5a6080', marginTop: 4 }}>
              Auto-calc: {fmtMoneyDecimal(mileageDeduction)} at ${MILEAGE_RATE}/mile
            </div>
          </div>

          {/* Home Office Deduction */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              <Home size={12} />
              Home Office Deduction ($)
            </label>
            <input
              type="number"
              placeholder="0"
              value={homeOfficeDeduction}
              onChange={e => { setHomeOfficeDeduction(e.target.value); setCalculated(false) }}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#0d0f14',
                border: '1px solid #1a1d27',
                borderRadius: 8,
                color: '#e8eaed',
                fontSize: 14,
                fontFamily: "'JetBrains Mono', monospace",
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Calculate Button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
          <button
            onClick={handleCalculate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 32px',
              background: '#4f7fff',
              color: '#fff',
              fontSize: 15,
              fontWeight: 800,
              fontFamily: 'Barlow Condensed, sans-serif',
              letterSpacing: '0.5px',
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Calculator size={18} />
            Calculate
          </button>
        </div>
      </div>

      {/* Results Section */}
      {calculated && earnings > 0 && (
        <div>
          {/* Summary Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* AGI */}
            <div style={{
              background: '#13151c',
              border: '1px solid #1a1d27',
              borderRadius: 12,
              padding: 20,
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#5a6080',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 8,
                fontFamily: 'Barlow Condensed, sans-serif',
              }}>
                Adjusted Gross Income
              </div>
              <div style={{
                fontSize: 24,
                fontWeight: 700,
                color: '#22d3ee',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {fmtMoney(agi)}
              </div>
            </div>

            {/* Self-Employment Tax */}
            <div style={{
              background: '#13151c',
              border: '1px solid #1a1d27',
              borderRadius: 12,
              padding: 20,
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#5a6080',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 8,
                fontFamily: 'Barlow Condensed, sans-serif',
              }}>
                Self-Employment Tax
              </div>
              <div style={{
                fontSize: 24,
                fontWeight: 700,
                color: '#8b5cf6',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {fmtMoney(selfEmploymentTax)}
              </div>
              <div style={{ fontSize: 10, color: '#5a6080', marginTop: 4 }}>
                15.3% of AGI
              </div>
            </div>

            {/* Federal Income Tax */}
            <div style={{
              background: '#13151c',
              border: '1px solid #1a1d27',
              borderRadius: 12,
              padding: 20,
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#5a6080',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 8,
                fontFamily: 'Barlow Condensed, sans-serif',
              }}>
                Federal Income Tax
              </div>
              <div style={{
                fontSize: 24,
                fontWeight: 700,
                color: '#4f7fff',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {fmtMoney(federalIncomeTax)}
              </div>
              <div style={{ fontSize: 10, color: '#5a6080', marginTop: 4 }}>
                Marginal bracket: {marginalRate}%
              </div>
            </div>

            {/* Quarterly Payment */}
            <div style={{
              background: '#13151c',
              border: '1px solid #1a1d27',
              borderRadius: 12,
              padding: 20,
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#5a6080',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 8,
                fontFamily: 'Barlow Condensed, sans-serif',
              }}>
                Quarterly Payment
              </div>
              <div style={{
                fontSize: 24,
                fontWeight: 700,
                color: '#22c07a',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {fmtMoney(quarterlyPayment)}
              </div>
              <div style={{ fontSize: 10, color: '#5a6080', marginTop: 4 }}>
                Total / 4
              </div>
            </div>
          </div>

          {/* Tax Breakdown */}
          <div style={{
            background: '#13151c',
            border: '1px solid #1a1d27',
            borderRadius: 12,
            padding: 24,
            marginBottom: 20,
          }}>
            <div style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#5a6080',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontFamily: 'Barlow Condensed, sans-serif',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <FileText size={14} style={{ color: '#4f7fff' }} />
              Tax Computation Breakdown
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { label: 'Total Earnings', value: earnings, color: '#e8eaed', bold: true },
                { label: 'Business Expenses', value: -expenses, color: '#22c07a', bold: false },
                { label: `Mileage Deduction (${miles.toLocaleString()} mi x $${MILEAGE_RATE})`, value: -mileageDeduction, color: '#22c07a', bold: false },
                { label: 'Home Office Deduction', value: -homeOffice, color: '#22c07a', bold: false },
                { label: 'Adjusted Gross Income', value: agi, color: '#22d3ee', bold: true },
                { label: 'Self-Employment Tax (15.3%)', value: selfEmploymentTax, color: '#8b5cf6', bold: false },
                { label: `Federal Income Tax (${marginalRate}% bracket)`, value: federalIncomeTax, color: '#4f7fff', bold: false },
              ].map((row, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: row.bold ? '1px solid #1a1d27' : '1px solid rgba(26,29,39,0.5)',
                }}>
                  <span style={{
                    fontSize: 13,
                    color: row.bold ? '#e8eaed' : '#9299b5',
                    fontWeight: row.bold ? 700 : 400,
                  }}>
                    {row.label}
                  </span>
                  <span style={{
                    fontSize: 13,
                    fontWeight: row.bold ? 700 : 600,
                    color: row.color,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {row.value < 0 ? '-' : ''}{fmtMoney(Math.abs(row.value))}
                  </span>
                </div>
              ))}

              {/* Total Estimated Tax */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 0 10px',
                borderTop: '2px solid #1a1d27',
                marginTop: 4,
              }}>
                <span style={{
                  fontSize: 16,
                  fontWeight: 900,
                  color: '#e8eaed',
                  fontFamily: 'Barlow Condensed, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}>
                  Total Estimated Tax
                </span>
                <span style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: '#f25a5a',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {fmtMoney(totalEstimatedTax)}
                </span>
              </div>

              {/* Quarterly */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 0 4px',
              }}>
                <span style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: '#9299b5',
                  fontFamily: 'Barlow Condensed, sans-serif',
                }}>
                  Quarterly Payment (x4)
                </span>
                <span style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#22c07a',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {fmtMoney(quarterlyPayment)}
                </span>
              </div>
            </div>
          </div>

          {/* State Tax Note */}
          <div style={{
            background: '#13151c',
            border: '1px solid #1a1d27',
            borderLeft: '3px solid #f59e0b',
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}>
            <Info size={18} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#e8eaed', marginBottom: 4 }}>
                State Tax: Washington
              </div>
              <div style={{ fontSize: 12, color: '#9299b5', lineHeight: 1.5 }}>
                Washington has no personal income tax. However, businesses may be subject to the
                Business & Occupation (B&O) tax, which is a gross receipts tax. Consult with a
                tax professional for specific B&O obligations.
              </div>
            </div>
          </div>

          {/* Federal Bracket Visualization */}
          <div style={{
            background: '#13151c',
            border: '1px solid #1a1d27',
            borderRadius: 12,
            padding: 24,
            marginBottom: 20,
          }}>
            <div style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#5a6080',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontFamily: 'Barlow Condensed, sans-serif',
              marginBottom: 16,
            }}>
              Federal Tax Brackets
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {FEDERAL_BRACKETS.filter(b => b.max !== Infinity || agi > b.min).map(bracket => {
                const bracketWidth = bracket.max === Infinity
                  ? Math.max(agi - bracket.min, 0)
                  : bracket.max - bracket.min
                const filled = Math.min(Math.max(agi - bracket.min, 0), bracketWidth)
                const fillPct = bracketWidth > 0 ? (filled / bracketWidth) * 100 : 0
                const taxInBracket = filled * bracket.rate
                const isActive = agi > bracket.min

                return (
                  <div key={bracket.min} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    opacity: isActive ? 1 : 0.35,
                  }}>
                    <span style={{
                      width: 40,
                      textAlign: 'right',
                      fontSize: 12,
                      color: '#5a6080',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {(bracket.rate * 100).toFixed(0)}%
                    </span>
                    <div style={{
                      flex: 1,
                      height: 20,
                      borderRadius: 4,
                      background: '#1a1d27',
                      overflow: 'hidden',
                      position: 'relative',
                    }}>
                      <div style={{
                        width: `${fillPct}%`,
                        height: '100%',
                        borderRadius: 4,
                        background: 'linear-gradient(90deg, #4f7fff, #8b5cf6)',
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                    <span style={{
                      width: 80,
                      textAlign: 'right',
                      fontSize: 12,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: isActive ? '#e8eaed' : '#5a6080',
                    }}>
                      {fmtMoney(taxInBracket)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Print Button */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <button
              onClick={handlePrint}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 24px',
                background: 'transparent',
                border: '1px solid #1a1d27',
                borderRadius: 8,
                color: '#9299b5',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Printer size={16} />
              Print Tax Estimate
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
