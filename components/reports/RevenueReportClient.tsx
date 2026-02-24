'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Profile } from '@/types'
import { ChevronLeft, DollarSign, TrendingUp, Calendar, Download } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

interface Props {
  profile: Profile
  revenueData: any[]
  totalRevenue: number
  totalPaid: number
}

type Period = 'today' | 'week' | 'month' | 'quarter' | 'year'

export default function RevenueReportClient({ profile, revenueData, totalRevenue, totalPaid }: Props) {
  const router = useRouter()
  const [period, setPeriod] = useState<Period>('month')

  const filteredData = useMemo(() => {
    const now = new Date()
    let cutoffDate = new Date()

    switch (period) {
      case 'today':
        cutoffDate.setHours(0, 0, 0, 0)
        break
      case 'week':
        cutoffDate.setDate(now.getDate() - 7)
        break
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1)
        break
      case 'quarter':
        cutoffDate.setMonth(now.getMonth() - 3)
        break
      case 'year':
        cutoffDate.setFullYear(now.getFullYear() - 1)
        break
    }

    return revenueData.filter(inv => {
      if (!inv.invoice_date) return false
      return new Date(inv.invoice_date) >= cutoffDate
    })
  }, [revenueData, period])

  const chartData = useMemo(() => {
    const monthlyData: Record<string, { month: string; revenue: number; paid: number }> = {}

    filteredData.forEach(inv => {
      if (!inv.invoice_date) return
      const date = new Date(inv.invoice_date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthLabel = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthLabel, revenue: 0, paid: 0 }
      }

      monthlyData[monthKey].revenue += inv.total || 0
      if (inv.status === 'paid' || inv.status === 'partial') {
        monthlyData[monthKey].paid += inv.amount_paid || 0
      }
    })

    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month))
  }, [filteredData])

  const periodRevenue = filteredData.reduce((sum, inv) => sum + (inv.total || 0), 0)
  const periodPaid = filteredData
    .filter(inv => inv.status === 'paid' || inv.status === 'partial')
    .reduce((sum, inv) => sum + (inv.amount_paid || 0), 0)
  const periodOutstanding = periodRevenue - periodPaid

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      color: 'var(--text1)',
      paddingBottom: '40px'
    }}>
      {/* HEADER */}
      <div style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--surface2)',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/reports" style={{
            color: 'var(--text2)',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px'
          }}>
            <ChevronLeft size={16} />
            Reports
          </Link>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 700,
            fontFamily: 'Barlow Condensed, sans-serif',
            margin: 0
          }}>
            Revenue Report
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* PERIOD SELECTOR */}
          <div style={{
            display: 'flex',
            gap: '4px',
            background: 'var(--surface2)',
            borderRadius: '6px',
            padding: '4px'
          }}>
            {(['today', 'week', 'month', 'quarter', 'year'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  background: period === p ? 'var(--accent)' : 'transparent',
                  border: 'none',
                  color: period === p ? '#fff' : 'var(--text2)',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: period === p ? 600 : 400,
                  textTransform: 'capitalize'
                }}
              >
                {p}
              </button>
            ))}
          </div>

          <button style={{
            background: 'transparent',
            border: '1px solid var(--accent)',
            color: 'var(--accent)',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* KPI CARDS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          marginBottom: '32px'
        }}>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--surface2)',
            borderRadius: '8px',
            padding: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: 'rgba(79, 127, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <DollarSign size={20} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text3)', textTransform: 'uppercase' }}>
                  Total Revenue
                </div>
                <div style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  color: 'var(--accent)',
                  fontFamily: 'JetBrains Mono, monospace'
                }}>
                  ${periodRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--surface2)',
            borderRadius: '8px',
            padding: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: 'rgba(34, 192, 122, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <TrendingUp size={20} style={{ color: 'var(--green)' }} />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text3)', textTransform: 'uppercase' }}>
                  Collected
                </div>
                <div style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  color: 'var(--green)',
                  fontFamily: 'JetBrains Mono, monospace'
                }}>
                  ${periodPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--surface2)',
            borderRadius: '8px',
            padding: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Calendar size={20} style={{ color: 'var(--amber)' }} />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text3)', textTransform: 'uppercase' }}>
                  Outstanding
                </div>
                <div style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  color: 'var(--amber)',
                  fontFamily: 'JetBrains Mono, monospace'
                }}>
                  ${periodOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CHART */}
        {chartData.length > 0 ? (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--surface2)',
            borderRadius: '8px',
            padding: '24px',
            marginBottom: '32px'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--text1)',
              marginBottom: '20px',
              fontFamily: 'Barlow Condensed, sans-serif',
              textTransform: 'uppercase'
            }}>
              Revenue by Month
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--surface2)" />
                <XAxis dataKey="month" stroke="var(--text3)" style={{ fontSize: '12px' }} />
                <YAxis stroke="var(--text3)" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface2)',
                    border: '1px solid var(--surface2)',
                    borderRadius: '4px',
                    color: 'var(--text1)'
                  }}
                />
                <Bar dataKey="revenue" fill="var(--accent)" name="Total Revenue" />
                <Bar dataKey="paid" fill="var(--green)" name="Collected" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--surface2)',
            borderRadius: '8px',
            padding: '40px',
            textAlign: 'center',
            color: 'var(--text3)',
            marginBottom: '32px'
          }}>
            No revenue data for this period
          </div>
        )}

        {/* INVOICE TABLE */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--surface2)',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--surface2)' }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--text1)',
              margin: 0,
              fontFamily: 'Barlow Condensed, sans-serif',
              textTransform: 'uppercase'
            }}>
              Recent Invoices
            </h3>
          </div>
          {filteredData.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface2)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase' }}>Invoice #</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase' }}>Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase' }}>Amount</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase' }}>Paid</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.slice(0, 50).map((inv, idx) => (
                  <tr key={inv.invoice_number || idx} style={{
                    borderBottom: idx < filteredData.length - 1 ? '1px solid var(--surface2)' : 'none'
                  }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {inv.invoice_number}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--text2)' }}>
                      {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--text1)', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>
                      ${(inv.total || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--green)', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                      ${(inv.amount_paid || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text2)', textTransform: 'capitalize' }}>
                      {inv.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)' }}>
              No invoices for this period
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
