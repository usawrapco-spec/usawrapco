import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { canAccess, isAdminRole } from '@/types'
import type { Profile, Project } from '@/types'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import XPAwarder from '@/components/dashboard/XPAwarder'
import RoleDashboard from '@/components/dashboard/RoleDashboard'
import DashboardHero from '@/components/dashboard/DashboardHero'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export default async function DashboardPage() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Use admin client — bypasses RLS so profile always loads
    const admin = getSupabaseAdmin()
    const { data: profile } = await admin
        .from('profiles')
        .select('id, name, email, role, org_id, avatar_url, xp_total, xp_level, badge_ids, commission_type, hourly_rate, phone, email_signature')
        .eq('id', user.id)
        .single()

    if (!profile) redirect('/login')

    const orgId = profile.org_id || ORG_ID

    // Load projects — exclude large form_data JSON for list view
    let query = admin
        .from('projects')
        .select(`
            id, title, status, pipe_stage, revenue, profit, gpm,
            install_date, created_at, updated_at, org_id,
            agent_id, installer_id, customer_id,
            vehicle_desc, send_backs,
            agent:agent_id(id, name, email),
            installer:installer_id(id, name, email),
            customer:customer_id(id, name, email)
        `)
        .eq('org_id', orgId)
        .order('updated_at', { ascending: false })
        .limit(200)

    // Scope by role
    if (profile.role === 'installer') {
        query = query.eq('installer_id', user.id)
    } else if (profile.role === 'sales_agent') {
        query = query.eq('agent_id', user.id)
    }
    // owner / admin / production / designer get all

    const { data: projects, error } = await query

    if (error) {
        console.error('Projects load error:', error)
    }

    const canSeeFinancials = isAdminRole(profile.role) || canAccess(profile.role, 'view_financials')

    return (
        <XPAwarder>
            <DashboardHero
                profile={profile as Profile}
                projects={(projects as Project[]) || []}
                canSeeFinancials={canSeeFinancials}
            />
            <RoleDashboard
                profile={profile as Profile}
                projects={(projects as Project[]) || []}
            />
            <DashboardClient
                profile={profile as Profile}
                initialProjects={(projects as Project[]) || []}
                canSeeFinancials={canSeeFinancials}
            />
        </XPAwarder>
    )
}
