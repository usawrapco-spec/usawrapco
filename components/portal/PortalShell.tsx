'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Home, Palette, Camera, MessageSquare, Menu, X, FileText,
  Briefcase, Receipt, ShoppingBag, Calendar, Map,
  Compass, Anchor, Star, Gift, Bell, User, Bot, Rocket,
} from 'lucide-react'
import { C } from '@/lib/portal-theme'
import { PortalProvider, type PortalContextValue } from '@/lib/portal-context'
import { createClient } from '@/lib/supabase/client'

// Routes that don't require a signed-in Supabase session
// Invoices, messages, chat, proposals, and estimates are viewable without an account.
// Advanced actions (approve, upload, fleet, design, etc.) require sign-in.
const PUBLIC_SUFFIXES = [
  '/invoices',
  '/messages',
  '/chat',
  '/proposals',
  '/proposal',
  '/estimate',   // covers /jobs/[id]/estimate
]

function isPublicPath(pathname: string, base: string): boolean {
  if (pathname === base || pathname === base + '/') return true // home is public too (info only)
  return PUBLIC_SUFFIXES.some(s => pathname.startsWith(base + s))
}

const BASE_NAV = [
  { key: 'home',     label: 'Home',     icon: Home,          href: '' },
  { key: 'proofs',   label: 'Proofs',   icon: Palette,       href: '/design' },
  { key: 'upload',   label: 'Upload',   icon: Camera,        href: '/upload' },
  { key: 'messages', label: 'Messages', icon: MessageSquare, href: '/messages' },
  { key: 'more',     label: 'More',     icon: Menu,          href: '#more' },
] as const

