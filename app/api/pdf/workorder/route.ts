import { generatePdf } from '../_shared'

export const maxDuration = 60
export const runtime = 'nodejs'

export async function POST(req: Request) {
  const raw = await req.json()

  // Normalize frontend field names to what gen_workorder.py expects
  const data = {
    ref:          raw.ref ?? '',
    so_ref:       raw.so_ref ?? '',
    date:         raw.date ?? new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    status:       raw.status ?? 'READY TO INSTALL',
    priority:     raw.priority ?? 'NORMAL',
    // Vehicle — accept both camelCase (old) and snake_case (new)
    year:         raw.year  ?? raw.vehicleYear  ?? '',
    make:         raw.make  ?? raw.vehicleMake  ?? '',
    model:        raw.model ?? raw.vehicleModel ?? '',
    color:        raw.color ?? '',
    vin:          raw.vin   ?? '',
    plate:        raw.plate ?? '',
    mileage:      raw.mileage ?? '',
    // Client — accept both 'customer' string (old) and structured fields (new)
    client_name:    raw.client_name    ?? raw.customer ?? '',
    client_contact: raw.client_contact ?? '',
    client_phone:   raw.client_phone   ?? raw.customer_phone ?? '',
    drop_off:       raw.drop_off ?? '',
    pick_up:        raw.pick_up  ?? '',
    // Wrap scope
    scope:          raw.scope    ?? raw.title ?? '',
    material:       raw.material ?? '',
    sqft:           raw.sqft     ?? '',
    linear_ft:      raw.linear_ft ?? '',
    panels:         raw.panels   ?? [],
    special_notes:  raw.special_notes ?? raw.notes ?? '',
    // Installer
    installer:      raw.installer     ?? '',
    bay:            raw.bay           ?? '',
    est_hours:      raw.est_hours     ?? '',
    installer_pay:  raw.installer_pay ?? '',
    pay_type:       raw.pay_type      ?? 'Flat Rate',
    // Checklists
    pre_checks:     raw.pre_checks  ?? [],
    post_checks:    raw.post_checks ?? [],
  }

  return generatePdf('gen_workorder.py', data, `workorder-${data.ref || 'draft'}.pdf`)
}
