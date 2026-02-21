'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import {
  Search,
  Mail,
  Phone,
  PhoneCall,
  MessageSquare,
  StickyNote,
  Send,
  Paperclip,
  ChevronDown,
  ChevronRight,
  Bot,
  Clock,
  Circle,
  ArrowLeft,
  Sparkles,
  X,
  MoreHorizontal,
  User,
  Building2,
  ExternalLink,
  Filter,
  Inbox,
  PhoneIncoming,
  PhoneOutgoing,
} from 'lucide-react'

/* ─── Types ──────────────────────────────────────────────────────────── */

type ChannelType = 'sms' | 'email' | 'call' | 'note' | 'ai_bot'
type MessageDirection = 'inbound' | 'outbound' | 'internal'

interface Communication {
  id: string
  customer_id: string
  channel: ChannelType
  direction: MessageDirection
  content: string
  subject?: string
  from_address?: string
  to_address?: string
  call_duration?: number
  call_notes?: string
  read: boolean
  created_at: string
  sent_by?: string
}

interface DemoCustomer {
  id: string
  contact_name: string
  company_name?: string
  email?: string
  phone?: string
  status?: string
  avatar_initial: string
  avatar_color: string
}

interface DemoMessage {
  id: string
  customer_id: string
  channel: ChannelType
  direction: MessageDirection
  content: string
  subject?: string
  call_duration?: number
  call_notes?: string
  read: boolean
  created_at: string
  sent_by?: string
}

/* ─── Demo Data ──────────────────────────────────────────────────────── */

const DEMO_CUSTOMERS: DemoCustomer[] = [
  {
    id: 'demo-1',
    contact_name: 'Bob Smith',
    company_name: "Bob's Pizza",
    email: 'bob@bobspizza.com',
    phone: '(555) 234-5678',
    status: 'active',
    avatar_initial: 'B',
    avatar_color: '#4f7fff',
  },
  {
    id: 'demo-2',
    contact_name: 'Alice Park',
    company_name: 'Park Dental',
    email: 'alice@parkdental.com',
    phone: '(555) 345-6789',
    status: 'active',
    avatar_initial: 'A',
    avatar_color: '#8b5cf6',
  },
  {
    id: 'demo-3',
    contact_name: 'Jake Torres',
    company_name: 'Torres Roofing',
    email: 'jake@torresroofing.com',
    phone: '(555) 456-7890',
    status: 'active',
    avatar_initial: 'J',
    avatar_color: '#22c07a',
  },
  {
    id: 'demo-4',
    contact_name: 'Sarah Chen',
    company_name: undefined,
    email: 'sarah.chen@gmail.com',
    phone: '(555) 567-8901',
    status: 'active',
    avatar_initial: 'S',
    avatar_color: '#f59e0b',
  },
  {
    id: 'demo-5',
    contact_name: 'Mike Johnson',
    company_name: 'Quick Move',
    email: 'mike@quickmove.com',
    phone: '(555) 678-9012',
    status: 'active',
    avatar_initial: 'M',
    avatar_color: '#22d3ee',
  },
  {
    id: 'demo-6',
    contact_name: 'Lisa Wang',
    company_name: undefined,
    email: 'lisa.wang@outlook.com',
    phone: '(555) 789-0123',
    status: 'lead',
    avatar_initial: 'L',
    avatar_color: '#f25a5a',
  },
]

function demoTimestamp(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString()
}

