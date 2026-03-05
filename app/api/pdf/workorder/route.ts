import { generatePdf } from '../_shared'

export const maxDuration = 60
export const runtime = 'nodejs'

export async function POST(req: Request) {
  const data = await req.json()
  return generatePdf('gen_workorder.py', data, `workorder-${data.ref ?? 'draft'}.pdf`)
}
