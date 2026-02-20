import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const projectId = formData.get('project_id') as string | null
    const orgId = formData.get('org_id') as string | null
    const uploadedBy = formData.get('uploaded_by') as string | null
    const tag = (formData.get('tag') as string) || 'general'

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    // Generate unique storage path
    const ext = file.name.split('.').pop() || 'bin'
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const folder = projectId ? `projects/${projectId}` : `misc/${orgId || 'unknown'}`
    const storagePath = `${folder}/${filename}`

    // Upload to Supabase Storage
    const bytes = await file.arrayBuffer()
    const { error: uploadError } = await admin.storage
      .from('job-images')
      .upload(storagePath, bytes, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('[media/upload] storage error:', uploadError)
      return Response.json({ error: uploadError.message }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = admin.storage
      .from('job-images')
      .getPublicUrl(storagePath)

    // Create job_images record
    const { data: record, error: dbError } = await admin
      .from('job_images')
      .insert({
        project_id: projectId,
        org_id: orgId,
        uploaded_by: uploadedBy,
        url: publicUrl,
        storage_path: storagePath,
        filename: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        tag,
      })
      .select()
      .single()

    if (dbError) {
      console.error('[media/upload] db error:', dbError)
      // File was uploaded but DB record failed — still return the URL
      return Response.json({ url: publicUrl, storagePath, error: dbError.message })
    }

    return Response.json({ url: publicUrl, storagePath, record })
  } catch (err) {
    console.error('[media/upload] error:', err)
    return Response.json({ error: 'Upload failed' }, { status: 500 })
  }
}
