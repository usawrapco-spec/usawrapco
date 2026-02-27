import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  req: NextRequest,
  { params }: { params: { send_id: string } }
) {
  const destination = req.nextUrl.searchParams.get('url') || 'https://usawrapco.com'

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
