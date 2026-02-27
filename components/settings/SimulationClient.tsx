'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { Database, Download, Trash2, AlertTriangle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface SimulationClientProps {
  profile: Profile
}

const fM = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const SIM_JOBS = [
  { company: 'Metro Plumbing', vehicle: 'Med Van', price: 4200, type: 'inbound', status: 'active' },
  { company: 'Summit Electric', vehicle: 'Full Truck', price: 5100, type: 'outbound', status: 'active' },
  { company: 'Coastal HVAC', vehicle: 'Large Van', price: 4800, type: 'inbound', status: 'active' },
  { company: 'Peak Roofing', vehicle: 'XL Van', price: 5500, type: 'outbound', status: 'active' },
  { company: 'Atlas Landscaping', vehicle: 'Med Truck', price: 3900, type: 'inbound', status: 'active' },
  { company: 'RedLine Auto', vehicle: 'Full Car', price: 3600, type: 'presold', status: 'active' },
  { company: 'Blue Ocean Cafe', vehicle: 'Small Car', price: 2800, type: 'inbound', status: 'active' },
  { company: 'Iron Forge Gym', vehicle: 'Med Van', price: 4100, type: 'outbound', status: 'active' },
  { company: 'Valley Solar', vehicle: 'Full Truck', price: 5300, type: 'inbound', status: 'active' },
  { company: 'Crown Dental', vehicle: 'Med Car', price: 3200, type: 'inbound', status: 'active' },
  { company: 'Swift Courier', vehicle: 'Large Van', price: 4600, type: 'outbound', status: 'active' },
  { company: 'Pine Tree Homes', vehicle: 'Sm Truck', price: 3500, type: 'inbound', status: 'active' },
  { company: 'Neon Signs Co', vehicle: 'Full Car', price: 3800, type: 'presold', status: 'active' },
  { company: 'Golden Gate Pest', vehicle: 'Med Van', price: 4300, type: 'inbound', status: 'active' },
  { company: 'Arctic Air HVAC', vehicle: 'XL Van', price: 5700, type: 'outbound', status: 'active' },
  { company: 'Brightside Cleaning', vehicle: 'Small Car', price: 2600, type: 'inbound', status: 'active' },
  { company: 'Harbor Marine', vehicle: 'Med Truck', price: 4000, type: 'inbound', status: 'active' },
  { company: 'Apex Construction', vehicle: 'Full Truck', price: 5200, type: 'outbound', status: 'active' },
  { company: 'Zen Wellness', vehicle: 'Med Car', price: 3100, type: 'presold', status: 'active' },
  { company: 'Thunder Electric', vehicle: 'Large Van', price: 4900, type: 'inbound', status: 'active' },
  { company: 'SilverLine Limo', vehicle: 'Full Car', price: 3700, type: 'inbound', status: 'active' },
  { company: 'Maple Leaf Garden', vehicle: 'Sm Truck', price: 3400, type: 'outbound', status: 'active' },
  { company: 'Digital Print Shop', vehicle: 'Med Van', price: 4400, type: 'inbound', status: 'active' },
  { company: 'Cascade Plumbing', vehicle: 'Med Truck', price: 4100, type: 'inbound', status: 'active' },
  { company: 'Phoenix Auto Body', vehicle: 'XL Van', price: 5800, type: 'outbound', status: 'active' },
]

