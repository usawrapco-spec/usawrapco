/**
 * ════════════════════════════════════════════════════════════════════════════
 * AI PIPELINE SERVICE — CENTRAL AI ORCHESTRATION
 * ════════════════════════════════════════════════════════════════════════════
 * All AI calls go through this service for tracking, fallback, and monitoring
 */

import { createClient } from '@/lib/supabase/client'

// ══════════════════════════════════════════════════════════════════════════════
// MODEL REGISTRY — All supported AI models with costs and capabilities
// ══════════════════════════════════════════════════════════════════════════════

export const MODEL_REGISTRY: Record<string, any> = {
  // ─── Image Generation ───────────────────────────────────────────────────────
  'flux-1.1-pro-ultra': {
    provider: 'replicate',
    replicateModel: 'black-forest-labs/flux-1.1-pro-ultra',
    costPerImage: 0.06,
    category: 'image_generation',
    quality: 5,
    speed: 3,
    bestFor: ['photorealism', 'vehicles', 'high resolution'],
    maxOutputs: 4
  },
  'flux-1.1-pro': {
    provider: 'replicate',
    replicateModel: 'black-forest-labs/flux-1.1-pro',
    costPerImage: 0.04,
    category: 'image_generation',
    quality: 4,
    speed: 3,
    bestFor: ['photorealism', 'commercial'],
    maxOutputs: 4
  },
  'flux-dev': {
    provider: 'replicate',
    replicateModel: 'black-forest-labs/flux-dev',
    costPerImage: 0.025,
    category: 'image_generation',
    quality: 4,
    speed: 4,
    bestFor: ['concept generation', 'fast'],
    maxOutputs: 4
  },
  'flux-schnell': {
    provider: 'replicate',
    replicateModel: 'black-forest-labs/flux-schnell',
    costPerImage: 0.003,
    category: 'image_generation',
    quality: 3,
    speed: 5,
    bestFor: ['quick drafts', 'testing'],
    maxOutputs: 4
  },
  'ideogram-v2': {
    provider: 'ideogram',
    costPerImage: 0.08,
    category: 'image_generation',
    quality: 5,
    speed: 3,
    bestFor: ['text accuracy', 'lettering', 'logos on vehicles'],
    maxOutputs: 4
  },
  'ideogram-v2-turbo': {
    provider: 'ideogram',
    costPerImage: 0.05,
    category: 'image_generation',
    quality: 4,
    speed: 4,
    bestFor: ['text accuracy', 'fast'],
    maxOutputs: 4
  },
  'recraft-v3': {
    provider: 'replicate',
    replicateModel: 'recraft-ai/recraft-v3',
    costPerImage: 0.04,
    category: 'image_generation',
    quality: 4,
    speed: 4,
    bestFor: ['clean graphics', 'vectors', 'illustration style'],
    maxOutputs: 1
  },
  // ─── Upscaling ──────────────────────────────────────────────────────────────
  'clarity-upscaler': {
    provider: 'replicate',
    replicateModel: 'philz1337x/clarity-upscaler',
    costPerImage: 0.01,
    category: 'upscaling',
    quality: 5,
    speed: 3,
    bestFor: ['print quality', 'detail enhancement'],
    maxOutputs: 1
  },
  'real-esrgan': {
    provider: 'replicate',
    replicateModel: 'nightmareai/real-esrgan',
    costPerImage: 0.001,
    category: 'upscaling',
    quality: 4,
    speed: 5,
    bestFor: ['fast upscale', 'basic enhancement'],
    maxOutputs: 1
  },
  // ─── ControlNet ─────────────────────────────────────────────────────────────
  'controlnet-depth': {
    provider: 'replicate',
    replicateModel: 'jagilley/controlnet-depth2img',
    costPerImage: 0.02,
    category: 'depth_mapping',
    quality: 5,
    speed: 3,
    bestFor: ['vehicle depth mapping', 'realistic placement'],
    maxOutputs: 1
  },
  // ─── Brand Analysis ─────────────────────────────────────────────────────────
  'claude-opus-4-5': {
    provider: 'anthropic',
    anthropicModel: 'claude-opus-4-5',
    costPer1kTokens: 0.015,
    category: 'brand_analysis',
    quality: 5,
    speed: 3,
    bestFor: ['deep brand analysis', 'complex strategy'],
  },
  'claude-sonnet-4-5': {
    provider: 'anthropic',
    anthropicModel: 'claude-sonnet-4-5',
    costPer1kTokens: 0.003,
    category: 'brand_analysis',
    quality: 4,
    speed: 5,
    bestFor: ['fast analysis', 'general use'],
  },
  // ─── Background Removal ─────────────────────────────────────────────────────
  'remove-bg': {
    provider: 'removebg',
    costPerImage: 0.01,
    category: 'background_removal',
    quality: 5,
    speed: 4,
    bestFor: ['logos', 'products', 'people'],
  },
  'imgly-bg-removal': {
    provider: 'client_side',
    costPerImage: 0,
    category: 'background_removal',
    quality: 3,
    speed: 5,
    bestFor: ['free option', 'simple backgrounds'],
  },
  // ─── Vectorization ──────────────────────────────────────────────────────────
  'vectorizer-ai': {
    provider: 'vectorizer',
    costPerImage: 0.002,
    category: 'vectorization',
    quality: 5,
    speed: 4,
    bestFor: ['logos', 'graphics', 'print vectors'],
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// DEFAULT PIPELINE CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_PIPELINE: Record<string, any> = {
  concept_generation: {
    step_label: 'Concept Generation',
    primary_model: 'flux-1.1-pro-ultra',
    fallback_model: 'flux-dev',
    api_provider: 'replicate',
    description: 'Generate initial vehicle wrap concepts',
    cost_per_call: 0.24 // 4 images × $0.06
  },
  upscaling: {
    step_label: 'Print Upscaling',
    primary_model: 'clarity-upscaler',
    fallback_model: 'real-esrgan',
    api_provider: 'replicate',
    description: 'Upscale concepts to print resolution',
    cost_per_call: 0.01
  },
  depth_mapping: {
    step_label: 'Vehicle Depth Mapping',
    primary_model: 'controlnet-depth',
    fallback_model: null,
    api_provider: 'replicate',
    description: 'Map design onto real vehicle photo contours',
    cost_per_call: 0.02
  },
  brand_analysis: {
    step_label: 'Brand Analysis',
    primary_model: 'claude-sonnet-4-5',
    fallback_model: 'claude-opus-4-5',
    api_provider: 'anthropic',
    description: 'Analyze customer brand and generate recommendations',
    cost_per_call: 0.003
  },
  background_removal: {
    step_label: 'Background Removal',
    primary_model: 'remove-bg',
    fallback_model: 'imgly-bg-removal',
    api_provider: 'removebg',
    description: 'Remove background from logos and images',
    cost_per_call: 0.01
  },
  vectorization: {
    step_label: 'Vectorization',
    primary_model: 'vectorizer-ai',
    fallback_model: null,
    api_provider: 'vectorizer',
    description: 'Convert AI graphics to print-ready vectors',
    cost_per_call: 0.002
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PIPELINE EXECUTOR
// ══════════════════════════════════════════════════════════════════════════════

export async function runPipeline(
  step: string,
  input: any,
  context: { orgId: string; userId: string; projectId?: string }
): Promise<{ success: boolean; result: any; model: string; cost: number; latencyMs: number }> {

  const supabase = createClient()
  const startTime = Date.now()

  // Get config for this step
  const { data: config } = await supabase
    .from('ai_pipeline_config')
    .select('*')
    .eq('org_id', context.orgId)
    .eq('pipeline_step', step)
    .single()

  const primaryModel = config?.primary_model || DEFAULT_PIPELINE[step]?.primary_model
  const fallbackModel = config?.fallback_model || DEFAULT_PIPELINE[step]?.fallback_model

  if (!primaryModel) {
    throw new Error(`No model configured for pipeline step: ${step}`)
  }

  let result = null
  let modelUsed = primaryModel
  let error = null
  let cost = 0

  // Try primary model
  try {
    result = await callModel(primaryModel, input, context.orgId)
    cost = calculateCost(primaryModel, input)
  } catch (err: any) {
    console.error(`Primary model ${primaryModel} failed:`, err.message)
    error = err.message

    // Try fallback
    if (fallbackModel) {
      console.log(`Attempting fallback model: ${fallbackModel}`)
      try {
        result = await callModel(fallbackModel, input, context.orgId)
        modelUsed = fallbackModel
        cost = calculateCost(fallbackModel, input)
        error = null
      } catch (fallbackErr: any) {
        console.error(`Fallback model ${fallbackModel} failed:`, fallbackErr.message)
        error = fallbackErr.message
      }
    }
  }

  const latencyMs = Date.now() - startTime
  const success = result !== null && error === null

  // Log usage
  await supabase.from('ai_usage_log').insert({
    org_id: context.orgId,
    pipeline_step: step,
    model_used: modelUsed,
    provider: MODEL_REGISTRY[modelUsed]?.provider || 'unknown',
    prompt_preview: JSON.stringify(input).slice(0, 200),
    success,
    error_message: error,
    latency_ms: latencyMs,
    cost,
    result_urls: Array.isArray(result) ? result : result ? [result] : [],
    project_id: context.projectId || null,
    user_id: context.userId
  })

  // Update aggregate stats (fire and forget)
  supabase.rpc('update_pipeline_stats', {
    p_org_id: context.orgId,
    p_step: step,
    p_cost: cost,
    p_latency: latencyMs,
    p_success: success
  }).then(({ error }) => { if (error) console.error('Failed to update pipeline stats:', error) })

  return { success, result, model: modelUsed, cost, latencyMs }
}

// ══════════════════════════════════════════════════════════════════════════════
// MODEL CALLERS — Route to correct provider
// ══════════════════════════════════════════════════════════════════════════════

async function callModel(model: string, input: any, orgId: string): Promise<any> {
  const modelInfo = MODEL_REGISTRY[model]
  if (!modelInfo) throw new Error(`Unknown model: ${model}`)

  switch (modelInfo.provider) {
    case 'replicate':
      return callReplicate(model, modelInfo.replicateModel, input, orgId)
    case 'ideogram':
      return callIdeogram(model, input, orgId)
    case 'anthropic':
      return callAnthropic(modelInfo.anthropicModel, input, orgId)
    case 'removebg':
      return callRemoveBg(input, orgId)
    case 'vectorizer':
      return callVectorizer(input, orgId)
    case 'client_side':
      throw new Error('Client-side model cannot be called server-side')
    default:
      throw new Error(`Unknown provider: ${modelInfo.provider}`)
  }
}

async function callReplicate(modelKey: string, replicateModel: string, input: any, orgId: string) {
  const token = await getApiKey('replicate_api_token', orgId)
  if (!token) throw new Error('REPLICATE_API_TOKEN not configured')

  const response = await fetch(
    `https://api.replicate.com/v1/models/${replicateModel}/predictions`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait=60'
      },
      body: JSON.stringify({ input })
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Replicate API error')
  }

  const prediction = await response.json()
  if (prediction.error) throw new Error(prediction.error)

  // Poll if needed
  if (prediction.status !== 'succeeded') {
    let result = prediction
    let attempts = 0
    while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < 30) {
      await new Promise(r => setTimeout(r, 2000))
      const poll = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      result = await poll.json()
      attempts++
    }
    if (result.status === 'failed') throw new Error(result.error || 'Generation failed')
    return result.output
  }

  return prediction.output
}

async function callIdeogram(modelKey: string, input: any, orgId: string) {
  const token = await getApiKey('ideogram_api_key', orgId)
  if (!token) throw new Error('IDEOGRAM_API_KEY not configured')

  const response = await fetch('https://api.ideogram.ai/generate', {
    method: 'POST',
    headers: { 'Api-Key': token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_request: {
        prompt: input.prompt,
        model: modelKey === 'ideogram-v2-turbo' ? 'V_2_TURBO' : 'V_2',
        aspect_ratio: input.aspect_ratio || 'ASPECT_16_9',
        style_type: 'REALISTIC',
        negative_prompt: input.negative_prompt || 'cartoon, blurry, distorted text',
        num_images: input.num_outputs || 4
      }
    })
  })

  if (!response.ok) {
    throw new Error('Ideogram API error')
  }

  const data = await response.json()
  if (data.error) throw new Error(data.error)
  return data.data?.map((img: any) => img.url) || []
}

