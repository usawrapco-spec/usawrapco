import { ORG_ID } from '@/lib/org'
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      customer_id,
      original_project_id,
      org_id,
      ticket_type,
      subject,
      description,
      photos,
      affected_areas,
      install_date,
      warranty_years,
      vehicle_year,
      vehicle_make,
      vehicle_model,
    } = body

    const db = getSupabaseAdmin()

    // Determine warranty expiry and eligibility
    let warrantyExpiry: Date | null = null
    let isWarrantyEligible = false
    if (install_date && warranty_years) {
      warrantyExpiry = new Date(install_date)
      warrantyExpiry.setFullYear(warrantyExpiry.getFullYear() + Number(warranty_years))
      isWarrantyEligible = new Date() < warrantyExpiry
    }

    // AI assessment if photos provided
    let aiAssessment = ''
    let aiSeverity = 'moderate'
    let aiRecommendedAction = ''
    let aiWarrantyNote = ''

    if (photos && photos.length > 0) {
      try {
        const Anthropic = (await import('@anthropic-ai/sdk')).default
        const client = new Anthropic()

        // Build image content array (max 4 photos)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const imageContent: any[] = photos.slice(0, 4).map((url: string) => ({
          type: 'image',
          source: { type: 'url', url },
        }))

        const vehicleDesc = [vehicle_year, vehicle_make, vehicle_model].filter(Boolean).join(' ')
        const installDesc = install_date ? `installed ${new Date(install_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` : ''
        const warrantyDesc = warrantyExpiry ? `warranty until ${warrantyExpiry.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` : ''

        const response = await client.messages.create({
          model: 'claude-opus-4-6',
          max_tokens: 600,
          messages: [{
            role: 'user',
            content: [
              ...imageContent,
              {
                type: 'text',
                text: `You are a vehicle wrap and PPF quality expert for USA Wrap Co, a premium vehicle wrap shop.

A customer is reporting an issue with their ${vehicleDesc || 'vehicle'} wrap ${installDesc}. ${warrantyDesc}
Ticket type: ${ticket_type || 'issue_report'}
Affected areas: ${(affected_areas || []).join(', ') || 'not specified'}
Customer description: ${description || 'No description provided'}

Analyze the photos and provide a technical assessment. Respond in JSON only:
{
  "severity": "minor|moderate|significant|warranty_eligible",
  "assessment": "Brief technical explanation of what you see (2-3 sentences max)",
  "recommended_action": "What should be done (concise)",
  "warranty_note": "Is this likely covered? Brief explanation",
  "estimated_repair_hours": 0.5
}

severity guide: minor=small cosmetic issue, moderate=noticeable but not urgent, significant=needs prompt attention, warranty_eligible=clearly a defect covered by warranty`,
              },
            ],
          }],
        })

        const aiText = response.content[0].type === 'text' ? response.content[0].text : '{}'
        const jsonMatch = aiText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const aiData = JSON.parse(jsonMatch[0])
          aiAssessment = aiData.assessment || ''
          aiSeverity = aiData.severity || 'moderate'
          aiRecommendedAction = aiData.recommended_action || ''
          aiWarrantyNote = aiData.warranty_note || ''

          // If AI analyzed photos and it's NOT a warranty defect, downgrade eligibility
          if (aiSeverity && aiSeverity !== 'warranty_eligible') {
            isWarrantyEligible = false
          }
        }
      } catch (aiErr) {
        console.error('AI assessment failed:', aiErr)
        // Continue without AI assessment
      }
    }

    // Set priority based on severity
    const priorityMap: Record<string, string> = {
      minor: 'low',
      moderate: 'normal',
      significant: 'high',
      warranty_eligible: 'high',
    }

    // Create the ticket
    const { data: ticket, error } = await db
      .from('maintenance_tickets')
      .insert({
        org_id: org_id || ORG_ID,
        customer_id,
        original_project_id,
        ticket_type: ticket_type || 'issue_report',
        subject: subject || `${vehicle_year || ''} ${vehicle_make || ''} ${vehicle_model || ''} — Issue Report`.trim(),
        description,
        photos: photos || [],
        affected_areas,
        vehicle_year,
        vehicle_make,
        vehicle_model,
        install_date,
        warranty_expiry: warrantyExpiry?.toISOString().split('T')[0] || null,
        is_warranty_eligible: isWarrantyEligible,
        ai_assessment: aiAssessment || null,
        ai_severity: aiSeverity,
        ai_recommended_action: aiRecommendedAction || null,
        priority: priorityMap[aiSeverity] || 'normal',
        status: 'open',
      })
      .select('id, ticket_token')
      .single()

    if (error) {
      console.error('Ticket insert error:', error)
      return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 })
    }

    // Create customer notification
    if (customer_id) {
      await db.from('customer_notifications').insert({
        customer_id,
        type: 'ticket_update',
        title: 'Issue report received',
        message: 'We received your issue report and will review it within 24 hours.',
        action_url: `/portal/${ticket?.ticket_token}`,
        action_label: 'Track Ticket',
      })
    }

    return NextResponse.json({
      ticket_id: ticket?.id,
      ticket_token: ticket?.ticket_token,
      ai_assessment: aiAssessment,
      ai_severity: aiSeverity,
      ai_recommended_action: aiRecommendedAction,
      ai_warranty_note: aiWarrantyNote,
      is_warranty_eligible: isWarrantyEligible,
      warranty_expiry: warrantyExpiry?.toISOString().split('T')[0] || null,
    })
  } catch (err) {
    console.error('Maintenance POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const orgId = searchParams.get('org_id') || ORG_ID
  const db = getSupabaseAdmin()

  let query = db
    .from('maintenance_tickets')
    .select(`
      *,
      customer:customer_id(id, name, email, phone),
      project:original_project_id(id, title, vehicle_desc),
      assignee:assigned_to(id, name, avatar_url)
    `)
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tickets: data })
}

export async function PATCH(req: Request) {
  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const db = getSupabaseAdmin()
  const payload: Record<string, unknown> = { ...updates, updated_at: new Date().toISOString() }
  if (updates.status === 'resolved') {
    payload.resolved_at = new Date().toISOString()
  }

  const { data, error } = await db
    .from('maintenance_tickets')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ticket: data })
}
