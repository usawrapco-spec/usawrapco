import { generatePdf } from '../_shared'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  const data = await req.json()
  return generatePdf('gen_invoice.py', data, `invoice-${data.ref ?? 'draft'}.pdf`)
}
