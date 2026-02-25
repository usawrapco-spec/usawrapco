// ── Communication Hub Types ─────────────────────────────────────

export interface Conversation {
  id: string
  org_id: string
  customer_id: string | null
  project_id: string | null
  contact_name: string
  contact_email: string | null
  contact_phone: string | null
  status: string
  assigned_to: string | null
  unread_count: number
  last_message_at: string | null
  last_message_preview: string | null
  last_message_channel: string | null
  tags: string[] | null
  created_at: string
}

export interface ConversationMessage {
  id: string
  org_id: string | null
  conversation_id: string
  channel: 'email' | 'sms' | 'note'
  direction: 'inbound' | 'outbound' | 'internal'
  sent_by: string | null
  sent_by_name: string | null
  subject: string | null
  body: string
  body_html: string | null
  attachments: any[] | null
  email_log_id: string | null
  sendgrid_message_id: string | null
  twilio_sid: string | null
  status: string
  opened_at: string | null
  open_count: number
  clicked_at: string | null
  read_by: string[] | null
  created_at: string
}

export interface EmailTemplate {
  id: string
  org_id: string
  name: string
  email_type: string
  subject: string
  body_html: string
}

export interface PhotoSelection {
  job_image_id: string
  image_url: string
  caption: string
  file_name?: string
}

export function relativeTime(dateStr: string | null): string {
  if (!dateStr) return ''
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
