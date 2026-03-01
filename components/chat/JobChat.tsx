'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Camera, Send, Loader2, Lock, User, Users, Eye, AlertTriangle } from 'lucide-react';

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

interface JobChatProps {
  projectId: string;
  orgId: string;
  currentUserId: string;
  currentUserName?: string;
  customerName?: string;
  installerName?: string;
}

type Channel = 'internal' | 'customer' | 'threeway';

const CHANNELS: { key: Channel; label: string; shortLabel: string; color: string; Icon: React.ElementType }[] = [
  { key: 'internal', label: 'Internal · Team Only', shortLabel: 'Internal', color: '#4f7fff', Icon: Lock },
  { key: 'customer', label: 'Customer',              shortLabel: 'Customer', color: '#22c07a', Icon: User },
  { key: 'threeway', label: '3-Way · Install Coord', shortLabel: '3-Way',    color: '#f59e0b', Icon: Users },
];

export default function JobChat({
  projectId,
  orgId,
  currentUserId,
  currentUserName = 'You',
  customerName,
  installerName,
}: JobChatProps) {
  const [messages, setMessages]       = useState<ChatMessage[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel>('internal');
  const [newMessage, setNewMessage]   = useState('');
  const [sending, setSending]         = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [confirmToast, setConfirmToast] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const customerFirstName = customerName?.split(' ')[0] || 'Customer';
  const ch = CHANNELS.find(c => c.key === activeChannel)!;

  // ── Fetch + real-time subscription ────────────────────────────
  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('job_comments')
        .select('*, profiles:user_id(name, avatar_url, role)')
        .eq('project_id', projectId)
        .eq('channel', activeChannel)
        .order('created_at', { ascending: true });

      if (!error && data) setMessages(data as ChatMessage[]);
    };

    fetchMessages();

    const sub = supabase
      .channel(`job-chat-${projectId}-${activeChannel}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'job_comments', filter: `project_id=eq.${projectId}` },
        async (payload) => {
          if (payload.new.channel === activeChannel) {
            const { data } = await supabase
              .from('job_comments')
              .select('*, profiles:user_id(name, avatar_url, role)')
              .eq('id', payload.new.id)
              .single();
            if (data) setMessages(prev => [...prev, data as ChatMessage]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, activeChannel]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Core insert ───────────────────────────────────────────────
  const insertComment = async (messageText: string, imageUrl?: string) => {
    const { error } = await supabase.from('job_comments').insert({
      org_id: orgId,
      project_id: projectId,
      user_id: currentUserId,
      channel: activeChannel,
      message: messageText,
      ...(imageUrl ? { image_url: imageUrl } : {}),
    });
    if (!error) {
      setNewMessage('');
      fetch('/api/xp/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'job_comment', sourceType: 'project', sourceId: projectId }),
      }).catch(() => {});
    }
  };

  // ── Confirmation toast helper ─────────────────────────────────
  const withConfirm = async (recipient: string, fn: () => Promise<void>) => {
    setConfirmToast(`Sending to ${recipient}...`);
    await new Promise(r => setTimeout(r, 1000));
    setConfirmToast('');
    await fn();
  };

  // ── Send message ──────────────────────────────────────────────
  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    setSending(true);

    const go = () => insertComment(newMessage.trim());

    if (activeChannel === 'customer') {
      await withConfirm(customerFirstName, go);
    } else if (activeChannel === 'threeway') {
      const label = `Team, ${customerName || 'Customer'}${installerName ? ` & ${installerName}` : ''}`;
      await withConfirm(label, go);
    } else {
      await go();
    }

    setSending(false);
  };

  // ── Image upload ──────────────────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const ext  = file.name.split('.').pop();
    const path = `${projectId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from('project-files').upload(path, file);
    if (uploadError) { setUploading(false); return; }

    const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(path);
    const imageUrl = urlData.publicUrl;

    const go = () => insertComment(newMessage.trim() || `[Image] ${file.name}`, imageUrl);

    if (activeChannel === 'customer') {
      await withConfirm(customerFirstName, go);
    } else if (activeChannel === 'threeway') {
      await withConfirm('everyone', go);
    } else {
      await go();
    }

    fetch('/api/xp/award', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'photo_upload', sourceType: 'project', sourceId: projectId }),
    }).catch(() => {});

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getInitial  = (name: string) => name?.charAt(0)?.toUpperCase() || '?';
  const formatTime  = (s: string) => new Date(s).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const placeholder = activeChannel === 'internal'  ? 'Message the team...'
                    : activeChannel === 'customer'   ? `Message ${customerFirstName}...`
                    : 'Message everyone...';

  const sendLabel   = activeChannel === 'internal'  ? 'Send to Team'
                    : activeChannel === 'customer'   ? 'Send to Customer'
                    : 'Send to All';

  const threeWayLocked = activeChannel === 'threeway' && !installerName;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 380px)', minHeight: 400 }}>

      {/* ── Channel Tabs ── */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 0 }}>
        {CHANNELS.map((c) => {
          const Icon = c.Icon;
          const active = activeChannel === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setActiveChannel(c.key)}
              style={{
                flex: 1, padding: '11px 8px', fontSize: 12, fontWeight: 700,
                border: 'none', borderBottom: `3px solid ${active ? c.color : 'transparent'}`,
                background: active ? `${c.color}10` : 'transparent',
                color: active ? c.color : 'var(--text3)',
                cursor: 'pointer', transition: 'all 0.12s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}
            >
              <Icon size={12} />
              <span style={{ whiteSpace: 'nowrap' }}>
                {c.shortLabel}
                {c.key === 'customer' && customerName && (
                  <span style={{ fontWeight: 400, marginLeft: 4 }}>· {customerFirstName}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Warning Banner ── */}
      {activeChannel === 'internal' && (
        <div style={{
          padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 7,
          fontSize: 11, fontWeight: 700, color: '#4f7fff',
          background: '#4f7fff14', borderBottom: '1px solid #4f7fff25',
        }}>
          <Lock size={11} />
          PRIVATE — Customer cannot see this
        </div>
      )}

      {activeChannel === 'customer' && (
        <div style={{
          padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 7,
          fontSize: 11, fontWeight: 700, color: '#22c07a',
          background: '#22c07a14', borderBottom: '1px solid #22c07a25',
        }}>
          <Eye size={11} />
          CUSTOMER VISIBLE — {customerFirstName} will see this
        </div>
      )}

      {activeChannel === 'threeway' && (
        <div style={{
          padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 7,
          fontSize: 11, fontWeight: 700, color: '#f59e0b',
          background: '#f59e0b14', borderBottom: '1px solid #f59e0b25',
        }}>
          <AlertTriangle size={11} />
          {installerName
            ? `ALL PARTIES VISIBLE — Team, ${customerName || 'Customer'} & ${installerName} all see this thread`
            : 'ALL PARTIES VISIBLE — Team & Customer see this thread'}
        </div>
      )}

      {/* ── Messages Area ── */}
      <div style={{
        flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
        gap: 12, padding: '14px 4px 0 4px',
      }}>
        {threeWayLocked ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--text3)', textAlign: 'center', padding: '40px 20px',
          }}>
            <Users size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)' }}>No installer assigned</div>
            <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
              Assign an installer to enable 3-way chat
            </div>
          </div>
        ) : (
          <>
            {messages.length === 0 && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 13 }}>
                No messages yet. Start the conversation!
              </div>
            )}

            {messages.map((msg) => {
              const isSent     = msg.user_id === currentUserId;
              const senderName = msg.profiles?.name || (isSent ? currentUserName : 'Unknown');

              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex', gap: 10, maxWidth: '85%',
                    alignSelf: isSent ? 'flex-end' : 'flex-start',
                    flexDirection: isSent ? 'row-reverse' : 'row',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: isSent ? ch.color : `${ch.color}80`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800, color: '#fff',
                  }}>
                    {getInitial(senderName)}
                  </div>

                  <div>
                    <div style={{
                      padding: '8px 14px', borderRadius: 12,
                      background: isSent ? `${ch.color}28` : 'var(--surface)',
                      border: `1px solid ${isSent ? `${ch.color}50` : 'rgba(255,255,255,0.08)'}`,
                      borderBottomRightRadius: isSent ? 4 : 12,
                      borderBottomLeftRadius:  isSent ? 12 : 4,
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 3, color: isSent ? 'rgba(255,255,255,0.55)' : ch.color }}>
                        {senderName}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text1)', lineHeight: 1.5 }}>
                        {msg.message}
                      </div>
                      {msg.image_url && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={msg.image_url}
                          alt="attachment"
                          style={{ marginTop: 8, borderRadius: 8, maxWidth: 240, maxHeight: 180, objectFit: 'cover', display: 'block', cursor: 'pointer' }}
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

      {/* ── Input Bar ── */}
      {!threeWayLocked && (
        <div style={{ display: 'flex', gap: 8, marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />

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
            placeholder={uploading ? 'Uploading image…' : placeholder}
            disabled={uploading}
            style={{
              flex: 1, background: 'var(--surface)',
              border: `1px solid ${ch.color}50`, borderRadius: 8,
              padding: '8px 14px', color: 'var(--text1)', fontSize: 13, outline: 'none',
            }}
          />

          <button
            onClick={sendMessage}
            disabled={sending || (!newMessage.trim() && !uploading)}
            style={{
              padding: '8px 16px', background: ch.color, border: 'none', borderRadius: 8,
              color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              opacity: sending || (!newMessage.trim() && !uploading) ? 0.4 : 1,
              display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
              transition: 'background 0.15s, opacity 0.15s',
            }}
          >
            {sending
              ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              : <Send size={14} />}
            {sendLabel}
          </button>
        </div>
      )}

      {/* ── Confirmation Toast ── */}
      {confirmToast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(13,15,20,0.95)', color: '#fff',
          padding: '10px 22px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          zIndex: 9999, border: `1px solid ${ch.color}60`,
          boxShadow: `0 4px 16px ${ch.color}30`,
        }}>
          {confirmToast}
        </div>
      )}

      {/* ── Image Lightbox ── */}
      {lightboxUrl && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setLightboxUrl(null)}
        >
          <button
            style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}
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