async function callAnthropic(model: string, input: any, orgId: string) {
  const token = process.env.ANTHROPIC_API_KEY || await getApiKey('anthropic_api_key', orgId)
  if (!token) throw new Error('ANTHROPIC_API_KEY not configured')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': token,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      max_tokens: input.max_tokens || 2000,
      messages: input.messages || [{ role: 'user', content: input.prompt }]
    })
  })

  if (!response.ok) {
    throw new Error('Anthropic API error')
  }

  const data = await response.json()
  if (data.error) throw new Error(data.error.message)
  return data.content[0].text
}

async function callRemoveBg(input: any, orgId: string) {
  const token = await getApiKey('removebg_api_key', orgId)
  if (!token) throw new Error('REMOVEBG_API_KEY not configured')

  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: { 'X-Api-Key': token },
    body: JSON.stringify({
      image_url: input.image_url,
      size: 'auto',
      format: 'png'
    })
  })

  if (!response.ok) throw new Error('Remove.bg API error')
  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

async function callVectorizer(input: any, orgId: string) {
  const token = await getApiKey('vectorizer_api_key', orgId)
  if (!token) throw new Error('VECTORIZER_API_KEY not configured')

  const response = await fetch('https://vectorizer.ai/api/v1/vectorize', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      image_url: input.image_url,
      output_format: 'svg'
    })
  })

  if (!response.ok) throw new Error('Vectorizer API error')
  const data = await response.json()
  return data.svg_url
}