const DEMO_MESSAGES: DemoMessage[] = [
  // Bob Smith - SMS thread about proof approval + AI bot
  {
    id: 'dm-1a', customer_id: 'demo-1', channel: 'sms', direction: 'inbound',
    content: 'Hey, just checking on the proof for our delivery van. When can I expect it?',
    read: true, created_at: demoTimestamp(4320), // 3 days ago
  },
  {
    id: 'dm-1b', customer_id: 'demo-1', channel: 'sms', direction: 'outbound',
    content: 'Hi Bob! The designer is finishing up the final revision today. Should have it in your inbox by end of day.',
    read: true, created_at: demoTimestamp(4260), sent_by: 'agent',
  },
  {
    id: 'dm-1c', customer_id: 'demo-1', channel: 'ai_bot', direction: 'outbound',
    content: 'Hi Bob, this is an automated update: your proof for the Pizza delivery van wrap (Job #1042) has been uploaded. Please review and approve at your earliest convenience.',
    read: true, created_at: demoTimestamp(2880), sent_by: 'ai_bot',
  },
  {
    id: 'dm-1d', customer_id: 'demo-1', channel: 'sms', direction: 'inbound',
    content: 'Got it! The design looks amazing. Love the pepperoni pattern on the sides. One small thing - can you make the phone number bigger on the back?',
    read: true, created_at: demoTimestamp(2820),
  },
  {
    id: 'dm-1e', customer_id: 'demo-1', channel: 'sms', direction: 'outbound',
    content: 'Absolutely! I\'ll have the designer bump up the phone number size. Will send a revised proof within the hour.',
    read: true, created_at: demoTimestamp(2790), sent_by: 'agent',
  },
  {
    id: 'dm-1f', customer_id: 'demo-1', channel: 'sms', direction: 'inbound',
    content: 'Perfect, approved! When\'s the install date looking like?',
    read: true, created_at: demoTimestamp(1440),
  },
  {
    id: 'dm-1g', customer_id: 'demo-1', channel: 'sms', direction: 'outbound',
    content: 'We have an opening next Thursday at 8am. Install should take about 6 hours. Does that work?',
    read: true, created_at: demoTimestamp(1380), sent_by: 'agent',
  },
  {
    id: 'dm-1h', customer_id: 'demo-1', channel: 'sms', direction: 'inbound',
    content: 'Thursday works great. See you then!',
    read: false, created_at: demoTimestamp(2),
  },

  // Alice Park - Email thread about fleet pricing
  {
    id: 'dm-2a', customer_id: 'demo-2', channel: 'email', direction: 'inbound',
    content: 'Hi, we\'re interested in wrapping our fleet of 5 dental vans. Could you provide fleet pricing? We\'d like full wraps with our new branding on all vehicles.',
    subject: 'Fleet Wrap Pricing Inquiry', read: true, created_at: demoTimestamp(10080),
  },
  {
    id: 'dm-2b', customer_id: 'demo-2', channel: 'email', direction: 'outbound',
    content: 'Hi Alice, thanks for reaching out! We\'d love to help with your fleet. For 5+ vehicles we offer a 15% fleet discount. For full wraps on standard vans, we\'re looking at approximately $3,200 per vehicle after the discount. This includes design, print, laminate, and professional installation. Would you like to schedule a consultation?',
    subject: 'Re: Fleet Wrap Pricing Inquiry', read: true, created_at: demoTimestamp(9960), sent_by: 'agent',
  },
  {
    id: 'dm-2c', customer_id: 'demo-2', channel: 'email', direction: 'inbound',
    content: 'That sounds great. Can we do 3 vehicles first as a trial? If we\'re happy we\'ll do the remaining 2 plus our office window graphics.',
    subject: 'Re: Fleet Wrap Pricing Inquiry', read: true, created_at: demoTimestamp(7200),
  },
  {
    id: 'dm-2d', customer_id: 'demo-2', channel: 'email', direction: 'outbound',
    content: 'Absolutely! I\'ll put together a formal estimate for 3 vehicles. We can still honor a 10% fleet discount for the initial batch. I\'ll include window graphics pricing as a separate line item. Sending the estimate over now.',
    subject: 'Re: Fleet Wrap Pricing Inquiry', read: true, created_at: demoTimestamp(7140), sent_by: 'agent',
  },
  {
    id: 'dm-2e', customer_id: 'demo-2', channel: 'email', direction: 'inbound',
    content: 'Estimate received and approved. Let\'s get started. When do you need the vehicles?',
    subject: 'Re: Fleet Wrap Pricing Inquiry', read: false, created_at: demoTimestamp(120),
  },

  // Jake Torres - Call log + follow-up SMS
  {
    id: 'dm-3a', customer_id: 'demo-3', channel: 'call', direction: 'inbound',
    content: 'Incoming call from Jake Torres',
    call_duration: 480, call_notes: 'Jake called about wrapping 2 work trucks. Discussed full wrap vs partial. He wants logos on doors + tailgate. Sending quote by EOD.',
    read: true, created_at: demoTimestamp(2880),
  },
  {
    id: 'dm-3b', customer_id: 'demo-3', channel: 'sms', direction: 'outbound',
    content: 'Hey Jake, great talking with you! As discussed, I\'m putting together pricing for door and tailgate graphics on both F-150s. Will have the estimate to you by 5pm today.',
    read: true, created_at: demoTimestamp(2820), sent_by: 'agent',
  },
  {
    id: 'dm-3c', customer_id: 'demo-3', channel: 'sms', direction: 'inbound',
    content: 'Sounds good, thanks! Also wanted to ask - do you guys do hard hats or safety vests? Would be cool to have matching branding.',
    read: true, created_at: demoTimestamp(2760),
  },
  {
    id: 'dm-3d', customer_id: 'demo-3', channel: 'sms', direction: 'outbound',
    content: 'We don\'t do apparel directly, but we can definitely do decals for hard hats! I\'ll add that to the quote. For vests, I can refer you to our partner print shop.',
    read: true, created_at: demoTimestamp(2700), sent_by: 'agent',
  },
  {
    id: 'dm-3e', customer_id: 'demo-3', channel: 'call', direction: 'outbound',
    content: 'Outgoing call to Jake Torres',
    call_duration: 195, call_notes: 'Called Jake to follow up on estimate. He\'s reviewing with his business partner. Will decide by Friday.',
    read: true, created_at: demoTimestamp(1440),
  },
  {
    id: 'dm-3f', customer_id: 'demo-3', channel: 'sms', direction: 'inbound',
    content: 'We\'re in! Partner approved the quote. Let\'s schedule.',
    read: false, created_at: demoTimestamp(45),
  },

  // Sarah Chen - SMS about PPF appointment
  {
    id: 'dm-4a', customer_id: 'demo-4', channel: 'sms', direction: 'inbound',
    content: 'Hi, I was referred by a friend. I have a new Tesla Model 3 and want PPF on the front end. Do you have availability this month?',
    read: true, created_at: demoTimestamp(4320),
  },
  {
    id: 'dm-4b', customer_id: 'demo-4', channel: 'sms', direction: 'outbound',
    content: 'Hi Sarah! Welcome, and thanks for the referral. We\'d love to protect your Tesla. For a Model 3 full front PPF (bumper, hood, fenders, mirrors) we\'re at $1,850. We have openings next Tuesday and Wednesday. Which works better?',
    read: true, created_at: demoTimestamp(4260), sent_by: 'agent',
  },
  {
    id: 'dm-4c', customer_id: 'demo-4', channel: 'sms', direction: 'inbound',
    content: 'Tuesday works! What time should I drop it off? And how long does it take?',
    read: true, created_at: demoTimestamp(4200),
  },
  {
    id: 'dm-4d', customer_id: 'demo-4', channel: 'sms', direction: 'outbound',
    content: 'Drop off anytime between 8-9am Tuesday. PPF install takes about 4-5 hours. We\'ll text you when it\'s ready for pickup. Please make sure the car is freshly washed if possible!',
    read: true, created_at: demoTimestamp(4140), sent_by: 'agent',
  },
  {
    id: 'dm-4e', customer_id: 'demo-4', channel: 'sms', direction: 'inbound',
    content: 'Can I also add the headlights and door edge guards? What would that cost extra?',
    read: false, created_at: demoTimestamp(180),
  },

  // Mike Johnson - Mixed SMS/email about box truck wraps
  {
    id: 'dm-5a', customer_id: 'demo-5', channel: 'email', direction: 'inbound',
    content: 'We have 3 box trucks (26ft) that need full wraps. Currently have an old design that needs to be removed first. Can you handle removal + new wraps? Timeline is important - we need all 3 done within 2 weeks.',
    subject: 'Box Truck Fleet Wraps - Urgent', read: true, created_at: demoTimestamp(5760),
  },
  {
    id: 'dm-5b', customer_id: 'demo-5', channel: 'email', direction: 'outbound',
    content: 'Hi Mike, we absolutely handle removal + re-wraps. For 26ft box trucks, full wraps run $4,500-5,200 each depending on complexity. Removal is $800 per truck. We can stagger the schedule to keep your fleet running: truck 1 in on Monday, truck 2 on Wednesday, truck 3 the following Monday. Each takes about 3 days. Sound good?',
    subject: 'Re: Box Truck Fleet Wraps - Urgent', read: true, created_at: demoTimestamp(5700), sent_by: 'agent',
  },
  {
    id: 'dm-5c', customer_id: 'demo-5', channel: 'sms', direction: 'inbound',
    content: 'Hey, just saw the email. That schedule works perfectly. Do you need our brand guidelines or can you work from our website?',
    read: true, created_at: demoTimestamp(5640),
  },
  {
    id: 'dm-5d', customer_id: 'demo-5', channel: 'sms', direction: 'outbound',
    content: 'If you have brand guidelines (logo files, color codes, fonts) that\'s ideal. Otherwise we can pull from your site. Can you email those over along with any specific layout preferences?',
    read: true, created_at: demoTimestamp(5580), sent_by: 'agent',
  },
  {
    id: 'dm-5e', customer_id: 'demo-5', channel: 'email', direction: 'inbound',
    content: 'Brand guide attached. Main colors are orange (#FF6B00) and dark gray (#333333). Logo should be on both sides and the back. Phone number and website prominent on both sides. Keep it clean and professional.',
    subject: 'Re: Box Truck Fleet Wraps - Urgent', read: true, created_at: demoTimestamp(5520),
  },
  {
    id: 'dm-5f', customer_id: 'demo-5', channel: 'sms', direction: 'outbound',
    content: 'Got the brand guide, thanks! Designer will have mockups ready by Thursday. Quick question - do you want the same design on all 3 trucks or different phone numbers per region?',
    read: true, created_at: demoTimestamp(5460), sent_by: 'agent',
  },
  {
    id: 'dm-5g', customer_id: 'demo-5', channel: 'sms', direction: 'inbound',
    content: 'Same design, same number on all 3. Keep it simple.',
    read: false, created_at: demoTimestamp(30),
  },

  // Lisa Wang - Note about referral from Bob
  {
    id: 'dm-6a', customer_id: 'demo-6', channel: 'note', direction: 'internal',
    content: 'Referral from Bob Smith (Bob\'s Pizza). Lisa is interested in a partial wrap for her personal Jeep Wrangler. She saw Bob\'s delivery van and loved the work. Bob should get referral credit.',
    read: true, created_at: demoTimestamp(1440), sent_by: 'agent',
  },
  {
    id: 'dm-6b', customer_id: 'demo-6', channel: 'sms', direction: 'outbound',
    content: 'Hi Lisa! Bob Smith mentioned you\'re interested in a Jeep wrap. We\'d love to help. Are you thinking full wrap or more of an accent/partial wrap? We have some great Wrangler templates to get you started.',
    read: true, created_at: demoTimestamp(1380), sent_by: 'agent',
  },
  {
    id: 'dm-6c', customer_id: 'demo-6', channel: 'sms', direction: 'inbound',
    content: 'Hi! Yes Bob\'s van looked incredible. I\'m thinking a matte black wrap with some custom graphics on the hood and rear quarter panels. Do you have a portfolio I can look at?',
    read: true, created_at: demoTimestamp(1320),
  },
  {
    id: 'dm-6d', customer_id: 'demo-6', channel: 'sms', direction: 'outbound',
    content: 'Thank you! Here\'s a link to our Jeep gallery: usawrapco.com/gallery/jeep. For a matte black full color change + custom graphics, you\'re looking at around $3,800-4,200. Want to come by for a free consultation?',
    read: true, created_at: demoTimestamp(1260), sent_by: 'agent',
  },
  {
    id: 'dm-6e', customer_id: 'demo-6', channel: 'note', direction: 'internal',
    content: 'Lisa confirmed consultation appointment for Saturday 10am. She\'ll bring the Jeep so we can assess the body condition and take measurements. Upsell opportunity: ceramic coating after wrap.',
    read: true, created_at: demoTimestamp(720), sent_by: 'agent',
  },
  {
    id: 'dm-6f', customer_id: 'demo-6', channel: 'sms', direction: 'inbound',
    content: 'See you Saturday at 10! Quick question - do you also do ceramic coating on top of wraps?',
    read: false, created_at: demoTimestamp(15),
  },
]

