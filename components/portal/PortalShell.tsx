'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Briefcase, Palette, MessageSquare, Receipt, Map, Star, Gift, Bell, Compass } from 'lucide-react'
import { C } from '@/lib/portal-theme'
import { PortalProvider, type PortalContextValue } from '@/lib/portal-context'
import { createClient } from '@/lib/supabase/client'

const BASE_NAV = [
  { key: 'home',     label: 'Home',     icon: Home,          href: '' },
  { key: 'jobs',     label: 'My Jobs',  icon: Briefcase,     href: '/jobs' },
  { key: 'explorer', label: 'Explorer', icon: Compass,       href: '/explorer' },
  { key: 'messages', label: 'Messages', icon: MessageSquare, href: '/messages' },
  { key: 'invoices', label: 'Pay',      icon: Receipt,       href: '/invoices' },
] as const

const FLEET_NAV = { key: 'fleet', label: 'Fleet', icon: Map, href: '/fleet' } as const

export default function PortalShell({
  ctx,
  children,
}: {
  ctx: PortalContextValue
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const base = `/portal/${ctx.token}`
  const [unreadCount, setUnreadCount] = useState(0)

  // Fetch unread notification count
  useEffect(() => {
    if (!ctx.customer?.id) return
    const supabase = createClient()

    async function fetchUnread() {
      const { count } = await supabase
        .from('portal_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', ctx.customer.id)
        .eq('read', false)
      setUnreadCount(count ?? 0)
    }

    fetchUnread()

    // Realtime subscription for new notifications
    const channel = supabase
      .channel(`portal-notifs-${ctx.customer.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'portal_notifications',
          filter: `customer_id=eq.${ctx.customer.id}`,
        },
        () => fetchUnread()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [ctx.customer?.id])

  function isActive(href: string) {
    if (!pathname) return false
    const p = pathname
    if (href === '') return p === base || p === base + '/'
    return p.startsWith(base + href)
  }

  const firstName = ctx.customer.name?.split(' ')[0] || 'there'
  const navItems = ctx.hasFleet ? [...BASE_NAV, FLEET_NAV] : [...BASE_NAV]

  const pts = ctx.loyaltyPoints ?? 0
  const showBadge = pts > 0

  return (
    <PortalProvider value={ctx}>
      <div style={{ minHeight: '100dvh', background: C.bg, color: C.text1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <header style={{
          padding: '14px 20px',
          borderBottom: `1px solid ${C.border}`,
          background: C.surface,
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 2,
                color: C.accent,
                textTransform: 'uppercase',
                fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)',
              }}>
                {ctx.orgName}
              </div>
              <div style={{
                fontSize: 17,
                fontWeight: 600,
                marginTop: 1,
                fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)',
              }}>
                Hey {firstName}
              </div>
            </div>

            {/* Right side: loyalty badge + referral + notifications */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {showBadge && (
                <Link
                  href="/portal/loyalty"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '5px 10px',
                    borderRadius: 20,
                    background: `${C.amber}15`,
                    border: `1px solid ${C.amber}30`,
                    textDecoration: 'none',
                    fontSize: 12,
                    fontWeight: 700,
                    color: C.amber,
                    fontFamily: 'JetBrains Mono, monospace',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Star size={12} strokeWidth={2.5} />
                  {pts.toLocaleString()} pts
                </Link>
              )}
              <Link
                href="/portal/referrals"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 10px',
                  borderRadius: 20,
                  background: `${C.green}15`,
                  border: `1px solid ${C.green}30`,
                  textDecoration: 'none',
                  fontSize: 12,
                  fontWeight: 700,
                  color: C.green,
                  whiteSpace: 'nowrap',
                }}
              >
                <Gift size={12} strokeWidth={2.5} />
                Refer
              </Link>

              {/* Notification bell */}
              <Link
                href={`${base}/notifications`}
                style={{ position: 'relative', display: 'flex', alignItems: 'center', padding: 6 }}
              >
                <Bell size={20} color={unreadCount > 0 ? C.accent : C.text2} strokeWidth={unreadCount > 0 ? 2.2 : 1.5} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    background: '#f25a5a',
                    color: '#fff',
                    borderRadius: '50%',
                    width: 16,
                    height: 16,
                    fontSize: 9,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'JetBrains Mono, monospace',
                    lineHeight: 1,
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
          {children}
        </main>

        {/* Bottom navigation */}
        <nav style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: C.surface,
          borderTop: `1px solid ${C.border}`,
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '8px 0 env(safe-area-inset-bottom, 8px)',
          zIndex: 50,
        }}>
          {navItems.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.key}
                href={item.href === '' ? base : `${base}${item.href}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  padding: '6px 10px',
                  minWidth: 44,
                  minHeight: 44,
                  justifyContent: 'center',
                  color: active ? C.accent : C.text3,
                  textDecoration: 'none',
                  transition: 'color 0.15s',
                  fontSize: 10,
                  fontWeight: active ? 600 : 400,
                }}
              >
                <Icon size={20} strokeWidth={active ? 2.2 : 1.5} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </PortalProvider>
  )
}
