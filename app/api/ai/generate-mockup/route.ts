import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { ORG_ID } from '@/lib/org'
import Anthropic from '@anthropic-ai/sdk'

async function getReplicateToken(): Promise<string | null> {
  if (process.env.REPLICATE_API_TOKEN) {
    return process.env.REPLICATE_API_TOKEN
  }
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const admin = getSupabaseAdmin()
    const { data: profile } = await admin
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile?.org_id) return null

    const { data: integration } = await admin
      .from('integrations')
      .select('config')
      .eq('org_id', profile.org_id)
      .eq('integration_id', 'replicate')
      .eq('enabled', true)
      .single()

    return integration?.config?.api_token || null
  } catch {
    return null
  }
}

async function storeInSupabase(imageUrl: string, orgId?: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl)
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    const admin = getSupabaseAdmin()
    const fileName = `mockup-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
    const path = orgId ? `${orgId}/${fileName}` : fileName
    const { error } = await admin.storage
      .from('project-files')
      .upload(path, Buffer.from(buffer), { contentType: 'image/jpeg', upsert: false })
    if (error) return imageUrl // fallback to original URL
    const {
      data: { publicUrl },
    } = admin.storage.from('project-files').getPublicUrl(path)
    return publicUrl
  } catch {
    return imageUrl
  }
}

// Run a single flux-schnell prediction and wait for completion
async function runFluxSchnell(token: string, prompt: string): Promise<string | null> {
  try {
    const res = await fetch(
      'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Prefer: 'wait', // synchronous — returns when done (up to 60s)
        },
        body: JSON.stringify({
          input: {
            prompt,
            aspect_ratio: '4:3',
            num_outputs: 1,
            output_format: 'jpg',
            output_quality: 80,
            go_fast: true,
          },
        }),
      },
    )

    if (!res.ok) {
      const errText = await res.text()
      console.error('[generate-mockup] flux-schnell error:', res.status, errText)
      return null
    }

    const prediction = await res.json()

    if (prediction.status === 'succeeded' && prediction.output?.[0]) {
      return prediction.output[0] as string
    }

    // Poll if not yet done (Prefer: wait timeout may have hit)
    const predId = prediction.id
    if (!predId) return null

    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000))
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${predId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const p = await pollRes.json()
      if (p.status === 'succeeded' && p.output?.[0]) return p.output[0] as string
      if (p.status === 'failed' || p.status === 'canceled') return null
    }

    return null
  } catch (e) {
    console.error('[generate-mockup] runFluxSchnell error:', e)
    return null
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // ── NEW WIZARD MODE ────────────────────────────────────────────────────────
    // Triggered by: { customer_id?, vehicle_type, brand_colors, logo_url?,
    //                  style_preference, business_name, tagline? }
    // Uses Claude to craft a prompt → 3× flux-schnell → stores in design_mockups
    if (body.business_name !== undefined || body.customer_id !== undefined) {
      const {
        customer_id,
        vehicle_type,
        brand_colors,
        logo_url,
        style_preference,
        business_name,
        tagline,
      } = body

      const anthropicKey = process.env.ANTHROPIC_API_KEY
      if (!anthropicKey) {
        return Response.json(
          { error: 'Anthropic API key not configured. Add ANTHROPIC_API_KEY to environment.' },
          { status: 503 },
        )
      }

      const replicateToken = await getReplicateToken()
      if (!replicateToken) {
        return Response.json(
          { error: 'Replicate API token not configured. Add REPLICATE_API_TOKEN to environment.' },
          { status: 503 },
        )
      }

      // Get org ID from authenticated user
      let orgId = ORG_ID
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          const admin = getSupabaseAdmin()
          const { data: profile } = await admin
            .from('profiles')
            .select('org_id')
            .eq('id', user.id)
            .single()
          if (profile?.org_id) orgId = profile.org_id
        }
      } catch {
        /* use default org */
      }

      // Step 1: Claude generates the image prompt
      const colorsText = Array.isArray(brand_colors)
        ? brand_colors.join(', ')
        : typeof brand_colors === 'string'
          ? brand_colors
          : 'professional brand colors'

      const anthropic = new Anthropic({ apiKey: anthropicKey })
      const claudeRes = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        system:
          'You are an expert vehicle wrap designer. Generate a detailed, specific, photorealistic image generation prompt for a flux AI model. The prompt should describe a professional vehicle wrap design on the specified vehicle type, incorporating the brand colors, style preference, and business identity. Be specific about colors, layout, graphic elements, typography placement, and overall aesthetic. Output ONLY the image prompt, nothing else.',
        messages: [
          {
            role: 'user',
            content: `Vehicle: ${vehicle_type || 'cargo van'}, Business: ${business_name || 'professional business'}, Colors: ${colorsText}, Style: ${style_preference || 'Professional & Clean'}, Tagline: ${tagline || ''}`,
          },
        ],
      })

      const imagePrompt =
        claudeRes.content[0].type === 'text'
          ? claudeRes.content[0].text
          : `Professional vehicle wrap on ${vehicle_type || 'van'}, ${business_name || 'business'}, ${colorsText} color scheme, ${style_preference || 'clean'} style`

      // Step 2: Run 3 flux-schnell predictions in parallel
      const [url1, url2, url3] = await Promise.all([
        runFluxSchnell(replicateToken, imagePrompt),
        runFluxSchnell(replicateToken, imagePrompt),
        runFluxSchnell(replicateToken, imagePrompt),
      ])

      const mockupUrls = [url1, url2, url3].filter(Boolean) as string[]

      // Step 3: Store in Supabase
      const admin = getSupabaseAdmin()
      const { data: mockupRecord } = await admin
        .from('design_mockups')
        .insert({
          org_id: orgId,
          customer_id: customer_id || null,
          business_name: business_name || null,
          vehicle_type: vehicle_type || null,
          style_preference: style_preference || null,
          brand_colors: brand_colors || null,
          logo_url: logo_url || null,
          mockup_urls: mockupUrls,
          image_prompt: imagePrompt,
          payment_status: 'pending',
        })
        .select('id')
        .single()

      return Response.json({
        mockup_id: mockupRecord?.id || null,
        mockup_urls: mockupUrls,
        image_prompt: imagePrompt,
      })
    }

    // ── LEGACY MODE ────────────────────────────────────────────────────────────
    // Support both old params (vehicleType, vehicleColor, etc.) and new params
    // (vehicleImageBase64, brandAssets, wrapStyle, coverage)
    const {
      vehicleType,
      vehicleColor,
      designDescription,
      colors,
      style,
      vehicleImageBase64,
      brandAssets,
      wrapStyle,
      coverage,
    } = body

    const replicateToken = await getReplicateToken()
    if (!replicateToken) {
      return Response.json({
        message: 'Mockup generation not configured — add REPLICATE_API_TOKEN to env',
        mockupUrl: null,
        thumbnailUrl: null,
      })
    }

    // Build prompt from whichever params are provided
    let prompt: string
    if (vehicleImageBase64 || wrapStyle || coverage) {
      const styleDesc = wrapStyle || 'custom vinyl wrap'
      const coverageDesc = coverage || 'full wrap'
      const colorsDesc =
        Array.isArray(brandAssets) && brandAssets.length > 0
          ? `brand colors: ${brandAssets.slice(0, 3).join(', ')}`
          : 'bold commercial colors'
      prompt = `Professional vehicle wrap mockup, ${vehicleType || 'cargo van'}, ${styleDesc}, ${coverageDesc} coverage, ${colorsDesc}, photorealistic, studio lighting, clean background, high quality render`
    } else {
      prompt = `Professional vehicle wrap mockup, ${vehicleType || 'cargo van'}, ${vehicleColor || 'white'} base vehicle, ${designDescription || 'custom vinyl wrap design'}, ${colors || 'bold colors'}, ${style || 'commercial business wrap'}, photorealistic, studio lighting, clean background, high quality`
    }

    const negativePrompt = 'cartoon, illustration, low quality, blurry, distorted, watermark'

    const replicateResponse = await fetch(
      'https://api.replicate.com/v1/models/black-forest-labs/flux-pro/predictions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${replicateToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: {
            prompt,
            negative_prompt: negativePrompt,
            width: 1024,
            height: 768,
            num_outputs: 1,
            guidance_scale: 7.5,
            num_inference_steps: 30,
          },
        }),
      },
    )

    if (!replicateResponse.ok) {
      const err = await replicateResponse.text()
      console.error('[generate-mockup] Replicate error:', err)
      return Response.json({ error: 'Mockup generation failed' }, { status: 500 })
    }

    const prediction = await replicateResponse.json()

    // If prediction is already complete with output, store it
    if (prediction.status === 'succeeded' && prediction.output?.[0]) {
      const storedUrl = await storeInSupabase(prediction.output[0])
      return Response.json({
        predictionId: prediction.id,
        status: prediction.status,
        mockupUrl: storedUrl || prediction.output[0],
        thumbnailUrl: storedUrl || prediction.output[0],
        prompt,
      })
    }

    return Response.json({
      predictionId: prediction.id,
      status: prediction.status,
      mockupUrl: null,
      thumbnailUrl: null,
      prompt,
    })
  } catch (err) {
    console.error('[generate-mockup] error:', err)
    return Response.json({ error: 'Mockup generation failed' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const predictionId = searchParams.get('id')

  if (!predictionId) {
    return Response.json({ error: 'Prediction ID required' }, { status: 400 })
  }

  const replicateToken = await getReplicateToken()
  if (!replicateToken) {
    return Response.json({ error: 'Replicate API token not configured' }, { status: 503 })
  }

  const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
    headers: { Authorization: `Bearer ${replicateToken}` },
  })

  const prediction = await res.json()

  let mockupUrl = prediction.output?.[0] ?? null

  // Store in Supabase if succeeded
  if (prediction.status === 'succeeded' && mockupUrl) {
    const stored = await storeInSupabase(mockupUrl)
    if (stored) mockupUrl = stored
  }

  return Response.json({
    status: prediction.status,
    imageUrl: mockupUrl,
    mockupUrl,
    thumbnailUrl: mockupUrl,
    error: prediction.error ?? null,
  })
}