/* ─── AI Summaries ────────────────────────────────────────────────────── */

const AI_SUMMARIES: Record<string, { summary: string; actions: string[] }> = {
  'demo-1': {
    summary: 'Last contacted 2 minutes ago. Proof approved, install scheduled for Thursday. Customer is highly engaged and responsive via SMS.',
    actions: ['Send install confirmation reminder', 'Prepare vehicle drop-off instructions'],
  },
  'demo-2': {
    summary: 'Last contacted 2 hours ago. Fleet estimate approved for 3 vehicles. High-value opportunity with potential for 2 additional vehicles + window graphics.',
    actions: ['Send proof reminder', 'Schedule design consultation', 'Create sales order from estimate'],
  },
  'demo-3': {
    summary: 'Last contacted 45 minutes ago. Quote approved by customer and partner. Ready to schedule install for 2 F-150 truck graphics.',
    actions: ['Schedule install date', 'Send hard hat decal quote', 'Create sales order'],
  },
  'demo-4': {
    summary: 'Last contacted 3 hours ago. PPF appointment scheduled for Tuesday. Customer asking about add-ons (headlights + door edge guards).',
    actions: ['Send add-on pricing', 'Confirm Tuesday appointment', 'Send pre-appointment prep checklist'],
  },
  'demo-5': {
    summary: 'Last contacted 30 minutes ago. 3 box truck re-wraps in progress. Brand guide received, designer working on mockups. Time-sensitive project.',
    actions: ['Follow up on mockup progress', 'Confirm staggered schedule', 'Send mockups for approval'],
  },
  'demo-6': {
    summary: 'Last contacted 15 minutes ago. Referral from Bob Smith. Consultation scheduled Saturday 10am for Jeep Wrangler matte black wrap. Ceramic coating upsell opportunity.',
    actions: ['Credit Bob Smith referral', 'Prepare Jeep consultation materials', 'Send Saturday confirmation'],
  },
}

