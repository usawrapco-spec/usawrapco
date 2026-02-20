'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  image_url?: string;
  channel: string;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url?: string;
    role?: string;
  };
}

interface JobChatProps {
  projectId: string;
  orgId: string;
  currentUserId: string;
  currentUserName?: string;
}

const CHANNELS = [
  { key: 'team', label: '🏢 Team Chat', color: 'purple' },
  { key: 'designer', label: '🎨 Designer', color: 'pink' },
  { key: 'installer', label: '🔧 Installer', color: 'orange' },
  { key: 'client', label: '👤 Client', color: 'cyan' },
];

export default function JobChat({ projectId, orgId, currentUserId, currentUserName = 'You' }: JobChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeChannel, setActiveChannel] = useState('team');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('job_comments')
        .select('*, profiles:user_id(full_name, avatar_url, role)')
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
            // Fetch the full message with profile
            const { data } = await supabase
              .from('job_comments')
              .select('*, profiles:user_id(full_name, avatar_url, role)')
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

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    }
    setSending(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${projectId}/${Date.now()}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('job-images')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Upload failed:', uploadError);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('job-images')
      .getPublicUrl(fileName);

    // Send as chat message with image
    await supabase.from('job_comments').insert({
      org_id: orgId,
      project_id: projectId,
      user_id: currentUserId,
      channel: activeChannel,
      message: newMessage.trim() || `📷 ${file.name}`,
      image_url: urlData.publicUrl,
    });

    setNewMessage('');
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getInitial = (name: string) => name?.charAt(0)?.toUpperCase() || '?';

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-380px)] min-h-[400px]">
      {/* Channel tabs */}
      <div className="flex gap-1 mb-3.5">
        {CHANNELS.map((ch) => (
          <button
            key={ch.key}
            onClick={() => setActiveChannel(ch.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              activeChannel === ch.key
                ? 'bg-purple-600 border-purple-500 text-white'
                : 'bg-[#111827] border-[#1e2d4a] text-gray-400 hover:text-gray-200'
            }`}
          >
            {ch.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-2">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
            No messages yet in this channel. Start the conversation!
          </div>
        )}

        {messages.map((msg) => {
          const isSent = msg.user_id === currentUserId;
          const senderName = msg.profiles?.full_name || (isSent ? currentUserName : 'Unknown');
          const senderRole = msg.profiles?.role || '';

          return (
            <div key={msg.id} className={`flex gap-2.5 max-w-[85%] ${isSent ? 'ml-auto flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${
                  isSent ? 'bg-green-600' : 'bg-purple-600'
                }`}
              >
                {getInitial(senderName)}
              </div>

              <div>
                {/* Bubble */}
                <div
                  className={`px-3.5 py-2.5 border ${
                    isSent
                      ? 'bg-purple-600/80 border-purple-500 rounded-xl rounded-br-sm'
                      : 'bg-[#111827] border-[#1e2d4a] rounded-xl rounded-bl-sm'
                  }`}
                >
                  <div className={`text-[11px] font-bold mb-0.5 ${isSent ? 'text-white/70' : 'text-purple-400'}`}>
                    {senderName} {senderRole && `(${senderRole})`}
                  </div>
                  <div className="text-sm leading-relaxed">{msg.message}</div>
                  {msg.image_url && (
                    <img
                      src={msg.image_url}
                      alt="attachment"
                      className="mt-2 rounded-lg max-w-[240px] max-h-[180px] object-cover border border-[#1e2d4a] cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => window.open(msg.image_url, '_blank')}
                    />
                  )}
                </div>
                <div className="text-[10px] text-gray-500 mt-1 px-1">
                  {formatTime(msg.created_at)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="flex gap-2 mt-3.5 pt-3.5 border-t border-[#1e2d4a]">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-2.5 bg-[#111827] border border-[#1e2d4a] rounded-lg text-gray-400 
            hover:text-purple-400 hover:border-purple-500 transition-all text-lg"
          title="Upload image"
        >
          📷
        </button>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder={uploading ? 'Uploading image...' : 'Type a message...'}
          disabled={uploading}
          className="flex-1 bg-[#111827] border border-[#1e2d4a] rounded-lg px-3.5 py-2.5 
            text-gray-200 text-sm placeholder-gray-500 outline-none 
            focus:border-purple-500 transition-colors disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={sending || (!newMessage.trim() && !uploading)}
          className="px-5 py-2.5 bg-purple-600 text-white rounded-lg font-bold text-sm 
            hover:bg-purple-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {sending ? '...' : 'Send →'}
        </button>
      </div>
    </div>
  );
}
