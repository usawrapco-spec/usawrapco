import { getSupabaseAdmin } from '@/lib/supabase/service'

const STORAGE_BUCKET = 'project-files'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const portalToken = formData.get('portal_token') as string | null
    const projectId = formData.get('project_id') as string | null
    const category = (formData.get('category') as string) || 'general'
    const description = (formData.get('description') as string) || null

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }
    if (!portalToken) {
      return Response.json({ error: 'Missing portal token' }, { status: 401 })
    }

    const admin = getSupabaseAdmin()

    // Validate portal token → get customer
    const { data: customer } = await admin
      .from('customers')
      .select('id, org_id, name')
      .eq('portal_token', portalToken)
      .single()

    if (!customer) {
      return Response.json({ error: 'Invalid portal token' }, { status: 401 })
    }

    // If project_id provided, verify it belongs to this customer
    if (projectId) {
      const { data: project } = await admin
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('customer_id', customer.id)
        .single()

      if (!project) {
        return Response.json({ error: 'Project not found' }, { status: 404 })
      }
    }

    // Upload to Supabase Storage
    const ext = file.name.split('.').pop() || 'bin'
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const folder = projectId ? `projects/${projectId}` : `customers/${customer.id}`
    const storagePath = `${folder}/${filename}`

    const bytes = await file.arrayBuffer()
    const { error: uploadError } = await admin.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, bytes, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('[portal/upload] storage error:', uploadError)
      return Response.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: { publicUrl } } = admin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath)

    // Insert into media_files
    await admin
      .from('media_files')
      .insert({
        org_id: customer.org_id,
        project_id: projectId || null,
        uploaded_by: null,
        bucket: STORAGE_BUCKET,
        file_url: publicUrl,
        file_name: file.name,
        mime_type: file.type,
        file_size: file.size,
        tags: [category, 'customer-upload'],
        ai_tags: [],
        color_tags: [],
      })

    // Insert into job_images if project linked
    if (projectId) {
      await admin
        .from('job_images')
        .insert({
          org_id: customer.org_id,
          project_id: projectId,
          user_id: customer.id,
          category,
          image_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          description,
        })
        .then(({ error }) => {
          if (error) console.error('[portal/upload] job_images insert error (non-fatal):', error)
        })
    }

    // Notify shop team
    await admin
      .from('activity_log')
      .insert({
        org_id: customer.org_id,
        project_id: projectId || null,
        action: `Customer ${customer.name || 'Unknown'} uploaded a ${category} photo`,
        details: file.name,
        actor_type: 'customer',
      })
      .then(({ error }) => {
        if (error) console.error('[portal/upload] activity_log error (non-fatal):', error)
      })

    return Response.json({ url: publicUrl, storagePath, category })
  } catch (err) {
    console.error('[portal/upload] error:', err)
    return Response.json({ error: 'Upload failed' }, { status: 500 })
  }
}
