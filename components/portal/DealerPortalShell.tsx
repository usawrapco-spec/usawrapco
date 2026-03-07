'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Home, Briefcase, MessageSquare, Wand2, Menu, X,
  Map, Compass, TrendingUp, User, ChevronRight,
  Rocket, Gift,
} from 'lucide-react'
import { C } from '@/lib/portal-theme'

export interface PortalFeatures {
  pnw_navigator: boolean
  fleet_manager: boolean
  mockup_generator: boolean
  messaging: boolean
  earnings: boolean
}

export const DEFAULT_PORTAL_FEATURES: PortalFeatures = {
  pnw_navigator: true,
  fleet_manager: true,
  mockup_generator: true,
  messaging: true,
  earnings: true,
}

export interface DealerCtx {
  id: string
  name: string
  company_name: string | null
  email: string | null
  token: string
  sales_rep_name: string | null
  commission_pct: number
  unread_shop: number
  unread_customer: number
  unread_group: number
  portal_features: PortalFeatures
  logo_url: string | null
  brand_color: string | null
  tagline: string | null
  primary_app: string | null
  share_estimates: boolean
  total_earned: number
}

function getBaseNav(features: PortalFeatures, primaryApp: string | null) {
  const items: { key: string; label: string; icon: any; href: string }[] = [
    { key: 'home', label: 'Home', icon: Home, href: '' },
  ]

  // Promote primary app to bottom nav
  if (primaryApp === 'pnw_navigator' && features.pnw_navigator) {
    items.push({ key: 'explorer', label: 'Navigator', icon: Compass, href: '/explorer' })
  }

  items.push({ key: 'jobs', label: 'Jobs', icon: Briefcase, href: '/jobs' })
  if (features.messaging) items.push({ key: 'messages', label: 'Messages', icon: MessageSquare, href: '/messages' })
  items.push({ key: 'more', label: 'More', icon: Menu, href: '#more' })
  return items
}

export default function DealerPortalShell({
  ctx,
  children,
}: {
  ctx: DealerCtx
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const base = `/portal/dealer/${ctx.token}`
  const [moreOpen, setMoreOpen] = useState(false)
  const features = ctx.portal_features

  // Brand colors — override accent when dealer has custom branding
  const accent = ctx.brand_color || C.green

  const totalUnread = ctx.unread_shop + ctx.unread_customer + ctx.unread_group
  const navItems = getBaseNav(features, ctx.primary_app)

  function isActive(href: string) {
    if (!pathname) return false
    if (href === '') return pathname === base || pathname === base + '/'
    if (href === '#more') return false
    return pathname.startsWith(base + href)
  }

  // Build "More" drawer items — skip items already in bottom nav
  const navigatorInNav = ctx.primary_app === 'pnw_navigator'
  const moreItems = [
    ...(!navigatorInNav && features.pnw_navigator ? [{ label: 'PNW Navigator', icon: Compass, href: `${base}/explorer` }] : []),
    ...(features.mockup_generator ? [{ label: 'Vehicle Mockup', icon: Wand2, href: `${base}/mockup` }] : []),
    ...(features.fleet_manager ? [{ label: 'Fleet Manager', icon: Map, href: `${base}/fleet` }] : []),
    { label: 'Financing', icon: Rocket, href: `${base}/financing` },
    { label: 'Referrals', icon: Gift, href: `${base}/referrals` },
    ...(features.earnings ? [{ label: 'Earnings', icon: TrendingUp, href: `${base}/earnings` }] : []),
    { label: 'My Profile', icon: User, href: `${base}/profile` },
  ]

  // Header branding
  const headerLabel = ctx.tagline || (ctx.company_name ? `${ctx.company_name} Portal` : 'Dealer Portal')

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, color: C.text1, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{
        padding: '14px 20px',
        borderBottom: `1px solid ${C.border}`,
        background: C.surface,
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            {ctx.logo_url ? (
              <img
                src={ctx.logo_url}
                alt={ctx.company_name || ctx.name}
                style={{ height: 32, objectFit: 'contain', marginBottom: 2 }}
              />
            ) : (
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 2,
                color: accent, textTransform: 'uppercase',
                fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)',
              }}>
                {headerLabel}
              </div>
            )}
            <div style={{
              fontSize: 17, fontWeight: 600, marginTop: 1,
              fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)',
            }}>
              {ctx.logo_url ? (ctx.company_name || ctx.name) : (ctx.company_name || ctx.name)}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {ctx.total_earned > 0 && (
              <div style={{
                padding: '5px 10px', borderRadius: 20,
                background: `${accent}15`, border: `1px solid ${accent}30`,
                fontSize: 12, fontWeight: 700, color: accent,
                fontFamily: 'JetBrains Mono, monospace',
              }}>
                ${ctx.total_earned.toLocaleString()} earned
              </div>
            )}
          </div>
        </div>

        {ctx.sales_rep_name && (
          <div style={{ fontSize: 11, color: C.text3, marginTop: 4 }}>
            Rep: {ctx.sales_rep_name}
          </div>
        )}
      </header>

      {/* Content */}
      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
        {children}
      </main>

      {/* Bottom Nav */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: C.surface, borderTop: `1px solid ${C.border}`,
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        padding: '8px 0 env(safe-area-inset-bottom, 8px)', zIndex: 50,
      }}>
        {navItems.map((item) => {
          const active = isActive(item.href)
          const isMore = item.key === 'more'
          const Icon = item.icon
          const badge = item.key === 'messages' ? totalUnread : 0

          if (isMore) {
            return (
              <button
                key={item.key}
                onClick={() => setMoreOpen(true)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  padding: '6px 10px', minWidth: 44, minHeight: 44, justifyContent: 'center',
                  color: moreOpen ? accent : C.text3,
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 10, fontWeight: moreOpen ? 600 : 400, fontFamily: 'inherit',
                }}
              >
                <Icon size={20} strokeWidth={moreOpen ? 2.2 : 1.5} />
                <span>{item.label}</span>
              </button>
            )
          }

          return (
            <Link
              key={item.key}
              href={item.href === '' ? base : `${base}${item.href}`}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                padding: '6px 10px', minWidth: 44, minHeight: 44, justifyContent: 'center',
                color: active ? accent : C.text3,
                textDecoration: 'none', fontSize: 10,
                fontWeight: active ? 600 : 400, position: 'relative',
              }}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.5} />
              <span>{item.label}</span>
              {badge > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: 2,
                  background: '#f25a5a', color: '#fff',
                  borderRadius: '50%', width: 16, height: 16,
                  fontSize: 9, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'JetBrains Mono, monospace',
                }}>
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* More Drawer */}
      {moreOpen && (
        <>
          <div onClick={() => setMoreOpen(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60,
          }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: C.surface, borderTop: `1px solid ${C.border}`,
            borderRadius: '16px 16px 0 0', zIndex: 70,
            padding: '16px 16px env(safe-area-inset-bottom, 16px)',
            maxHeight: '70dvh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text2, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                More
              </span>
              <button onClick={() => setMoreOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: C.text3 }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {moreItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.label}
                    onClick={() => { setMoreOpen(false); router.push(item.href) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 12px', background: 'none', border: 'none',
                      cursor: 'pointer', color: C.text1, fontSize: 15, fontWeight: 500,
                      fontFamily: 'inherit', borderRadius: 10, width: '100%', textAlign: 'left',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: `${accent}12`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Icon size={18} color={accent} strokeWidth={1.8} />
                    </div>
                    {item.label}
                    <ChevronRight size={16} color={C.text3} style={{ marginLeft: 'auto' }} />
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
