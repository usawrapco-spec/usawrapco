'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Camera, Activity, Send, Loader2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  image_url?: string;
  channel: string;
  created_at: string;
  profiles?: {
    name: string;
    avatar_url?: string;
    role?: string;
  };
}

interface ActivityEvent {
  id: string;
  type: 'message' | 'proof_message' | 'stage_change' | 'approval' | 'send_back' | 'file_upload';
  content: string;
  actor?: string;
  channel?: string;
  proofTitle?: string;
  created_at: string;
  color?: string;
}

interface JobChatProps {
  projectId: string;
  orgId: string;
  currentUserId: string;
  currentUserName?: string;
}

const CHANNELS = [
  { key: 'team',        label: 'Team Chat',   color: '#8b5cf6' },
  { key: 'designer',   label: 'Designer',    color: '#ec4899' },
  { key: 'installer',  label: 'Installer',   color: '#f59e0b' },
  { key: 'client',     label: 'Client',      color: '#22d3ee' },
  { key: 'all',        label: 'All Activity', color: '#22c07a' },
];

const CHANNEL_COLORS: Record<string, string> = {
  team: '#8b5cf6',
  designer: '#ec4899',
  installer: '#f59e0b',
  client: '#22d3ee',
};

export default function JobChat({ projectId, orgId, currentUserId, currentUserName = 'You' }: JobChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeChannel, setActiveChannel] = useState('team');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [activityFeed, setActivityFeed] = useState<ActivityEvent[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Fetch messages for active channel
  useEffect(() => {
    if (activeChannel === 'all') return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('job_comments')
        .select('*, profiles:user_id(name, avatar_url, role)')
        .eq('project_id', projectId)
        .eq('channel', activeChannel)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data as ChatMessage[]);
      }
    };

    fetchMessages();

    // Real-time subscription
    const channel = supabase
      .channel(`job-chat-${projectId}-${activeChannel}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'job_comments',
          filter: `project_id=eq.${projectId}`,
        },
        async (payload) => {
          if (payload.new.channel === activeChannel) {
            const { data } = await supabase
              .from('job_comments')
              .select('*, profiles:user_id(name, avatar_url, role)')
              .eq('id', payload.new.id)
              .single();

            if (data) {
              setMessages((prev) => [...prev, data as ChatMessage]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, activeChannel]);

  // Fetch All Activity feed
  const fetchActivity = useCallback(async () => {
    setLoadingActivity(true);
    const events: ActivityEvent[] = [];

    // All chat messages across channels
    const { data: allMsgs } = await supabase
      .from('job_comments')
      .select('id, message, channel, created_at, profiles:user_id(name)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    (allMsgs || []).forEach(m => {
      events.push({
        id: `msg-${m.id}`,
        type: 'message',
        content: (m as any).message,
        actor: (m as any).profiles?.name,
        channel: (m as any).channel,
        created_at: (m as any).created_at,
        color: CHANNEL_COLORS[(m as any).channel] || '#9299b5',
      });
    });

    // Stage approvals
    const { data: approvals } = await supabase
      .from('stage_approvals')
      .select('id, stage, status, approved_at, created_at, approver:approved_by(name)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    (approvals || []).forEach(a => {
      if ((a as any).approved_at) {
        events.push({
          id: `appr-${a.id}`,
          type: 'approval',
          content: `Stage "${(a as any).stage?.replace(/_/g, ' ')}" approved`,
          actor: (a as any).approver?.name,
          created_at: (a as any).approved_at,
          color: '#22c07a',
        });
      }
    });

    // Proof messages
    const { data: proofMsgs } = await supabase
      .from('job_proof_messages')
      .select('id, content, sender_name, sender_type, created_at, proof:proof_id(title)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    (proofMsgs || []).forEach(m => {
      events.push({
        id: `proof-msg-${m.id}`,
        type: 'proof_message',
        content: (m as any).content,
        actor: (m as any).sender_name,
        proofTitle: (m as any).proof?.title,
        created_at: (m as any).created_at,
        color: '#22d3ee',
      });
    });

    // Sort all events by time
    events.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    setActivityFeed(events);
    setLoadingActivity(false);
  }, [projectId, supabase]);

  useEffect(() => {
    if (activeChannel === 'all') fetchActivity();
  }, [activeChannel, fetchActivity]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activityFeed]);

  const sendMessage = async () => {
    if (!newMessage.trim() && !uploading) return;
    setSending(true);

    const { error } = await supabase.from('job_comments').insert({
      org_id: orgId,
      project_id: projectId,
      user_id: currentUserId,
      channel: activeChannel,
      message: newMessage.trim(),
    });

    if (!error) {
      setNewMessage('');
      fetch('/api/xp/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'job_comment', sourceType: 'project', sourceId: projectId }),
      }).catch(() => {});
    }
    setSending(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${projectId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Upload failed:', uploadError);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('project-files')
      .getPublicUrl(fileName);

    await supabase.from('job_comments').insert({
      org_id: orgId,
      project_id: projectId,
      user_id: currentUserId,
      channel: activeChannel,
      message: newMessage.trim() || `[Image] ${file.name}`,
      image_url: urlData.publicUrl,
    });

    fetch('/api/xp/award', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'photo_upload', sourceType: 'project', sourceId: projectId }),
    }).catch(() => {});

    setNewMessage('');
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getInitial = (name: string) => name?.charAt(0)?.toUpperCase() || '?';
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const isAllActivity = activeChannel === 'all';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 380px)', minHeight: 400 }}>
      {/* Channel tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap' }}>
        {CHANNELS.map((ch) => (
          <button
            key={ch.key}
            onClick={() => setActiveChannel(ch.key)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: `1px solid ${activeChannel === ch.key ? ch.color : 'rgba(255,255,255,0.1)'}`,
              background: activeChannel === ch.key ? `${ch.color}25` : 'transparent',
              color: activeChannel === ch.key ? ch.color : 'var(--text3)',
              cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.12s',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            {ch.key === 'all' && <Activity size={11} />}
            {ch.label}
          </button>
        ))}
      </div>

      {/* Messages / Activity area */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4 }}>
        {isAllActivity ? (
          /* ── All Activity Feed ── */
          loadingActivity ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text3)' }}>
              <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', marginRight: 8 }} />
              Loading activity…
            </div>
          ) : activityFeed.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)', flex: 1 }}>
              <Activity size={32} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.3 }} />
              <div style={{ fontSize: 14, fontWeight: 600 }}>No activity yet</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>Activity from all channels will appear here.</div>
            </div>
          ) : (
            activityFeed.map(event => (
              <div key={event.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                {/* Timeline dot */}
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: event.color || '#9299b5', flexShrink: 0, marginTop: 6,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {event.actor && (
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>
                        {event.actor}
                      </span>
                    )}
                    {event.channel && (
                      <span style={{
                        padding: '1px 7px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                        background: `${CHANNEL_COLORS[event.channel] || '#9299b5'}20`,
                        color: CHANNEL_COLORS[event.channel] || '#9299b5',
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                      }}>
                        {event.channel}
                      </span>
                    )}
                    {event.proofTitle && (
                      <span style={{ fontSize: 10, color: 'var(--cyan)', fontWeight: 600 }}>
                        re: {event.proofTitle}
                      </span>
                    )}
                    {event.type === 'approval' && (
                      <span style={{ fontSize: 10, color: '#22c07a', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        APPROVED
                      </span>
                    )}
                    <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 'auto' }}>
                      {formatDate(event.created_at)}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 13, color: 'var(--text2)', marginTop: 3,
                    padding: '6px 10px', borderRadius: 8,
                    background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.06)',
                    lineHeight: 1.5,
                  }}>
                    {event.content}
                  </div>
                </div>
              </div>
            ))
          )
        ) : (
          /* ── Channel messages ── */
          <>
            {messages.length === 0 && (
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text3)', fontSize: 13,
              }}>
                No messages yet in this channel. Start the conversation!
              </div>
            )}

            {messages.map((msg) => {
              const isSent = msg.user_id === currentUserId;
              const senderName = msg.profiles?.name || (isSent ? currentUserName : 'Unknown');
              const senderRole = msg.profiles?.role || '';
              const channelColor = CHANNEL_COLORS[activeChannel] || '#8b5cf6';

              return (
                <div key={msg.id} style={{
                  display: 'flex', gap: 10, maxWidth: '85%',
                  alignSelf: isSent ? 'flex-end' : 'flex-start',
                  flexDirection: isSent ? 'row-reverse' : 'row',
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: isSent ? '#22c07a' : channelColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800, color: '#fff',
                  }}>
                    {getInitial(senderName)}
                  </div>

                  <div>
                    <div style={{
                      padding: '8px 14px', borderRadius: 12,
                      background: isSent ? `${channelColor}30` : 'var(--surface)',
                      border: `1px solid ${isSent ? `${channelColor}50` : 'rgba(255,255,255,0.08)'}`,
                      borderBottomRightRadius: isSent ? 4 : 12,
                      borderBottomLeftRadius: isSent ? 12 : 4,
                    }}>
                      <div style={{
                        fontSize: 11, fontWeight: 700, marginBottom: 3,
                        color: isSent ? 'rgba(255,255,255,0.6)' : channelColor,
                      }}>
                        {senderName} {senderRole && `(${senderRole})`}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text1)', lineHeight: 1.5 }}>
                        {msg.message}
                      </div>
                      {msg.image_url && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={msg.image_url}
                          alt="attachment"
                          style={{
                            marginTop: 8, borderRadius: 8, maxWidth: 240, maxHeight: 180,
                            objectFit: 'cover', display: 'block', cursor: 'pointer',
                          }}
                          onClick={() => setLightboxUrl(msg.image_url || null)}
                        />
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3, paddingLeft: 4 }}>
                      {formatTime(msg.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input bar (only for non-activity channels) */}
      {!isAllActivity && (
        <div style={{
          display: 'flex', gap: 8, marginTop: 14, paddingTop: 14,
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleImageUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Upload image"
            style={{
              padding: '8px 10px', background: 'var(--surface)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
              color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center',
            }}
          >
            <Camera size={16} />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={uploading ? 'Uploading image…' : 'Type a message…'}
            disabled={uploading}
            style={{
              flex: 1, background: 'var(--surface)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
              padding: '8px 14px', color: 'var(--text1)', fontSize: 13,
              outline: 'none',
            }}
          />
          <button
            onClick={sendMessage}
            disabled={sending || (!newMessage.trim() && !uploading)}
            style={{
              padding: '8px 16px', background: CHANNEL_COLORS[activeChannel] || '#8b5cf6',
              border: 'none', borderRadius: 8, color: '#fff',
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
              opacity: sending || (!newMessage.trim() && !uploading) ? 0.4 : 1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {sending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
          </button>
        </div>
      )}

      {/* Image lightbox */}
      {lightboxUrl && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
          onClick={() => setLightboxUrl(null)}
        >
          <button
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'transparent', border: 'none',
              color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
            }}
            onClick={() => setLightboxUrl(null)}
          >
            <X size={32} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="Full size"
            style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
