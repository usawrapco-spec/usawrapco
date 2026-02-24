// ─── Proposal Types & Helpers ────────────────────────────────────────────────

export type ProposalStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'expired'

export interface Proposal {
  id: string
  estimate_id: string
  org_id: string
  title: string
  message: string | null
  expiration_date: string | null
  status: ProposalStatus
  sent_at: string | null
  viewed_at: string | null
  accepted_at: string | null
  accepted_package_id: string | null
  customer_signature: string | null
  public_token: string
  deposit_amount: number
  created_at: string
  updated_at: string
}

export interface ProposalPackage {
  id: string
  proposal_id: string
  name: string
  badge: string | null
  description: string | null
  price: number
  includes: string[]
  photos: string[]
  video_url: string | null
  sort_order: number
  created_at: string
}

export interface ProposalUpsell {
  id: string
  proposal_id: string
  name: string
  description: string | null
  price: number
  photo_url: string | null
  badge: string | null
  sort_order: number
}

export interface ProposalSelection {
  id: string
  proposal_id: string
  package_id: string
  upsell_ids: string[]
  total_amount: number
  deposit_amount: number
  stripe_payment_intent_id: string | null
  deposit_paid_at: string | null
  scheduled_date: string | null
  customer_notes: string | null
  created_at: string
}

// Default deposit amount
export const DEFAULT_DEPOSIT = 250

// Common upsells presets
export const COMMON_UPSELLS = [
  { name: 'Ceramic Coating', description: 'Professional-grade ceramic coating for long-lasting protection and shine.', price: 499, badge: 'Recommended' },
  { name: 'Window Tint', description: 'Premium ceramic window tint for UV protection and privacy.', price: 299, badge: null },
  { name: 'PPF High-Impact', description: 'Paint protection film on hood, fenders, and mirrors for rock chip defense.', price: 799, badge: null },
  { name: 'Maintenance Plan', description: 'Annual maintenance plan includes 2 hand washes and inspection per year.', price: 149, badge: 'Best Value' },
]

export const BADGE_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'Most Popular', label: 'Most Popular' },
  { value: 'Best Value', label: 'Best Value' },
  { value: 'Recommended', label: 'Recommended' },
  { value: 'Premium', label: 'Premium' },
]

export const PROPOSAL_STATUS_CONFIG: Record<ProposalStatus, { label: string; color: string; bg: string }> = {
  draft:    { label: 'Draft',    color: '#5a6080', bg: 'rgba(90,96,128,0.18)' },
  sent:     { label: 'Sent',     color: '#f59e0b', bg: 'rgba(245,158,11,0.18)' },
  viewed:   { label: 'Viewed',   color: '#4f7fff', bg: 'rgba(79,127,255,0.18)' },
  accepted: { label: 'Accepted', color: '#22c07a', bg: 'rgba(34,192,122,0.18)' },
  expired:  { label: 'Expired',  color: '#f25a5a', bg: 'rgba(242,90,90,0.18)' },
}