async function getApiKey(keyName: string, orgId: string): Promise<string | null> {
  // Check env first
  const envMap: Record<string, string> = {
    'replicate_api_token': process.env.REPLICATE_API_TOKEN || '',
    'anthropic_api_key': process.env.ANTHROPIC_API_KEY || '',
    'ideogram_api_key': process.env.IDEOGRAM_API_KEY || '',
    'removebg_api_key': process.env.REMOVEBG_API_KEY || '',
    'vectorizer_api_key': process.env.VECTORIZER_API_KEY || ''
  }
  if (envMap[keyName]) return envMap[keyName]

  // Fall back to org_config database
  const supabase = createClient()
  const { data } = await supabase
    .from('org_config')
    .select('value')
    .eq('org_id', orgId)
    .eq('key', keyName)
    .single()

  return data?.value || null
}

function calculateCost(model: string, input: any): number {
  const info = MODEL_REGISTRY[model]
  if (!info) return 0
  if ('costPerImage' in info) {
    return info.costPerImage * (input.num_outputs || 1)
  }
  if ('costPer1kTokens' in info) {
    return (info.costPer1kTokens * (input.max_tokens || 1000)) / 1000
  }
  return info.costPerImage || 0
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

export async function initializePipelineConfig(orgId: string) {
  const supabase = createClient()

  // Check if already initialized
  const { data: existing } = await supabase
    .from('ai_pipeline_config')
    .select('id')
    .eq('org_id', orgId)
    .limit(1)

  if (existing && existing.length > 0) return

  // Insert default config
  const configs = Object.entries(DEFAULT_PIPELINE).map(([step, config]) => ({
    org_id: orgId,
    pipeline_step: step,
    step_label: config.step_label,
    primary_model: config.primary_model,
    fallback_model: config.fallback_model,
    api_provider: config.api_provider,
    cost_per_call: config.cost_per_call
  }))

  await supabase.from('ai_pipeline_config').insert(configs)
}
