/**
 * POST /api/mockup/customer-start
 * Public (no auth) endpoint — customer-facing design studio.
 * Takes a vehicle photo + sketch overlay + brand info, runs Flux img2img, returns mockup.
 */
export const runtime    = 'nodejs'
export const maxDuration = 300
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { compositeText, logHealth } from '@/lib/mockup/pipeline'
import { randomUUID } from 'crypto'

const REPLICATE_API = 'https://api.replicate.com/v1'
const DEFAULT_ORG   = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'
const PRINT_DPI     = 300
const BLEED_INCHES  = 0.125

// Style prompt fragments
const STYLE_PROMPTS: Record<string, string> = {
  bold:    'bold aggressive high-contrast graphics, large dramatic shapes, dark metallic tones',
  clean:   'clean professional minimal design, solid color blocking, corporate identity, crisp edges',
  dynamic: 'dynamic flowing gradients, sweeping motion lines, energetic diagonal elements',
}

// Apparel print dimensions at 300dpi (px)
const APPAREL_DIMS: Record<string, { w: number; h: number; wi: number; hi: number }> = {
  tshirt:    { w: 3600, h: 4200, wi: 12,  hi: 14   },
  hoodie:    { w: 3600, h: 4200, wi: 12,  hi: 14   },
  hat:       { w: 1200, h: 750,  wi: 4,   hi: 2.5  },
  polo:      { w: 2700, h: 3000, wi: 9,   hi: 10   },
  longsleeve:{ w: 3600, h: 4200, wi: 12,  hi: 14   },
}

async function pollReplicate(predId: string, timeoutMs = 120000): Promise<string> {
  const token    = process.env.REPLICATE_API_TOKEN!
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 2500))
    const res  = await fetch(`${REPLICATE_API}/predictions/${predId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const pred = await res.json()
    if (pred.status === 'succeeded') {
      const out = Array.isArray(pred.output) ? pred.output[0] : pred.output
      return out as string
    }
    if (pred.status === 'failed') throw new Error(`Replicate: ${pred.error}`)
  }
  throw new Error('Replicate timeout')
}

async function runFluxImg2Img(params: {
  imageUrl:  string
  prompt:    string
  strength:  number
  aspectRatio: string
}): Promise<string> {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) throw new Error('REPLICATE_API_TOKEN not set')

  const res = await fetch(`${REPLICATE_API}/models/black-forest-labs/flux-1.1-pro/predictions`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'wait' },
    body: JSON.stringify({
      input: {
        image:           params.imageUrl,
        prompt:          params.prompt,
        prompt_strength: params.strength,
        aspect_ratio:    params.aspectRatio,
        output_format:   'png',
        output_quality:  90,
        num_inference_steps: 28,
        guidance_scale:  3.5,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Replicate error: ${err}`)
  }

  const pred = await res.json()
  if (pred.status === 'succeeded') {
    return Array.isArray(pred.output) ? pred.output[0] : pred.output
  }
  return await pollReplicate(pred.id)
}