export default function PortalShell({
  ctx,
  children,
}: {
  ctx: PortalContextValue
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const base = `/portal/${ctx.token}`
  const [unreadCount, setUnreadCount] = useState(0)
  const [moreOpen, setMoreOpen] = useState(false)
  const [authed, setAuthed] = useState<boolean | null>(null) // null = checking

  // Check Supabase auth session
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session)
    })
    return () => subscription.unsubscribe()
  }, [])

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
    if (href === '#more') return false
    return p.startsWith(base + href)
  }

  const firstName = ctx.customer.name?.split(' ')[0] || 'there'
  const pts = ctx.loyaltyPoints ?? 0
  const showBadge = pts > 0

  const moreItems: { label: string; icon: typeof Briefcase; href: string; external?: boolean }[] = [
    { label: 'Proposals',        icon: FileText,     href: `${base}/proposals` },
    { label: 'My Jobs',          icon: Briefcase,    href: `${base}/jobs` },
    { label: 'Invoices & Pay',   icon: Receipt,      href: `${base}/invoices` },
    { label: 'Product Catalog',  icon: ShoppingBag,  href: `${base}/catalog` },
    { label: 'Schedule',         icon: Calendar,     href: `${base}/schedule` },
    ...(ctx.hasFleet ? [{ label: 'Fleet Manager', icon: Map, href: `${base}/fleet` }] : []),
    { label: 'Financing',         icon: Rocket,       href: `${base}/financing` },
    { label: 'Explorer',         icon: Compass,      href: `${base}/explorer` },
    { label: 'Fishing App',      icon: Anchor,       href: '/fishing', external: true },
    { label: 'Loyalty Program',  icon: Star,         href: '/portal/loyalty', external: true },
    { label: 'Referrals',        icon: Gift,         href: '/portal/referrals', external: true },
    { label: 'AI Assistant',     icon: Bot,          href: `${base}/chat` },
    { label: 'My Profile',       icon: User,         href: `${base}/profile` },
  ]

  function handleMoreItemClick(href: string) {
    setMoreOpen(false)
    router.push(href)
  }

  // Badge counts
  const proofsBadge = ctx.pendingProofs ?? 0
  const messagesBadge = ctx.unreadMessages ?? 0

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
          {BASE_NAV.map((item) => {
            const active = isActive(item.href)
            const isMore = item.key === 'more'
            const Icon = item.icon

            // Badge count for proofs and messages
            let badge = 0
            if (item.key === 'proofs') badge = proofsBadge
            if (item.key === 'messages') badge = messagesBadge

            if (isMore) {
              return (
                <button
                  key={item.key}
                  onClick={() => setMoreOpen(true)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                    padding: '6px 10px',
                    minWidth: 44,
                    minHeight: 44,
                    justifyContent: 'center',
                    color: moreOpen ? C.accent : C.text3,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 10,
                    fontWeight: moreOpen ? 600 : 400,
                    fontFamily: 'inherit',
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
                  position: 'relative',
                }}
              >
                <Icon size={20} strokeWidth={active ? 2.2 : 1.5} />
                <span>{item.label}</span>
                {badge > 0 && (
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
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* More drawer overlay */}
        {moreOpen && (
          <>
            {/* Backdrop */}
            <div
              onClick={() => setMoreOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 60,
              }}
            />
            {/* Drawer */}
            <div style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: C.surface,
              borderTop: `1px solid ${C.border}`,
              borderRadius: '16px 16px 0 0',
              zIndex: 70,
              padding: '16px 16px env(safe-area-inset-bottom, 16px)',
              maxHeight: '70dvh',
              overflowY: 'auto',
            }}>
              {/* Drawer handle */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border }} />
              </div>
              {/* Close button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text2, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                  More
                </span>
                <button
                  onClick={() => setMoreOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: C.text3 }}
                >
                  <X size={20} />
                </button>
              </div>
              {/* Menu items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {moreItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.label}
                      onClick={() => handleMoreItemClick(item.href)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        padding: '14px 12px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: C.text1,
                        fontSize: 15,
                        fontWeight: 500,
                        fontFamily: 'inherit',
                        borderRadius: 10,
                        width: '100%',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: `${C.accent}12`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Icon size={18} color={C.accent} strokeWidth={1.8} />
                      </div>
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* ── Auth Gate Overlay ────────────────────────────────────────────────
            Show when: session check complete, not authed, and on a protected route.
            Public routes (invoices, messages, chat, home) stay accessible.
        ── */}
        {authed === false && pathname && !isPublicPath(pathname, base) && (
          <AuthGate token={ctx.token} pathname={pathname} />
        )}
      </div>
    </PortalProvider>
  )
}

/* ── Auth Gate Overlay ──────────────────────────────────────────────────────── */

function AuthGate({ token, pathname }: { token: string; pathname: string }) {
  const loginHref = `/portal/login?next=${encodeURIComponent(pathname)}`

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      background: 'rgba(13,15,20,0.92)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        background: '#13151c',
        border: '1px solid #2a2f3d',
        borderRadius: 20,
        padding: '40px 32px',
        width: '100%',
        maxWidth: 400,
        textAlign: 'center',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(79,127,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4f7fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        <div style={{
          fontSize: 22,
          fontWeight: 900,
          fontFamily: "'Barlow Condensed', sans-serif",
          color: '#e8eaed',
          marginBottom: 8,
        }}>
          Sign In to Continue
        </div>
        <p style={{ fontSize: 14, color: '#9299b5', lineHeight: 1.6, marginBottom: 28 }}>
          Create a free account to save your project history, designs, and portal activity — or sign in if you already have one.
        </p>

        <Link
          href={loginHref}
          style={{
            display: 'block',
            width: '100%',
            padding: '14px 20px',
            borderRadius: 12,
            border: 'none',
            background: '#4f7fff',
            color: '#fff',
            fontSize: 15,
            fontWeight: 800,
            fontFamily: "'Barlow Condensed', sans-serif",
            textDecoration: 'none',
            marginBottom: 12,
            boxSizing: 'border-box',
          }}
        >
          Sign In / Create Account
        </Link>

        <div style={{ fontSize: 12, color: '#5a6080', marginTop: 8 }}>
          No account needed for{' '}
          <Link href={`/portal/${token}/invoices`} style={{ color: '#9299b5', textDecoration: 'underline' }}>invoices</Link>
          {' '}or{' '}
          <Link href={`/portal/${token}/messages`} style={{ color: '#9299b5', textDecoration: 'underline' }}>messages</Link>
        </div>
      </div>
    </div>
  )
}
