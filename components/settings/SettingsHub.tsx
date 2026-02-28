'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, ChevronRight, Settings, Car, DollarSign, FileText,
  Shield, BookOpen, Tag, CalendarCheck, Mail, MessageSquare,
  Phone, Package, Boxes, Brain, Sliders, Workflow, CreditCard,
  Lock, Eye, Upload, Database, Printer, Calendar, Users,
  Megaphone, Plug, Zap, BarChart3, Bell, Truck
} from 'lucide-react'

interface SettingsCard {
  title: string
  description: string
  href: string
  icon: React.ReactNode
  iconColor: string
}

interface SettingsCategory {
  name: string
  cards: SettingsCard[]
}

const CATEGORIES: SettingsCategory[] = [
  {
    name: 'General',
    cards: [
      { title: 'Defaults & Pricing', description: 'Vehicle pay rates, overhead costs, and pricing equations', href: '/settings/defaults', icon: <Settings size={18} />, iconColor: 'var(--accent)' },
      { title: 'Vehicle Database', description: 'Manage custom vehicle types and configurations', href: '/settings/vehicles', icon: <Car size={18} />, iconColor: 'var(--cyan)' },
      { title: 'Vehicle Pricing', description: 'Default pricing tiers by vehicle size and wrap type', href: '/settings/pricing', icon: <DollarSign size={18} />, iconColor: 'var(--green)' },
      { title: 'Message Templates', description: 'Pre-written messages for customer communications', href: '/settings/templates', icon: <FileText size={18} />, iconColor: 'var(--purple)' },
    ],
  },
  {
    name: 'Sales & Revenue',
    cards: [
      { title: 'Commission Rules', description: 'Inbound, outbound, and pre-sold commission tiers', href: '/settings/commissions', icon: <DollarSign size={18} />, iconColor: 'var(--green)' },
      { title: 'Installer Pay Rates', description: 'Flat rate grid by vehicle type — admin editable', href: '/settings/pay-rates', icon: <DollarSign size={18} />, iconColor: 'var(--cyan)' },
      { title: 'Sales Playbook', description: 'Scripts, objection handling, and closing strategies', href: '/settings/playbook', icon: <BookOpen size={18} />, iconColor: 'var(--accent)' },
      { title: 'Coupons & Discounts', description: 'Manage promotional codes and discount rules', href: '/settings/coupons', icon: <Tag size={18} />, iconColor: 'var(--amber)' },
      { title: 'Booking', description: 'Online booking widget and scheduling rules', href: '/settings/booking', icon: <CalendarCheck size={18} />, iconColor: 'var(--cyan)' },
    ],
  },
  {
    name: 'Communications',
    cards: [
      { title: 'Email Accounts', description: 'Connect and manage outbound email accounts', href: '/settings/email-accounts', icon: <Mail size={18} />, iconColor: 'var(--accent)' },
      { title: 'Email Templates', description: 'Design email templates for campaigns and follow-ups', href: '/settings/email', icon: <MessageSquare size={18} />, iconColor: 'var(--purple)' },
      { title: 'SMS Templates', description: 'Text message templates for status updates', href: '/settings/sms-templates', icon: <MessageSquare size={18} />, iconColor: 'var(--green)' },
      { title: 'Phone & Twilio', description: 'Configure phone integration and call tracking', href: '/settings/phone', icon: <Phone size={18} />, iconColor: 'var(--cyan)' },
    ],
  },
  {
    name: 'Products & Inventory',
    cards: [
      { title: 'Products Catalog', description: 'Manage wrap products, PPF, and service offerings', href: '/settings/products', icon: <Package size={18} />, iconColor: 'var(--accent)' },
      { title: 'Materials Catalog', description: 'Vinyl brands, colors, and material pricing', href: '/settings/materials', icon: <Boxes size={18} />, iconColor: 'var(--amber)' },
    ],
  },
  {
    name: 'AI & Automation',
    cards: [
      { title: 'AI Command Center', description: 'Configure AI assistants and training data', href: '/settings/ai', icon: <Brain size={18} />, iconColor: 'var(--purple)' },
      { title: 'AI Controls', description: 'Fine-tune AI behavior, limits, and safety rails', href: '/settings/ai-controls', icon: <Sliders size={18} />, iconColor: 'var(--cyan)' },
      { title: 'Workflows', description: 'Automated workflows and trigger rules', href: '/settings/workflows', icon: <Workflow size={18} />, iconColor: 'var(--green)' },
    ],
  },
  {
    name: 'Payments',
    cards: [
      { title: 'Stripe Configuration', description: 'Connect Stripe and manage payment processing', href: '/settings/payments', icon: <CreditCard size={18} />, iconColor: 'var(--green)' },
    ],
  },
  {
    name: 'Access & Security',
    cards: [
      { title: 'Permissions & Roles', description: 'Role-based access control and team permissions', href: '/settings/permissions', icon: <Lock size={18} />, iconColor: 'var(--red)' },
      { title: 'Visibility', description: 'Control cross-department pipeline visibility', href: '/settings/visibility', icon: <Eye size={18} />, iconColor: 'var(--amber)' },
    ],
  },
  {
    name: 'Data Management',
    cards: [
      { title: 'Import Jobs', description: 'Bulk import jobs from CSV or external systems', href: '/settings/import-jobs', icon: <Upload size={18} />, iconColor: 'var(--accent)' },
      { title: 'Simulation Data', description: 'Load or clear sample jobs for testing', href: '/settings/simulation', icon: <Database size={18} />, iconColor: 'var(--red)' },
    ],
  },
  {
    name: 'Platform Features',
    cards: [
      { title: 'Production & Printers', description: 'Printer profiles, queues, and print settings', href: '/production/printers', icon: <Printer size={18} />, iconColor: 'var(--green)' },
      { title: 'Calendar & Scheduling', description: 'Work hours, holidays, and scheduling rules', href: '/calendar', icon: <Calendar size={18} />, iconColor: 'var(--cyan)' },
      { title: 'Installer Network', description: 'Manage installer groups and bid settings', href: '/network', icon: <Users size={18} />, iconColor: 'var(--accent)' },
      { title: 'Campaigns', description: 'Marketing campaigns and outreach settings', href: '/campaigns', icon: <Megaphone size={18} />, iconColor: 'var(--purple)' },
      { title: 'Integrations', description: 'Connect third-party services and APIs', href: '/settings/integrations', icon: <Plug size={18} />, iconColor: 'var(--amber)' },
      { title: 'Automations', description: 'Automated actions and event-driven triggers', href: '/workflow', icon: <Zap size={18} />, iconColor: 'var(--green)' },
      { title: 'ROI Engine', description: 'Revenue attribution and ROI tracking', href: '/engine', icon: <BarChart3 size={18} />, iconColor: 'var(--cyan)' },
      { title: 'Notifications', description: 'Push notifications and alert preferences', href: '/settings/notifications', icon: <Bell size={18} />, iconColor: 'var(--amber)' },
      { title: 'Fleet & Vehicles', description: 'Fleet management and vehicle tracking', href: '/settings/vehicles', icon: <Truck size={18} />, iconColor: 'var(--accent)' },
    ],
  },
]

