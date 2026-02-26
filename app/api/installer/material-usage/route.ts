import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { ORG_ID } from '@/lib/org'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get('project_id')
  if (!projectId) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('installer_material_usage')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

  // Calculate waste percentage if both actual and estimated sq ft provided
  let wastePercentage: number | null = null
  if (body.sq_ft_used && body.estimated_sq_ft && body.estimated_sq_ft > 0) {
    wastePercentage = ((body.sq_ft_used - body.estimated_sq_ft) / body.estimated_sq_ft) * 100
  }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin.from('installer_material_usage').insert({
    org_id: ORG_ID,
    project_id: body.project_id,
    installer_id: user.id,
    vinyl_type: body.vinyl_type || null,
    vinyl_color: body.vinyl_color || null,
    vinyl_sku: body.vinyl_sku || null,
    linear_feet_used: body.linear_feet_used != null ? parseFloat(body.linear_feet_used) : null,
    sq_ft_used: body.sq_ft_used != null ? parseFloat(body.sq_ft_used) : null,
    laminate_used: body.laminate_used || false,
    laminate_sq_ft: body.laminate_sq_ft != null ? parseFloat(body.laminate_sq_ft) : null,
    leftover_linear_ft: body.leftover_linear_ft != null ? parseFloat(body.leftover_linear_ft) : null,
    leftover_sq_ft: body.leftover_sq_ft != null ? parseFloat(body.leftover_sq_ft) : null,
    estimated_sq_ft: body.estimated_sq_ft != null ? parseFloat(body.estimated_sq_ft) : null,
    waste_percentage: wastePercentage,
    notes: body.notes || null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Flag if >15% over estimated material
  if (wastePercentage !== null && wastePercentage > 15) {
    const { data: managers } = await admin
      .from('profiles')
      .select('id')
      .eq('org_id', ORG_ID)
      .in('role', ['owner', 'admin', 'production'])

    if (managers?.length) {
      await admin.from('notifications').insert(
        managers.map((m: { id: string }) => ({
          org_id: ORG_ID,
          user_id: m.id,
          title: 'Material Overage Alert',
          message: `Job material usage is ${wastePercentage!.toFixed(1)}% over estimate`,
          type: 'material_overage',
          read: false,
        }))
      )
    }
  }

  return NextResponse.json(data)
}
