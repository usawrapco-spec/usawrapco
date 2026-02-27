import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_HOSTS = ['usawrapco.com', 'www.usawrapco.com', 'app.usawrapco.com']

function safeRedirect(raw: string | null): string {
  if (!raw) return 'https://usawrapco.com'
  try {
    const url = new URL(raw)
    if (url.protocol === 'https:' && ALLOWED_HOSTS.includes(url.hostname)) return url.href
  } catch { /* invalid URL */ }
  return 'https://usawrapco.com'
}

export async function GET(
  req: NextRequest,
  { params }: { params: { send_id: string } }
) {
  const destination = safeRedirect(req.nextUrl.searchParams.get('url'))

  try {
    const supabase = createClient()
    await supabase
      .from('sequence_step_sends')
      .update({ clicked_at: new Date().toISOString() })
      .eq('id', params.send_id)
      .is('clicked_at', null)
  } catch {
    // silent
  }

  return NextResponse.redirect(destination)
}
