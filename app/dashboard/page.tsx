import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { canAccess } from '@/types'
import type { Profile, Project } from '@/types'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import DashboardWrapper from '@/components/dashboard/DashboardWrapper'

export default async function DashboardPage() {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Load profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (!profile) redirect('/login')

    // Load projects with customer join
    let query = supabase
        .from('projects')
        .select(`
            *,
            agent:agent_id(id, name, email),
            installer:installer_id(id, name, email),
            customer:customer_id(id, name, email)
        `)
        .eq('org_id', profile.org_id)
        .order('updated_at', { ascending: false })
        .limit(200)

    // Scope by role — RLS also enforces this server-side, this is for UX clarity
    if (profile.role === 'installer') {
        query = query.eq('installer_id', user.id)
    } else if (profile.role === 'customer') {
        query = query.eq('customer_id', user.id)
    } else if (profile.role === 'sales' && !canAccess(profile.role, 'view_all_projects')) {
        query = query.eq('agent_id', user.id)
    }
    // admin / production / designer get all (filtered by RLS)

    const { data: projects, error } = await query

    if (error) {
        console.error('Projects load error:', error)
    }

    // Period stats — only for roles that can see financials
    const canSeeFinancials = canAccess(profile.role, 'view_financials')

    return (
        <DashboardWrapper
            orgId={profile.org_id}
            profileId={user.id}
            role={profile.role}
        >
            <DashboardClient
                profile={profile as Profile}
                initialProjects={(projects as Project[]) || []}
                canSeeFinancials={canSeeFinancials}
            />
        </DashboardWrapper>
    )
}