export default function SettingsHub() {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const query = search.toLowerCase().trim()

  const filtered = CATEGORIES.map(cat => ({
    ...cat,
    cards: cat.cards.filter(card =>
      !query ||
      card.title.toLowerCase().includes(query) ||
      card.description.toLowerCase().includes(query) ||
      cat.name.toLowerCase().includes(query)
    ),
  })).filter(cat => cat.cards.length > 0)

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 28,
            fontWeight: 900,
            color: 'var(--text1)',
            margin: 0,
          }}>
            Settings
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text3)', margin: '4px 0 0' }}>
            Configure your shop, team, and platform features
          </p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: 280 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search settings..."
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: 10,
              border: '1px solid rgba(90,96,128,.3)',
              background: 'var(--surface)',
              color: 'var(--text1)',
              fontSize: 13,
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Categories */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text3)', fontSize: 14 }}>
          No settings match &ldquo;{search}&rdquo;
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {filtered.map(cat => (
          <div key={cat.name}>
            <div style={{
              fontSize: 11,
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '.08em',
              color: 'var(--text3)',
              marginBottom: 12,
              paddingBottom: 8,
              borderBottom: '1px solid rgba(90,96,128,.15)',
            }}>
              {cat.name}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 12,
            }}>
              {cat.cards.map(card => (
                <button
                  key={card.href + card.title}
                  onClick={() => router.push(card.href)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '16px 18px',
                    background: 'var(--surface)',
                    border: '1px solid rgba(90,96,128,.2)',
                    borderRadius: 12,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(79,127,255,.4)'
                    e.currentTarget.style.background = 'var(--surface2)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(90,96,128,.2)'
                    e.currentTarget.style.background = 'var(--surface)'
                  }}
                >
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `color-mix(in srgb, ${card.iconColor} 12%, transparent)`,
                    color: card.iconColor,
                    flexShrink: 0,
                  }}>
                    {card.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>
                      {card.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2, lineHeight: 1.4 }}>
                      {card.description}
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
