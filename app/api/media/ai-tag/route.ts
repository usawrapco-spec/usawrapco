import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

const VALID_CATEGORIES = [
  'vehicle', 'logo', 'design', 'before', 'after',
  'install', 'marine', 'trailer', 'signage', 'general',
] as const

const BATCH_LIMIT = 20

interface AiAnalysis {
  category: string
  tags: string[]
  description: string
  confidence: number
}

interface TagResult {
  imageId: string
  success: boolean
  analysis?: AiAnalysis
  error?: string
}

export async function POST(req: Request) {
  try {
    // Authenticate user
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const anthropic = new Anthropic()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { imageIds } = body

    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json(
        { error: 'imageIds must be a non-empty array' },
        { status: 400 }
      )
    }

    if (imageIds.length > BATCH_LIMIT) {
      return NextResponse.json(
        { error: `Batch limit is ${BATCH_LIMIT} images` },
        { status: 400 }
      )
    }

    const admin = getSupabaseAdmin()

    // Fetch all image records
    const { data: images, error: fetchError } = await admin
      .from('job_images')
      .select('id, image_url, public_url, storage_path, file_name, mime_type')
      .in('id', imageIds)

    if (fetchError) {
      console.error('[ai-tag] fetch error:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch image records' },
        { status: 500 }
      )
    }

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: 'No matching image records found' },
        { status: 404 }
      )
    }

    // Process each image
    const results: TagResult[] = await Promise.all(
      images.map(async (image): Promise<TagResult> => {
        try {
          const imageUrl = image.public_url || image.image_url
          if (!imageUrl) {
            return { imageId: image.id, success: false, error: 'No image URL available' }
          }

          // Fetch image and convert to base64
          const imgRes = await fetch(imageUrl)
          if (!imgRes.ok) {
            return { imageId: image.id, success: false, error: `Failed to fetch image (${imgRes.status})` }
          }

          const buffer = await imgRes.arrayBuffer()
          const base64 = Buffer.from(buffer).toString('base64')
          const mime = image.mime_type || imgRes.headers.get('content-type') || 'image/jpeg'

          // Call Claude Vision
          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 512,
            messages: [{
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mime as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                    data: base64,
                  },
                },
                {
                  type: 'text',
                  text: 'Analyze this image and return JSON only.',
                },
              ],
            }],
            system: 'You are analyzing photos for a vehicle wrap shop. Analyze the image and return JSON only: {"category": "one of: vehicle, logo, design, before, after, install, marine, trailer, signage, general", "tags": ["array of descriptive tags like color, vehicle type, wrap type, condition"], "description": "brief one-sentence description", "confidence": 0.0-1.0}',
          })

          // Parse response
          const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
          let analysis: AiAnalysis | null = null

          try {
            const match = text.match(/\{[\s\S]*\}/)
            if (match) {
              analysis = JSON.parse(match[0]) as AiAnalysis
            }
          } catch {
            return { imageId: image.id, success: false, error: 'Failed to parse AI response' }
          }

          if (!analysis) {
            return { imageId: image.id, success: false, error: 'No valid JSON in AI response' }
          }

          // Validate and normalize category
          const normalizedCategory = VALID_CATEGORIES.includes(
            analysis.category as typeof VALID_CATEGORIES[number]
          )
            ? analysis.category
            : 'general'

          // Ensure tags is an array of strings
          const normalizedTags = Array.isArray(analysis.tags)
            ? analysis.tags.filter((t): t is string => typeof t === 'string')
            : []

          // Update the job_images record
          const { error: updateError } = await admin
            .from('job_images')
            .update({
              tags: normalizedTags,
              category: normalizedCategory,
              description: analysis.description || undefined,
            })
            .eq('id', image.id)

          if (updateError) {
            console.error(`[ai-tag] update error for ${image.id}:`, updateError)
            return { imageId: image.id, success: false, error: 'Failed to update image record' }
          }

          return {
            imageId: image.id,
            success: true,
            analysis: {
              category: normalizedCategory,
              tags: normalizedTags,
              description: analysis.description || '',
              confidence: typeof analysis.confidence === 'number' ? analysis.confidence : 0,
            },
          }
        } catch (err) {
          console.error(`[ai-tag] error processing ${image.id}:`, err)
          return {
            imageId: image.id,
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          }
        }
      })
    )

    const successCount = results.filter((r) => r.success).length
    const failCount = results.filter((r) => !r.success).length

    return NextResponse.json({
      results,
      summary: {
        total: results.length,
        success: successCount,
        failed: failCount,
      },
    })
  } catch (err) {
    console.error('[ai-tag] error:', err)
    return NextResponse.json(
      { error: 'AI tagging failed' },
      { status: 500 }
    )
  }
}
