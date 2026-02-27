import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import type { Profile } from '@/types'
import Link from 'next/link'
import { DollarSign, Kanban, FileText, Users, TrendingUp, UserPlus } from 'lucide-react'

export default async function SalesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const SALES_LINKS = [
    { href: '/dashboard',  label: 'Dashboard',    icon: DollarSign,  desc: 'Revenue & KPI overview' },
    { href: '/pipeline',   label: 'Pipeline',     icon: Kanban,      desc: 'Job board & deal flow' },
    { href: '/estimates',  label: 'Estimates',    icon: FileText,    desc: 'Quotes & proposals' },
    { href: '/customers',  label: 'Customers',    icon: Users,       desc: 'Customer accounts' },
    { href: '/prospects',  label: 'Prospects',    icon: UserPlus,    desc: 'Outbound CRM' },
    { href: '/leaderboard',label: 'Leaderboard',  icon: TrendingUp,  desc: 'Team performance' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
      <TopNav profile={profile as Profile} />
      <main style={{ flex: 1, overflowY: 'auto', padding: '32px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h1 style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 32,
            fontWeight: 800,
            color: 'var(--text1)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}>
            Sales Hub
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 32 }}>
            All sales activity in one place.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {SALES_LINKS.map(item => {
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '16px 18px', borderRadius: 12,
                  background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.06)',
                  textDecoration: 'none', transition: 'border-color 0.15s',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: 'rgba(79,127,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon size={18} color="var(--accent)" />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1)' }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{item.desc}</div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  )
}