export default function SimulationClient({ profile }: SimulationClientProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  async function loadSimJobs() {
    setLoading(true)
    const jobs = SIM_JOBS.map((job, i) => ({
      org_id: profile.org_id,
      title: `[SIM] ${job.company}`,
      type: 'wrap',
      status: 'active',
      pipe_stage: ['sales_in', 'production', 'install', 'prod_review', 'sales_close'][i % 5],
      vehicle_desc: job.vehicle,
      revenue: job.price,
      division: 'wraps',
      form_data: {
        client: `[SIM] ${job.company}`,
        vehicle: job.vehicle,
        leadType: job.type,
        salesPrice: job.price.toString(),
        isSimulation: true,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    for (const job of jobs) {
      await supabase.from('projects').insert(job)
    }
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function clearSimJobs() {
    setLoading(true)
    await supabase
      .from('projects')
      .delete()
      .eq('org_id', profile.org_id)
      .like('title', '[SIM]%')
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid rgba(90,96,128,.2)',
    borderRadius: 12,
    padding: 20,
  }

  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '.08em',
    paddingBottom: 8,
    marginBottom: 14,
    borderBottom: '1px solid rgba(90,96,128,.2)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link href="/settings" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, borderRadius: 8,
          background: 'var(--surface)', border: '1px solid rgba(90,96,128,.2)',
          color: 'var(--text2)', textDecoration: 'none',
        }}>
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 24, fontWeight: 900,
            color: 'var(--text1)', margin: 0,
          }}>
            Simulation Data
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text3)', margin: '2px 0 0' }}>
            Load or clear sample jobs for testing
          </p>
        </div>
        {saved && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', marginLeft: 'auto' }}>Done</span>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={cardStyle}>
          <div style={{ ...sectionHeaderStyle, color: 'var(--red)' }}>
            <Database size={14} />
            Monthly Simulation
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <button
              onClick={loadSimJobs}
              disabled={loading}
              style={{
                padding: '10px 20px', borderRadius: 10, fontWeight: 800, fontSize: 13,
                cursor: 'pointer', background: 'var(--red)', border: 'none', color: '#fff',
                display: 'flex', alignItems: 'center', gap: 8,
                opacity: loading ? 0.6 : 1,
              }}
            >
              <Download size={14} />
              {loading ? 'Loading...' : 'Load Sample Jobs'}
            </button>
            <button
              onClick={clearSimJobs}
              disabled={loading}
              style={{
                padding: '10px 20px', borderRadius: 10, fontWeight: 700, fontSize: 13,
                cursor: 'pointer', background: 'transparent',
                border: '1px solid rgba(90,96,128,.3)', color: 'var(--text2)',
                display: 'flex', alignItems: 'center', gap: 8,
                opacity: loading ? 0.6 : 1,
              }}
            >
              <Trash2 size={14} />
              Clear Sim Jobs
            </button>
          </div>

          {/* Warning banner */}
          <div style={{
            background: 'rgba(245,158,11,.08)',
            border: '1px solid rgba(245,158,11,.3)',
            borderRadius: 10, padding: '12px 16px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <AlertTriangle size={18} color="var(--amber)" />
            <div style={{ fontSize: 12, color: 'var(--amber)', lineHeight: 1.5 }}>
              <span style={{ fontWeight: 800 }}>Simulation Mode:</span> Loading sample jobs will create 25 projects in your database with the <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>[SIM]</span> prefix. These jobs will appear in your pipeline and analytics. Use &ldquo;Clear Sim Jobs&rdquo; to remove them all.
            </div>
          </div>

          {/* Job cards grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            {SIM_JOBS.map((job, i) => {
              const stages = ['sales_in', 'production', 'install', 'prod_review', 'sales_close']
              const stage = stages[i % 5]
              const stageColors: Record<string, string> = {
                sales_in: 'var(--accent)',
                production: 'var(--green)',
                install: 'var(--cyan)',
                prod_review: 'var(--amber)',
                sales_close: 'var(--purple)',
              }
              const stageLabels: Record<string, string> = {
                sales_in: 'Sales',
                production: 'Prod',
                install: 'Install',
                prod_review: 'QC',
                sales_close: 'Close',
              }
              const typeColors: Record<string, string> = {
                inbound: 'var(--accent)',
                outbound: 'var(--green)',
                presold: 'var(--amber)',
              }

              return (
                <div key={i} style={{
                  background: 'var(--bg)',
                  border: '1px solid rgba(90,96,128,.15)',
                  borderRadius: 8, padding: 10,
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text1)', lineHeight: 1.2, marginBottom: 2 }}>
                    {job.company}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text3)' }}>{job.vehicle}</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
                    {fM(job.price)}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
                    <span style={{
                      fontSize: 8, fontWeight: 800, textTransform: 'uppercase',
                      padding: '2px 6px', borderRadius: 4,
                      background: `color-mix(in srgb, ${typeColors[job.type]} 10%, transparent)`,
                      color: typeColors[job.type],
                      border: `1px solid color-mix(in srgb, ${typeColors[job.type]} 20%, transparent)`,
                    }}>
                      {job.type}
                    </span>
                    <span style={{
                      fontSize: 8, fontWeight: 800, textTransform: 'uppercase',
                      padding: '2px 6px', borderRadius: 4,
                      background: `color-mix(in srgb, ${stageColors[stage]} 10%, transparent)`,
                      color: stageColors[stage],
                      border: `1px solid color-mix(in srgb, ${stageColors[stage]} 20%, transparent)`,
                    }}>
                      {stageLabels[stage]}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
