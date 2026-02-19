import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ORG_ID = 'd34a6c47-1ac0-4008-87d2-0f7741eebc4f'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code  = searchParams.get('code')
  const next  = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && user) {
      // Upsert profile so new Google users get one automatically
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!existing) {
        await supabase.from('profiles').insert({
          id:      user.id,
          org_id:  ORG_ID,
          role:    'sales',            // default role — admin can change
          name:    user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          email:   user.email || '',
          phone:   null,
          active:  true,
          permissions: {},
        })
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Could not sign in`)
}
