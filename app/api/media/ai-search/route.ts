import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const VALID_CATEGORIES = [
  'vehicle', 'logo', 'design', 'before', 'after',
  'install', 'marine', 'trailer', 'signage', 'general',
] as const

const RESULTS_LIMIT = 100

interface ParsedFilters {
  categories: string[]
  tags: string[]
  text_search: string
}

export async function POST(req: Request) {
  try {
    // Authenticate user
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { query } = body

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'query is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    const trimmedQuery = query.trim()

    if (trimmedQuery.length > 500) {
      return NextResponse.json(
        { error: 'Query must be 500 characters or less' },
        { status: 400 }
      )
    }

    // Call Claude to parse natural language query into structured filters
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `Parse this search query: "${trimmedQuery}"`,
      }],
      system: 'You are a search query parser for a vehicle wrap shop media library. Convert the user\'s natural language search into structured filters. Return JSON only: {"categories": ["matching categories from: vehicle, logo, design, before, after, install, marine, trailer, signage, general"], "tags": ["matching tag keywords"], "text_search": "text to search in file names and descriptions"}',
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
    let filters: ParsedFilters = { categories: [], tags: [], text_search: '' }

    try {
      const match = text.match(/\{[\s\S]*\}/)
      if (match) {
        const parsed = JSON.parse(match[0])
        filters = {
          categories: Array.isArray(parsed.categories)
            ? parsed.categories.filter(
                (c: unknown): c is string =>
                  typeof c === 'string' &&
                  VALID_CATEGORIES.includes(c as typeof VALID_CATEGORIES[number])
              )
            : [],
          tags: Array.isArray(parsed.tags)
            ? parsed.tags.filter((t: unknown): t is string => typeof t === 'string')
            : [],
          text_search: typeof parsed.text_search === 'string' ? parsed.text_search.trim() : '',
        }
      }
    } catch {
      console.error('[ai-search] Failed to parse AI response:', text)
      return NextResponse.json(
        { error: 'Failed to parse search query' },
        { status: 500 }
      )
    }

    // If no filters were extracted, fall back to a basic text search
    const hasFilters = filters.categories.length > 0 ||
      filters.tags.length > 0 ||
      filters.text_search.length > 0

    if (!hasFilters) {
      filters.text_search = trimmedQuery
    }

    const admin = getSupabaseAdmin()

    // Build query with OR conditions across filter types
    // We use multiple queries and merge results to handle OR logic cleanly
    const imageIdSets: Set<string>[] = []

    // 1. Category filter
    if (filters.categories.length > 0) {
      const { data: categoryResults, error: catError } = await admin
        .from('job_images')
        .select('id')
        .in('category', filters.categories)
        .limit(RESULTS_LIMIT)

      if (!catError && categoryResults) {
        imageIdSets.push(new Set(categoryResults.map((r) => r.id)))
      }
    }

    // 2. Tag filter — match any image whose ai_tags array overlaps with search tags
    if (filters.tags.length > 0) {
      const { data: tagResults, error: tagError } = await admin
        .from('job_images')
        .select('id')
        .overlaps('ai_tags', filters.tags)
        .limit(RESULTS_LIMIT)

      if (!tagError && tagResults) {
        imageIdSets.push(new Set(tagResults.map((r) => r.id)))
      }
    }

    // 3. Text search — search file_name and metadata->ai_analysis->description
    if (filters.text_search.length > 0) {
      const searchTerm = `%${filters.text_search}%`

      const { data: nameResults, error: nameError } = await admin
        .from('job_images')
        .select('id')
        .ilike('file_name', searchTerm)
        .limit(RESULTS_LIMIT)

      if (!nameError && nameResults) {
        imageIdSets.push(new Set(nameResults.map((r) => r.id)))
      }

      // Also search tags array for partial text matches
      // Use a broader tag search with individual words
      const searchWords = filters.text_search.toLowerCase().split(/\s+/).filter(Boolean)
      if (searchWords.length > 0) {
        const { data: wordTagResults, error: wordTagError } = await admin
          .from('job_images')
          .select('id')
          .overlaps('ai_tags', searchWords)
          .limit(RESULTS_LIMIT)

        if (!wordTagError && wordTagResults) {
          imageIdSets.push(new Set(wordTagResults.map((r) => r.id)))
        }
      }
    }

    // Merge all matched IDs (union / OR logic)
    const allMatchedIds = new Set<string>()
    for (let i = 0; i < imageIdSets.length; i++) {
      const idArray = Array.from(imageIdSets[i])
      for (let j = 0; j < idArray.length; j++) {
        allMatchedIds.add(idArray[j])
      }
    }

    if (allMatchedIds.size === 0) {
      return NextResponse.json({
        images: [],
        filters,
        total: 0,
      })
    }

    // Fetch full image records for matched IDs
    const matchedIdsArray = Array.from(allMatchedIds).slice(0, RESULTS_LIMIT)
    const { data: images, error: fetchError } = await admin
      .from('job_images')
      .select('*')
      .in('id', matchedIdsArray)
      .order('created_at', { ascending: false })
      .limit(RESULTS_LIMIT)

    if (fetchError) {
      console.error('[ai-search] fetch error:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch search results' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      images: images || [],
      filters,
      total: images?.length || 0,
    })
  } catch (err) {
    console.error('[ai-search] error:', err)
    return NextResponse.json(
      { error: 'AI search failed' },
      { status: 500 }
    )
  }
}
