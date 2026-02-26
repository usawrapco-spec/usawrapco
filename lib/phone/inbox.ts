/**
 * lib/phone/inbox.ts
 * Helpers to bridge Twilio phone events into the inbox conversation system.
 * Creates/finds conversations and inserts conversation_messages for calls, voicemails, and SMS.
 */
import { ORG_ID } from '@/lib/org'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function findOrCreatePhoneConversation(
  admin: SupabaseClient<any, any, any>,
  phone: string,
  callerName?: string | null
): Promise<{ convoId: string; isNew: boolean }> {
  const { data: existing } = await admin
    .from('conversations')
    .select('id')
    .eq('org_id', ORG_ID)
    .eq('contact_phone', phone)
    .maybeSingle()

  if (existing) return { convoId: existing.id, isNew: false }

  const { data: newConvo } = await admin
    .from('conversations')
    .insert({
      org_id: ORG_ID,
      contact_phone: phone,
      contact_name: callerName || phone,
      status: 'open',
      unread_count: 1,
      last_message_channel: 'sms',
      is_starred: false,
      is_archived: false,
    })
    .select()
    .single()

  return { convoId: newConvo?.id || '', isNew: true }
}

export async function updateConversationLastMessage(
  admin: SupabaseClient<any, any, any>,
  convoId: string,
  channel: string,
  preview: string,
  incrementUnread = false
) {
  const updates: Record<string, unknown> = {
    last_message_at: new Date().toISOString(),
    last_message_preview: preview,
    last_message_channel: channel,
    status: 'open',
  }
  if (incrementUnread) {
    // Increment using RPC would be ideal; for now fetch + update
    const { data: convo } = await admin
      .from('conversations')
      .select('unread_count')
      .eq('id', convoId)
      .single()
    updates.unread_count = (convo?.unread_count || 0) + 1
  }
  await admin.from('conversations').update(updates).eq('id', convoId)
}