async function uploadToStorage(admin: ReturnType<typeof getSupabaseAdmin>, buffer: Buffer, path: string) {
  const { error } = await admin.storage
    .from('mockup-results')
    .upload(path, buffer, { contentType: 'image/png', upsert: true })
  if (error) throw new Error(`Storage upload failed: ${error.message}`)
  const { data } = admin.storage.from('mockup-results').getPublicUrl(path)
  return data.publicUrl
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    vehicle_photo_url,
    sketch_url,
    company_name   = '',
    tagline        = '',
    phone          = '',
    website        = '',
    logo_url,
    brand_colors   = ['#1a56f0', '#ffffff'],
    font_choice    = 'Impact',
    style          = 'bold',
    product_type   = 'wrap',
    org_id         = DEFAULT_ORG,
    // Signage specific
    sign_type,
    sign_width_in,
    sign_height_in,
    // Apparel specific
    apparel_type   = 'tshirt',
    apparel_base_color = 'white',
    print_area     = 'front',
    // Wrap specific
    vehicle_make,
    vehicle_model,
    vehicle_year,
    vehicle_body_type = 'van',
    wrap_coverage  = 'full',
  } = body

  if (!sketch_url) {
    return NextResponse.json({ error: 'sketch_url required' }, { status: 400 })
  }

  const admin     = getSupabaseAdmin()
  const mockupId  = randomUUID()
  const orgId     = org_id || DEFAULT_ORG

  // Determine print dimensions
  let printWidthIn  = sign_width_in  || null
  let printHeightIn = sign_height_in || null
  if (product_type === 'apparel') {
    const dims = APPAREL_DIMS[apparel_type] || APPAREL_DIMS.tshirt
    printWidthIn  = dims.wi
    printHeightIn = dims.hi
  }

  // Create DB record immediately
  const { error: insertErr } = await admin.from('mockup_results').insert({
    id:                mockupId,
    org_id:            orgId,
    output_type:       product_type,
    status:            'processing',
    current_step:      1,
    step_name:         'Starting generation…',
    company_name,
    tagline,
    phone,
    website,
    logo_url:          logo_url || null,
    brand_colors,
    font_choice,
    vehicle_photo_url: vehicle_photo_url || null,
    sketch_url,
    sign_type:         sign_type || null,
    sign_width_in:     sign_width_in || null,
    sign_height_in:    sign_height_in || null,
    apparel_type:      product_type === 'apparel' ? apparel_type : null,
    apparel_base_color:product_type === 'apparel' ? apparel_base_color : null,
    print_area:        product_type === 'apparel' ? print_area : null,
    print_width_in:    printWidthIn,
    print_height_in:   printHeightIn,
    input_prompt: JSON.stringify({
      vehicle_make, vehicle_model, vehicle_year,
      vehicle_body_type, wrap_coverage, style, product_type,
    }),
  })

  if (insertErr) {
    return NextResponse.json({ error: `DB error: ${insertErr.message}` }, { status: 500 })
  }

  // Run pipeline async (within maxDuration window)
  ;(async () => {
    try {
      const colorList  = brand_colors.slice(0, 3).join(', ')
      const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.bold
      let artworkUrl: string

      if (product_type === 'wrap' && vehicle_photo_url) {
        // img2img: apply wrap design onto customer's vehicle photo
        const vehicleDesc = [vehicle_year, vehicle_make, vehicle_model].filter(Boolean).join(' ')
        const coverageDesc = wrap_coverage === 'full' ? 'full vehicle wrap' :
                             wrap_coverage === 'three_quarter' ? 'three quarter wrap' :
                             wrap_coverage === 'half' ? 'half wrap' : 'partial wrap'

        await admin.from('mockup_results').update({ current_step: 2, step_name: 'Applying wrap to your vehicle…' }).eq('id', mockupId)

        const prompt = `photorealistic professional vinyl ${coverageDesc} on this ${vehicleDesc}, ${stylePrompt}, ${colorList} color scheme, sharp crisp edges, premium vinyl material, studio lighting, high quality commercial vehicle wrap photography, NO TEXT NO WORDS`
        artworkUrl = await runFluxImg2Img({
          imageUrl:    vehicle_photo_url,
          prompt,
          strength:    0.42,
          aspectRatio: '3:2',
        })

      } else if (product_type === 'apparel') {
        // img2img on the sketch (apparel template + design overlay)
        await admin.from('mockup_results').update({ current_step: 2, step_name: 'Generating apparel design…' }).eq('id', mockupId)

        const apparelDesc = apparel_type.replace(/([A-Z])/g, ' $1').toLowerCase()
        const prompt = `professional custom printed ${apparelDesc}, ${stylePrompt}, ${colorList} colors, print-ready design, clean white background, NO TEXT NO WORDS NO LETTERS`
        artworkUrl = await runFluxImg2Img({
          imageUrl:    sketch_url,
          prompt,
          strength:    0.55,
          aspectRatio: '2:3',
        })

      } else {
        // Signage or wrap without photo — generate from sketch
        await admin.from('mockup_results').update({ current_step: 2, step_name: 'Generating design…' }).eq('id', mockupId)

        const dimDesc = sign_width_in && sign_height_in ? `${sign_width_in}" x ${sign_height_in}" sign` : 'signage'
        const prompt = `professional printed ${sign_type || dimDesc}, ${stylePrompt}, ${colorList} color scheme, commercial graphic design, clean crisp print quality, NO TEXT NO WORDS NO LETTERS`
        artworkUrl = await runFluxImg2Img({
          imageUrl:    sketch_url,
          prompt,
          strength:    0.5,
          aspectRatio: '16:9',
        })
      }

      // Download and store to our bucket
      await admin.from('mockup_results').update({ current_step: 3, step_name: 'Saving artwork…' }).eq('id', mockupId)
      const artRes = await fetch(artworkUrl)
      if (!artRes.ok) throw new Error('Failed to download artwork')
      const artBuffer = Buffer.from(await artRes.arrayBuffer())
      const storedArtUrl = await uploadToStorage(admin, artBuffer, `${mockupId}/artwork.png`)

      await admin.from('mockup_results').update({
        flat_design_url: storedArtUrl,
        concept_a_url:   storedArtUrl,
      }).eq('id', mockupId)

      // Composite text & logo
      await admin.from('mockup_results').update({ current_step: 4, step_name: 'Adding your brand…' }).eq('id', mockupId)
      const { composited_url } = await compositeText({
        mockup_id:   mockupId,
        artwork_url: storedArtUrl,
        company_name,
        tagline,
        phone,
        website,
        font_choice,
        brand_colors,
        logo_url:    logo_url || undefined,
        org_id:      orgId,
      })

      // Mark complete
      await admin.from('mockup_results').update({
        status:           'concept_ready',
        current_step:     5,
        step_name:        'Mockup ready',
        final_mockup_url: composited_url,
      }).eq('id', mockupId)

    } catch (err: any) {
      await logHealth(orgId, 'customer-start', err.message)
      await admin.from('mockup_results').update({
        status:        'failed',
        error_message: err.message,
        step_name:     'Generation failed',
      }).eq('id', mockupId)
    }
  })()

  return NextResponse.json({ mockup_id: mockupId, status: 'processing' })
}