/* ─── Helpers ─────────────────────────────────────────────────────────── */

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()

  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

  if (isToday) return `Today ${time}`
  if (isYesterday) return `Yesterday ${time}`
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${time}`
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function channelIcon(ch: ChannelType, size = 14) {
  switch (ch) {
    case 'sms':    return <MessageSquare size={size} />
    case 'email':  return <Mail size={size} />
    case 'call':   return <PhoneCall size={size} />
    case 'note':   return <StickyNote size={size} />
    case 'ai_bot': return <Bot size={size} />
  }
}

function channelLabel(ch: ChannelType): string {
  switch (ch) {
    case 'sms':    return 'SMS'
    case 'email':  return 'Email'
    case 'call':   return 'Call'
    case 'note':   return 'Note'
    case 'ai_bot': return 'AI Bot'
  }
}

/* ─── Props ───────────────────────────────────────────────────────────── */

interface Props {
  profile: Profile
  customers: any[]
  communications: any[]
}

/* ─── Component ───────────────────────────────────────────────────────── */

export default function InboxClient({ profile, customers, communications }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const chatEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // State
  const [search, setSearch] = useState('')
  const [filterTab, setFilterTab] = useState<'all' | 'unread' | 'sms' | 'email' | 'calls'>('all')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [composeChannel, setComposeChannel] = useState<ChannelType>('sms')
  const [composeText, setComposeText] = useState('')
  const [showChannelDropdown, setShowChannelDropdown] = useState(false)
  const [showAiSummary, setShowAiSummary] = useState(true)
  const [mobileShowThread, setMobileShowThread] = useState(false)
  const [sending, setSending] = useState(false)

  // Use demo data if no real data available
  const useDemo = customers.length === 0 && communications.length === 0

  // Build conversation list
  const conversationCustomers = useMemo(() => {
    if (useDemo) return DEMO_CUSTOMERS
    return customers.map((c: any) => ({
      id: c.id,
      contact_name: c.contact_name || c.name || 'Unknown',
      company_name: c.company_name || c.company || undefined,
      email: c.email,
      phone: c.phone,
      status: c.status,
      avatar_initial: (c.contact_name || c.name || 'U').charAt(0).toUpperCase(),
      avatar_color: '#4f7fff',
    }))
  }, [customers, useDemo])

  // Messages for selected customer
  const allMessages = useMemo(() => {
    if (useDemo) return DEMO_MESSAGES
    return communications.map((c: any) => ({
      id: c.id,
      customer_id: c.customer_id,
      channel: c.channel || 'sms',
      direction: c.direction || 'inbound',
      content: c.content || c.body || '',
      subject: c.subject,
      call_duration: c.call_duration,
      call_notes: c.call_notes,
      read: c.read ?? true,
      created_at: c.created_at,
      sent_by: c.sent_by,
    }))
  }, [communications, useDemo])

  // Get messages grouped by customer
  const messagesByCustomer = useMemo(() => {
    const map = new Map<string, DemoMessage[]>()
    for (const msg of allMessages) {
      const existing = map.get(msg.customer_id) || []
      existing.push(msg)
      map.set(msg.customer_id, existing)
    }
    // Sort messages within each customer by date ascending
    for (const [key, msgs] of map) {
      map.set(key, msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()))
    }
    return map
  }, [allMessages])

  // Get last message + unread count for each customer
  const customerMeta = useMemo(() => {
    const meta = new Map<string, { lastMessage: DemoMessage; unreadCount: number; lastChannel: ChannelType }>()
    for (const [custId, msgs] of messagesByCustomer) {
      const lastMessage = msgs[msgs.length - 1]
      const unreadCount = msgs.filter(m => !m.read).length
      meta.set(custId, { lastMessage, unreadCount, lastChannel: lastMessage.channel })
    }
    return meta
  }, [messagesByCustomer])

  // Filter + search conversations
  const filteredCustomers = useMemo(() => {
    let list = [...conversationCustomers]

    // Search filter
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.contact_name.toLowerCase().includes(q) ||
        (c.company_name?.toLowerCase().includes(q)) ||
        (c.email?.toLowerCase().includes(q)) ||
        (c.phone?.includes(q))
      )
    }

    // Tab filters
    if (filterTab === 'unread') {
      list = list.filter(c => (customerMeta.get(c.id)?.unreadCount ?? 0) > 0)
    } else if (filterTab === 'sms') {
      list = list.filter(c => {
        const msgs = messagesByCustomer.get(c.id) || []
        return msgs.some(m => m.channel === 'sms')
      })
    } else if (filterTab === 'email') {
      list = list.filter(c => {
        const msgs = messagesByCustomer.get(c.id) || []
        return msgs.some(m => m.channel === 'email')
      })
    } else if (filterTab === 'calls') {
      list = list.filter(c => {
        const msgs = messagesByCustomer.get(c.id) || []
        return msgs.some(m => m.channel === 'call')
      })
    }

    // Sort by last message time (most recent first)
    list.sort((a, b) => {
      const aTime = customerMeta.get(a.id)?.lastMessage?.created_at || ''
      const bTime = customerMeta.get(b.id)?.lastMessage?.created_at || ''
      return new Date(bTime).getTime() - new Date(aTime).getTime()
    })

    return list
  }, [conversationCustomers, search, filterTab, customerMeta, messagesByCustomer])

  // Selected customer data
  const selectedCustomer = conversationCustomers.find(c => c.id === selectedCustomerId) || null
  const selectedMessages = selectedCustomerId ? (messagesByCustomer.get(selectedCustomerId) || []) : []
  const selectedSummary = selectedCustomerId ? AI_SUMMARIES[selectedCustomerId] : null

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [selectedMessages, selectedCustomerId])

  // Auto-resize textarea
  const handleTextareaInput = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [])

  function selectConversation(custId: string) {
    setSelectedCustomerId(custId)
    setMobileShowThread(true)
    setShowAiSummary(true)
  }

  function handleSend() {
    if (!composeText.trim() || !selectedCustomerId) return
    setSending(true)
    // In production this would hit an API route
    setTimeout(() => {
      setSending(false)
      setComposeText('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }, 300)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  /* ─── Styles ─────────────────────────────────────────────────────────── */

  const colors = {
    bg: '#0d0f14',
    surface: '#161920',
    surface2: '#1a1d27',
    border: '#1e2330',
    borderHover: '#2a3040',
    accent: '#4f7fff',
    green: '#22c07a',
    amber: '#f59e0b',
    red: '#f25a5a',
    purple: '#8b5cf6',
    cyan: '#22d3ee',
    text1: '#ffffff',
    text2: '#8b95a5',
    text3: '#505a6b',
    noteYellow: 'rgba(245,158,11,0.08)',
    noteBorder: 'rgba(245,158,11,0.2)',
    glass: 'rgba(22,25,32,0.8)',
  }

  const filterTabs: { key: typeof filterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'sms', label: 'SMS' },
    { key: 'email', label: 'Email' },
    { key: 'calls', label: 'Calls' },
  ]

  const channelOptions: { key: ChannelType; label: string; icon: JSX.Element }[] = [
    { key: 'sms', label: 'SMS', icon: <MessageSquare size={14} /> },
    { key: 'email', label: 'Email', icon: <Mail size={14} /> },
    { key: 'call', label: 'Call', icon: <PhoneCall size={14} /> },
    { key: 'note', label: 'Note', icon: <StickyNote size={14} /> },
  ]

  /* ─── Render ─────────────────────────────────────────────────────────── */

  return (
    <div style={{
      display: 'flex',
      height: '100%',
      background: colors.bg,
      fontFamily: '-apple-system, BlinkMacSystemFont, Inter, system-ui, sans-serif',
      fontSize: 14,
      color: colors.text1,
      overflow: 'hidden',
    }}>

      {/* ──── LEFT PANEL: Conversation List ──────────────────────────── */}
      <div style={{
        width: 340,
        minWidth: 340,
        borderRight: `1px solid ${colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        background: colors.surface,
        transition: 'transform 200ms ease',
        ...(mobileShowThread ? {
          position: 'absolute' as const,
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 10,
          transform: 'translateX(-100%)',
        } : {}),
      }}
      className="inbox-left-panel"
      >
        {/* Header */}
        <div style={{
          padding: '16px 16px 12px',
          borderBottom: `1px solid ${colors.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h1 style={{
              fontSize: 20,
              fontWeight: 800,
              fontFamily: 'Barlow Condensed, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: colors.text1,
              margin: 0,
            }}>
              <Inbox size={18} style={{ marginRight: 8, verticalAlign: 'middle', opacity: 0.7 }} />
              Inbox
            </h1>
            <span style={{
              fontSize: 11,
              fontFamily: 'JetBrains Mono, monospace',
              color: colors.text3,
              padding: '2px 8px',
              borderRadius: 6,
              background: `${colors.accent}15`,
              border: `1px solid ${colors.accent}30`,
            }}>
              {filteredCustomers.length}
            </span>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <Search size={14} style={{
              position: 'absolute', left: 10, top: '50%',
              transform: 'translateY(-50%)', color: colors.text3,
              pointerEvents: 'none',
            }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 32px',
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                color: colors.text1,
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 200ms',
              }}
              onFocus={e => e.currentTarget.style.borderColor = colors.accent}
              onBlur={e => e.currentTarget.style.borderColor = colors.border}
            />
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: 4 }}>
            {filterTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilterTab(tab.key)}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: 'Barlow Condensed, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  transition: 'all 200ms',
                  background: filterTab === tab.key ? `${colors.accent}20` : 'transparent',
                  color: filterTab === tab.key ? colors.accent : colors.text3,
                  minHeight: 30,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredCustomers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Search size={32} style={{ color: colors.text3, opacity: 0.3, marginBottom: 8 }} />
              <div style={{ color: colors.text3, fontSize: 13 }}>No conversations found</div>
            </div>
          ) : (
            filteredCustomers.map(cust => {
              const meta = customerMeta.get(cust.id)
              const isActive = selectedCustomerId === cust.id
              const hasUnread = (meta?.unreadCount ?? 0) > 0

              return (
                <div
                  key={cust.id}
                  onClick={() => selectConversation(cust.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '12px 16px',
                    cursor: 'pointer',
                    transition: 'all 200ms',
                    borderLeft: isActive ? `3px solid ${colors.accent}` : '3px solid transparent',
                    background: isActive ? `${colors.accent}08` : 'transparent',
                    borderBottom: `1px solid ${colors.border}`,
                    minHeight: 44,
                  }}
                  onMouseEnter={e => {
                    if (!isActive) e.currentTarget.style.background = `${colors.bg}`
                  }}
                  onMouseLeave={e => {
                    if (!isActive) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 36,
                    height: 36,
                    minWidth: 36,
                    borderRadius: '50%',
                    background: `${cust.avatar_color}20`,
                    color: cust.avatar_color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: 'Barlow Condensed, sans-serif',
                  }}>
                    {cust.avatar_initial}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{
                        fontWeight: hasUnread ? 700 : 500,
                        fontSize: 13,
                        color: colors.text1,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: 160,
                      }}>
                        {cust.contact_name}
                      </span>
                      <span style={{
                        fontSize: 10,
                        fontFamily: 'JetBrains Mono, monospace',
                        color: hasUnread ? colors.accent : colors.text3,
                        whiteSpace: 'nowrap',
                        marginLeft: 4,
                      }}>
                        {meta?.lastMessage ? relativeTime(meta.lastMessage.created_at) : ''}
                      </span>
                    </div>

                    {cust.company_name && (
                      <div style={{
                        fontSize: 11,
                        color: colors.text2,
                        marginBottom: 3,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {cust.company_name}
                      </div>
                    )}

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}>
                      {/* Channel icon */}
                      <span style={{ color: colors.text3, display: 'flex', flexShrink: 0 }}>
                        {meta?.lastChannel ? channelIcon(meta.lastChannel, 12) : null}
                      </span>
                      {/* Preview */}
                      <span style={{
                        fontSize: 12,
                        color: hasUnread ? colors.text2 : colors.text3,
                        fontWeight: hasUnread ? 500 : 400,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flex: 1,
                      }}>
                        {meta?.lastMessage?.channel === 'call'
                          ? (meta.lastMessage.direction === 'inbound' ? 'Incoming call' : 'Outgoing call')
                          : (meta?.lastMessage?.content || 'No messages')
                        }
                      </span>
                      {/* Unread dot */}
                      {hasUnread && (
                        <span style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: colors.green,
                          flexShrink: 0,
                        }} />
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ──── RIGHT PANEL: Chat Thread ───────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: colors.bg,
        overflow: 'hidden',
        transition: 'transform 200ms ease',
      }}
      className="inbox-right-panel"
      >
        {!selectedCustomer ? (
          /* Empty state */
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}>
            <Inbox size={48} style={{ color: colors.text3, opacity: 0.2 }} />
            <div style={{ color: colors.text3, fontSize: 15, fontWeight: 500 }}>Select a conversation</div>
            <div style={{ color: colors.text3, fontSize: 12, opacity: 0.6 }}>
              Choose a customer from the left to view their messages
            </div>
          </div>
        ) : (
          <>
            {/* ── Thread Header ────────────────────────────────────── */}
            <div style={{
              padding: '12px 20px',
              borderBottom: `1px solid ${colors.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: colors.surface,
              minHeight: 44,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Mobile back button */}
                <button
                  onClick={() => { setMobileShowThread(false); setSelectedCustomerId(null) }}
                  className="inbox-mobile-back"
                  style={{
                    display: 'none',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    border: 'none',
                    background: 'transparent',
                    color: colors.text2,
                    cursor: 'pointer',
                    borderRadius: 6,
                    padding: 0,
                    minWidth: 44,
                    minHeight: 44,
                  }}
                >
                  <ArrowLeft size={18} />
                </button>

                {/* Avatar */}
                <div style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: `${selectedCustomer.avatar_color}20`,
                  color: selectedCustomer.avatar_color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: 'Barlow Condensed, sans-serif',
                }}>
                  {selectedCustomer.avatar_initial}
                </div>

                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{selectedCustomer.contact_name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: colors.text2 }}>
                    {selectedCustomer.company_name && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Building2 size={11} />
                        {selectedCustomer.company_name}
                      </span>
                    )}
                    {selectedCustomer.status && (
                      <span style={{
                        padding: '1px 6px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        background: selectedCustomer.status === 'active' ? `${colors.green}15` : `${colors.amber}15`,
                        color: selectedCustomer.status === 'active' ? colors.green : colors.amber,
                        border: `1px solid ${selectedCustomer.status === 'active' ? colors.green : colors.amber}30`,
                      }}>
                        {selectedCustomer.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {selectedCustomer.phone && (
                  <button
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 34, height: 34, borderRadius: 8,
                      border: `1px solid ${colors.border}`,
                      background: 'transparent', color: colors.text2,
                      cursor: 'pointer', transition: 'all 200ms',
                      minWidth: 44, minHeight: 44,
                    }}
                    title="Call"
                    onMouseEnter={e => { e.currentTarget.style.color = colors.green; e.currentTarget.style.borderColor = colors.green }}
                    onMouseLeave={e => { e.currentTarget.style.color = colors.text2; e.currentTarget.style.borderColor = colors.border }}
                  >
                    <Phone size={14} />
                  </button>
                )}
                {selectedCustomer.email && (
                  <button
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 34, height: 34, borderRadius: 8,
                      border: `1px solid ${colors.border}`,
                      background: 'transparent', color: colors.text2,
                      cursor: 'pointer', transition: 'all 200ms',
                      minWidth: 44, minHeight: 44,
                    }}
                    title="Email"
                    onMouseEnter={e => { e.currentTarget.style.color = colors.accent; e.currentTarget.style.borderColor = colors.accent }}
                    onMouseLeave={e => { e.currentTarget.style.color = colors.text2; e.currentTarget.style.borderColor = colors.border }}
                  >
                    <Mail size={14} />
                  </button>
                )}
                <button
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 34, height: 34, borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    background: 'transparent', color: colors.text2,
                    cursor: 'pointer', transition: 'all 200ms',
                    minWidth: 44, minHeight: 44,
                  }}
                  title="More actions"
                  onMouseEnter={e => { e.currentTarget.style.color = colors.text1; e.currentTarget.style.borderColor = colors.borderHover }}
                  onMouseLeave={e => { e.currentTarget.style.color = colors.text2; e.currentTarget.style.borderColor = colors.border }}
                >
                  <MoreHorizontal size={14} />
                </button>
              </div>
            </div>

            {/* ── Channel Action Bar ──────────────────────────────── */}
            <div style={{
              padding: '8px 20px',
              borderBottom: `1px solid ${colors.border}`,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: colors.surface,
            }}>
              {channelOptions.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setComposeChannel(opt.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 12px', borderRadius: 6,
                    border: `1px solid ${composeChannel === opt.key ? colors.accent : colors.border}`,
                    background: composeChannel === opt.key ? `${colors.accent}15` : 'transparent',
                    color: composeChannel === opt.key ? colors.accent : colors.text2,
                    fontSize: 12, fontWeight: 500,
                    cursor: 'pointer', transition: 'all 200ms',
                    minHeight: 30,
                  }}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>

            {/* ── AI Summary ──────────────────────────────────────── */}
            {selectedSummary && (
              <div style={{
                margin: '12px 20px 0',
                borderRadius: 10,
                border: `1px solid ${colors.purple}25`,
                background: `${colors.purple}08`,
                overflow: 'hidden',
                transition: 'all 200ms',
              }}>
                <button
                  onClick={() => setShowAiSummary(!showAiSummary)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 14px',
                    border: 'none',
                    background: 'transparent',
                    color: colors.purple,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: 'Barlow Condensed, sans-serif',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    minHeight: 36,
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={13} />
                    AI Summary
                  </span>
                  <ChevronDown size={14} style={{
                    transition: 'transform 200ms',
                    transform: showAiSummary ? 'rotate(0deg)' : 'rotate(-90deg)',
                  }} />
                </button>

                {showAiSummary && (
                  <div style={{ padding: '0 14px 10px' }}>
                    <p style={{
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: colors.text2,
                      margin: '0 0 8px',
                    }}>
                      {selectedSummary.summary}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {selectedSummary.actions.map((action, i) => (
                        <button
                          key={i}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            border: `1px solid ${colors.purple}30`,
                            background: `${colors.purple}10`,
                            color: colors.purple,
                            fontSize: 11,
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 200ms',
                            whiteSpace: 'nowrap',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = `${colors.purple}20`
                            e.currentTarget.style.borderColor = `${colors.purple}50`
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = `${colors.purple}10`
                            e.currentTarget.style.borderColor = `${colors.purple}30`
                          }}
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Message Timeline ────────────────────────────────── */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              {selectedMessages.map(msg => {
                const isOutbound = msg.direction === 'outbound'
                const isInternal = msg.direction === 'internal'
                const isNote = msg.channel === 'note'
                const isCall = msg.channel === 'call'
                const isBot = msg.channel === 'ai_bot'

                return (
                  <div key={msg.id} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isOutbound || isInternal ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    alignSelf: isOutbound || isInternal ? 'flex-end' : 'flex-start',
                  }}>
                    {/* Timestamp + type label */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      marginBottom: 3,
                      fontSize: 10,
                      color: colors.text3,
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        {channelIcon(msg.channel, 10)}
                        {channelLabel(msg.channel)}
                      </span>
                      {isBot && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 2,
                          padding: '0 4px',
                          borderRadius: 3,
                          background: `${colors.cyan}15`,
                          color: colors.cyan,
                          fontSize: 9,
                          fontWeight: 600,
                        }}>
                          <Bot size={8} /> BOT
                        </span>
                      )}
                      {isCall && msg.direction === 'inbound' && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: colors.green }}>
                          <PhoneIncoming size={9} /> Incoming
                        </span>
                      )}
                      {isCall && msg.direction === 'outbound' && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: colors.accent }}>
                          <PhoneOutgoing size={9} /> Outgoing
                        </span>
                      )}
                      <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {formatTimestamp(msg.created_at)}
                      </span>
                    </div>

                    {/* Message bubble */}
                    <div style={{
                      padding: isCall ? '10px 14px' : '8px 14px',
                      borderRadius: 10,
                      borderTopLeftRadius: !isOutbound && !isInternal ? 2 : 10,
                      borderTopRightRadius: isOutbound || isInternal ? 2 : 10,
                      fontSize: 13,
                      lineHeight: 1.5,
                      transition: 'all 200ms',
                      ...(isNote ? {
                        background: colors.noteYellow,
                        border: `1px solid ${colors.noteBorder}`,
                        color: colors.amber,
                      } : isCall ? {
                        background: colors.surface2,
                        border: `1px solid ${colors.border}`,
                        color: colors.text1,
                      } : isBot ? {
                        background: `${colors.cyan}10`,
                        border: `1px solid ${colors.cyan}20`,
                        color: colors.text1,
                      } : isOutbound ? {
                        background: `${colors.accent}18`,
                        border: `1px solid ${colors.accent}25`,
                        color: colors.text1,
                      } : {
                        background: colors.surface,
                        border: `1px solid ${colors.border}`,
                        color: colors.text1,
                      }),
                      maxWidth: '100%',
                      wordBreak: 'break-word' as const,
                    }}>
                      {/* Email subject */}
                      {msg.subject && (
                        <div style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: colors.text2,
                          marginBottom: 4,
                          paddingBottom: 4,
                          borderBottom: `1px solid ${colors.border}`,
                        }}>
                          {msg.subject}
                        </div>
                      )}

                      {/* Call-specific layout */}
                      {isCall ? (
                        <div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: msg.call_notes ? 6 : 0,
                          }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%',
                              background: msg.direction === 'inbound' ? `${colors.green}15` : `${colors.accent}15`,
                              color: msg.direction === 'inbound' ? colors.green : colors.accent,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {msg.direction === 'inbound' ? <PhoneIncoming size={14} /> : <PhoneOutgoing size={14} />}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500 }}>
                                {msg.direction === 'inbound' ? 'Incoming' : 'Outgoing'} Call
                              </div>
                              {msg.call_duration != null && (
                                <div style={{
                                  fontSize: 11,
                                  fontFamily: 'JetBrains Mono, monospace',
                                  color: colors.text2,
                                }}>
                                  Duration: {formatDuration(msg.call_duration)}
                                </div>
                              )}
                            </div>
                          </div>
                          {msg.call_notes && (
                            <div style={{
                              fontSize: 12,
                              color: colors.text2,
                              lineHeight: 1.5,
                              paddingTop: 6,
                              borderTop: `1px solid ${colors.border}`,
                            }}>
                              {msg.call_notes}
                            </div>
                          )}
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={chatEndRef} />
            </div>

            {/* ── Compose Area ────────────────────────────────────── */}
            <div style={{
              padding: '12px 20px',
              borderTop: `1px solid ${colors.border}`,
              background: colors.surface,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 8,
                background: colors.bg,
                borderRadius: 10,
                border: `1px solid ${colors.border}`,
                padding: '8px 12px',
                transition: 'border-color 200ms',
              }}
              onFocus={e => e.currentTarget.style.borderColor = colors.accent}
              onBlur={e => e.currentTarget.style.borderColor = colors.border}
              >
                {/* Attach */}
                <button
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, height: 32, borderRadius: 6,
                    border: 'none', background: 'transparent',
                    color: colors.text3, cursor: 'pointer',
                    transition: 'color 200ms',
                    flexShrink: 0,
                    minWidth: 44, minHeight: 44,
                    padding: 0,
                  }}
                  title="Attach file"
                  onMouseEnter={e => e.currentTarget.style.color = colors.text1}
                  onMouseLeave={e => e.currentTarget.style.color = colors.text3}
                >
                  <Paperclip size={16} />
                </button>

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={composeText}
                  onChange={e => { setComposeText(e.target.value); handleTextareaInput() }}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    composeChannel === 'note'
                      ? 'Add an internal note...'
                      : composeChannel === 'email'
                        ? 'Compose email...'
                        : `Type a ${channelLabel(composeChannel)} message...`
                  }
                  rows={1}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    color: colors.text1,
                    fontSize: 13,
                    lineHeight: 1.5,
                    resize: 'none',
                    outline: 'none',
                    maxHeight: 120,
                    minHeight: 20,
                    fontFamily: 'inherit',
                    padding: '6px 0',
                  }}
                />

                {/* Send as dropdown + Send button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  {/* Send As selector */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setShowChannelDropdown(!showChannelDropdown)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '4px 8px', borderRadius: 5,
                        border: `1px solid ${colors.border}`,
                        background: 'transparent',
                        color: colors.text2, fontSize: 11,
                        cursor: 'pointer', transition: 'all 200ms',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {channelIcon(composeChannel, 11)}
                      {channelLabel(composeChannel)}
                      <ChevronDown size={10} />
                    </button>

                    {showChannelDropdown && (
                      <div style={{
                        position: 'absolute',
                        bottom: '100%',
                        right: 0,
                        marginBottom: 4,
                        background: colors.glass,
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        border: `1px solid ${colors.border}`,
                        borderRadius: 8,
                        padding: 4,
                        zIndex: 50,
                        minWidth: 120,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                      }}>
                        {channelOptions.map(opt => (
                          <button
                            key={opt.key}
                            onClick={() => { setComposeChannel(opt.key); setShowChannelDropdown(false) }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              width: '100%',
                              padding: '6px 10px', borderRadius: 5,
                              border: 'none',
                              background: composeChannel === opt.key ? `${colors.accent}15` : 'transparent',
                              color: composeChannel === opt.key ? colors.accent : colors.text2,
                              fontSize: 12, cursor: 'pointer',
                              transition: 'all 200ms',
                              textAlign: 'left',
                              minHeight: 32,
                            }}
                            onMouseEnter={e => {
                              if (composeChannel !== opt.key) e.currentTarget.style.background = `${colors.bg}`
                            }}
                            onMouseLeave={e => {
                              if (composeChannel !== opt.key) e.currentTarget.style.background = 'transparent'
                            }}
                          >
                            {opt.icon}
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Send button */}
                  <button
                    onClick={handleSend}
                    disabled={!composeText.trim() || sending}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 34, height: 34, borderRadius: 8,
                      border: 'none',
                      background: composeText.trim() ? colors.accent : `${colors.accent}30`,
                      color: composeText.trim() ? '#fff' : `${colors.text3}`,
                      cursor: composeText.trim() ? 'pointer' : 'default',
                      transition: 'all 200ms',
                      flexShrink: 0,
                      minWidth: 44, minHeight: 44,
                      padding: 0,
                    }}
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ──── Responsive CSS ──────────────────────────────────────────── */}
      <style>{`
        @media (max-width: 768px) {
          .inbox-left-panel {
            width: 100% !important;
            min-width: 100% !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            bottom: 0 !important;
            z-index: 10 !important;
            transform: translateX(0) !important;
          }
          .inbox-left-panel[style*="translateX(-100%)"] {
            transform: translateX(-100%) !important;
          }
          .inbox-right-panel {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
          }
          .inbox-mobile-back {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  )
}
