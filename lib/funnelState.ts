// Funnel state persisted to sessionStorage
export interface FunnelState {
  projectType?: string   // vehicle | fleet | trailer | boat | other
  purpose?: string       // business | personal
  vehicleMake?: string
  vehicleYear?: number
  vehicleModel?: string
  vehicleVin?: string
  coverageType?: string
  addons?: string[]
  totalPrice?: number
  vehicleSize?: string
  // contact info
  fullName?: string
  email?: string
  phone?: string
  businessName?: string
  referralSource?: string
  logoUrl?: string
  logoIsCrisp?: boolean
  designNotes?: string
  // post-submit
  leadId?: string
}

const KEY = 'usawrapco_funnel'

export function getFunnel(): FunnelState {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || '{}')
  } catch {
    return {}
  }
}

export function setFunnel(updates: Partial<FunnelState>) {
  if (typeof window === 'undefined') return
  const current = getFunnel()
  sessionStorage.setItem(KEY, JSON.stringify({ ...current, ...updates }))
}

export function clearFunnel() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(KEY)
}
