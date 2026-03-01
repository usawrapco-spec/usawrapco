import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const post_type = searchParams.get('post_type')
    const action = searchParams.get('action')

    // Handle like toggle via GET with action param (alternative to separate endpoint)
    if (action === 'like') {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

      const post_id = searchParams.get('post_id')
      if (!post_id) return NextResponse.json({ error: 'Missing post_id' }, { status: 400 })

      const admin = getSupabaseAdmin()

      // Check if like already exists
      const { data: existing } = await admin
        .from('pnw_post_likes')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('post_id', post_id)
        .single()

      if (existing) {
        // Unlike
        await admin.from('pnw_post_likes').delete().eq('user_id', user.id).eq('post_id', post_id)
        const { data: post } = await admin.from('pnw_posts').select('likes_count').eq('id', post_id).single()
        if (post) {
          await admin.from('pnw_posts').update({ likes_count: Math.max(0, (post.likes_count || 0) - 1) }).eq('id', post_id)
        }
        return NextResponse.json({ liked: false })
      } else {
        // Like
        await admin.from('pnw_post_likes').insert({ user_id: user.id, post_id })
        const { data: post } = await admin.from('pnw_posts').select('likes_count').eq('id', post_id).single()
        if (post) {
          await admin.from('pnw_posts').update({ likes_count: (post.likes_count || 0) + 1 }).eq('id', post_id)
        }
        return NextResponse.json({ liked: true })
      }
    }

    // Public posts feed
    const admin = getSupabaseAdmin()
    let query = admin
      .from('pnw_posts')
      .select(`
        *,
        author:user_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(50)

    if (post_type) query = query.eq('post_type', post_type)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ posts: data || [], count: (data || []).length })
  } catch (err) {
    console.error('Posts GET error:', err)
    return NextResponse.json({ posts: [], count: 0, error: 'Failed to fetch posts' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getSupabaseAdmin()

    // Handle like toggle via POST
    if (action === 'like') {
      const body = await req.json()
      const { post_id } = body
      if (!post_id) return NextResponse.json({ error: 'Missing post_id' }, { status: 400 })

      // Check if like already exists
      const { data: existing } = await admin
        .from('pnw_post_likes')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('post_id', post_id)
        .single()

      if (existing) {
        // Unlike
        await admin.from('pnw_post_likes').delete().eq('user_id', user.id).eq('post_id', post_id)
        const { data: post } = await admin.from('pnw_posts').select('likes_count').eq('id', post_id).single()
        if (post) {
          await admin.from('pnw_posts').update({ likes_count: Math.max(0, (post.likes_count || 0) - 1) }).eq('id', post_id)
        }
        return NextResponse.json({ liked: false })
      } else {
        // Like
        await admin.from('pnw_post_likes').insert({ user_id: user.id, post_id })
        const { data: post } = await admin.from('pnw_posts').select('likes_count').eq('id', post_id).single()
        if (post) {
          await admin.from('pnw_posts').update({ likes_count: (post.likes_count || 0) + 1 }).eq('id', post_id)
        }
        return NextResponse.json({ liked: true })
      }
    }

    // Create new post
    const body = await req.json()
    const { post_type, content, photos, lat, lng, trip_id, catch_id, is_public } = body

    const { data, error } = await admin
      .from('pnw_posts')
      .insert({
        user_id: user.id,
        post_type: post_type || 'trip',
        content: content || null,
        photos: photos || [],
        lat: lat || null,
        lng: lng || null,
        trip_id: trip_id || null,
        catch_id: catch_id || null,
        is_public: is_public !== false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ post: data })
  } catch (err) {
    console.error('Posts POST error:', err)
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { id, content, is_public } = body
    if (!id) return NextResponse.json({ error: 'Missing post id' }, { status: 400 })

    const clean: Record<string, any> = {}
    if (content !== undefined) clean.content = content
    if (is_public !== undefined) clean.is_public = is_public

    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('pnw_posts')
      .update(clean)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ post: data })
  } catch (err) {
    console.error('Posts PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const admin = getSupabaseAdmin()
    const { error } = await admin
      .from('pnw_posts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Posts DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
  }
}
