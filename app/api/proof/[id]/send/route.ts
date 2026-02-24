import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || ''
const GMAIL_USER = process.env.GMAIL_USER || ''

async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  if (!SENDGRID_API_KEY || SENDGRID_API_KEY.startsWith('PLACEHOLDER')) {
    console.log('[PROOF EMAIL] Not configured, logging:', { to, subject })
    return true
  }
  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: GMAIL_USER || 'hello@usawrapco.com', name: 'USA Wrap Co' },
        subject,
        content: [{ type: 'text/html', value: body }],
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { customer_email } = await req.json()
  if (!customer_email) {
    return NextResponse.json({ error: 'customer_email required' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  // Get proof
  const { data: proof, error } = await admin
    .from('design_proofs')
    .select('*, project:projects(title, vehicle_desc)')
    .eq('id', params.id)
    .single()

  if (error || !proof) {
    return NextResponse.json({ error: 'Proof not found' }, { status: 404 })
  }

  // Update sent_at
  await admin
    .from('design_proofs')
    .update({ sent_at: new Date().toISOString(), sent_by: user.id, status: 'sent' })
    .eq('id', proof.id)

  // Build proof link
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://usawrapco.com'
  const proofLink = `${baseUrl}/proof/${proof.public_token}`
  const projectTitle = proof.project?.title || 'Your Vehicle'

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0d0f14;color:#e8eaed;padding:32px;border-radius:12px;">
      <h2 style="color:#4f7fff;margin:0 0 16px;">Your Design Proof is Ready</h2>
      <p style="color:#9299b5;font-size:14px;">Hi there! Your design proof for <strong style="color:#e8eaed;">${projectTitle}</strong> (Version ${proof.version_number}) is ready for review.</p>
      ${proof.note_to_customer ? `<p style="color:#9299b5;font-size:14px;background:#1a1d27;padding:12px;border-radius:8px;border-left:3px solid #4f7fff;">${proof.note_to_customer}</p>` : ''}
      <p style="color:#9299b5;font-size:14px;">You can annotate directly on the design — draw, add arrows, text, and more — then approve or request changes.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${proofLink}" style="display:inline-block;padding:14px 32px;background:#4f7fff;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">Review Your Proof</a>
      </div>
      <p style="color:#5a6080;font-size:12px;text-align:center;">USA Wrap Co</p>
    </div>
  `

  const sent = await sendEmail(customer_email, `Design Proof Ready — ${projectTitle}`, html)

  return NextResponse.json({ success: sent, proof_link: proofLink })
}
