'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Profile } from '@/types'
import {
  Settings,
  Users,
  Shield,
  DollarSign,
  Package,
  TrendingUp,
  Zap,
  AlertTriangle,
  ChevronRight,
  Building2,
} from 'lucide-react'

interface AdminDashboardProps {
  profile: Profile
}

export default function AdminDashboard({ profile }: AdminDashboardProps) {
  const menuItems = [
    {
      title: 'Organization Settings',
      description: 'Business info, logo, tax rate, timezone',
      icon: Building2,
      href: '/admin/org',
      color: 'text-accent',
      bg: 'bg-accent/10',
    },
    {
      title: 'User Management',
      description: 'Manage users, roles, permissions, invites',
      icon: Users,
      href: '/admin/users',
      color: 'text-cyan',
      bg: 'bg-cyan/10',
    },
    {
      title: 'Permissions Editor',
      description: 'Visual permission matrix for all roles',
      icon: Shield,
      href: '/admin/permissions',
      color: 'text-purple',
      bg: 'bg-purple/10',
    },
    {
      title: 'Commission Rules',
      description: 'Configure commission rates, bonuses, tiers',
      icon: DollarSign,
      href: '/admin/commissions',
      color: 'text-green',
      bg: 'bg-green/10',
    },
    {
      title: 'Material Pricing',
      description: 'Wrap and decking material costs',
      icon: Package,
      href: '/admin/materials',
      color: 'text-amber',
      bg: 'bg-amber/10',
    },
    {
      title: 'Overhead Settings',
      description: 'Monthly overhead line items and burn rate',
      icon: TrendingUp,
      href: '/admin/overhead',
      color: 'text-cyan',
      bg: 'bg-cyan/10',
    },
    {
      title: 'Integrations',
      description: 'QuickBooks, Twilio, Stripe, API keys',
      icon: Zap,
      href: '/admin/integrations',
      color: 'text-purple',
      bg: 'bg-purple/10',
    },
    {
      title: 'Danger Zone',
      description: 'Export data, reset settings, destructive actions',
      icon: AlertTriangle,
      href: '/admin/danger',
      color: 'text-red',
      bg: 'bg-red/10',
    },
  ]

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-3xl font-900 text-text1 mb-1" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>
          Admin Control Center
        </h1>
        <p className="text-sm text-text3">
          Organization-wide settings and controls. Only accessible to the owner.
        </p>
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-start gap-4 p-5 rounded-xl border border-border bg-surface hover:border-accent/50 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className={`${item.bg} p-3 rounded-lg shrink-0`}>
                <Icon size={24} className={item.color} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-700 text-text1 group-hover:text-accent transition-colors">
                    {item.title}
                  </h3>
                  <ChevronRight size={16} className="text-text3 group-hover:text-accent transition-colors" />
                </div>
                <p className="text-sm text-text3">
                  {item.description}
                </p>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Footer Note */}
      <div className="mt-8 p-4 rounded-lg bg-amber/5 border border-amber/20">
        <p className="text-xs text-text3">
          <strong className="text-amber">Admin Access:</strong> These settings affect the entire organization.
          Changes here apply to all users and all data. Proceed with caution.
        </p>
      </div>
    </div>
  )
}
