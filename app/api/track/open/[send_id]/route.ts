import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

export async function GET(
  _req: NextRequest,
  { params }: { params: { send_id: string } }
) {
  try {
    const supabase = createClient()
    await supabase
      .from('sequence_step_sends')
      .update({ opened_at: new Date().toISOString() })
      .eq('id', params.send_id)
      .is('opened_at', null)
  } catch {
    // silent — never block the pixel response
  }

  return new NextResponse(PIXEL, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      Pragma: 'no-cache',
    },
  })
}
