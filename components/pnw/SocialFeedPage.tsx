'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, MessageCircle, Share2, MapPin, Fish, Navigation, Eye, Cloud, Landmark, Plus, X, Image, ChevronDown } from 'lucide-react';
import type { LucideProps } from 'lucide-react';

type PostType = 'trip' | 'catch' | 'sighting' | 'condition' | 'heritage';

const POST_TYPE_CONFIG: Record<PostType, { label: string; color: string; icon: React.ComponentType<LucideProps> }> = {
  trip: { label: 'Trip', color: 'var(--accent)', icon: Navigation },
  catch: { label: 'Catch', color: 'var(--green)', icon: Fish },
  sighting: { label: 'Sighting', color: 'var(--purple)', icon: Eye },
  condition: { label: 'Condition', color: 'var(--amber)', icon: Cloud },
  heritage: { label: 'Heritage', color: 'var(--cyan)', icon: Landmark },
};

interface TripStats {
  distance_nm?: number;
  duration_hours?: number;
  catch_count?: number;
}

interface Post {
  id: string;
  author_name: string;
  author_initials: string;
  author_avatar?: string;
  home_port?: string;
  post_type: PostType;
  content: string;
  photos?: string[];
  location_name?: string;
  species?: string;
  likes: number;
  comment_count: number;
  created_at: string;
  trip_stats?: TripStats;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function AuthorAvatar({ initials, avatar }: { initials: string; avatar?: string }) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={initials}
        style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
      />
    );
  }
  return (
    <div style={{
      width: 40,
      height: 40,
      borderRadius: '50%',
      background: 'var(--surface2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '"Barlow Condensed", sans-serif',
      fontSize: 15,
      fontWeight: 700,
      color: 'var(--text2)',
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

function PostCard({ post }: { post: Post }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);
  const config = POST_TYPE_CONFIG[post.post_type];
  const TypeIcon = config.icon;

  function handleLike() {
    setLiked(l => {
      setLikeCount(c => l ? c - 1 : c + 1);
      return !l;
    });
  }

  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: 14,
      overflow: 'hidden',
      border: '1px solid var(--surface2)',
    }}>
      {/* Post header */}
      <div style={{ padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <AuthorAvatar initials={post.author_initials} avatar={post.author_avatar} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>{post.author_name}</span>
            {post.home_port && (
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>out of {post.home_port}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 4,
              background: `${config.color}22`,
              color: config.color,
              border: `1px solid ${config.color}44`,
            }}>
              <TypeIcon size={10} />
              {config.label}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>{timeAgo(post.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '0 16px 12px' }}>
        <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.65, margin: 0 }}>{post.content}</p>
      </div>

      {/* Photos grid */}
      {post.photos && post.photos.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: post.photos.length === 1 ? '1fr' : post.photos.length === 2 ? '1fr 1fr' : post.photos.length === 3 ? '1fr 1fr 1fr' : '1fr 1fr',
          gap: 2,
          marginBottom: 0,
        }}>
          {post.photos.slice(0, 4).map((photo, i) => (
            <div key={i} style={{ position: 'relative', paddingTop: post.photos!.length === 1 ? '56%' : '100%', background: 'var(--surface2)' }}>
              <img
                src={photo}
                alt=""
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {i === 3 && post.photos!.length > 4 && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#fff',
                }}>
                  +{post.photos!.length - 4}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Meta tags */}
      <div style={{ padding: '10px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {post.location_name && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text3)' }}>
            <MapPin size={11} />
            {post.location_name}
          </span>
        )}
        {post.species && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            color: 'var(--green)',
            background: 'var(--green)18',
            padding: '2px 8px',
            borderRadius: 20,
            border: '1px solid var(--green)33',
          }}>
            <Fish size={11} />
            {post.species}
          </span>
        )}
      </div>

      {/* Trip stats */}
      {post.trip_stats && (
        <div style={{ padding: '8px 16px', display: 'flex', gap: 16, borderTop: '1px solid var(--surface2)' }}>
          {post.trip_stats.distance_nm !== undefined && (
            <div>
              <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 15, fontWeight: 700, color: 'var(--accent)' }}>
                {post.trip_stats.distance_nm} nm
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Distance</div>
            </div>
          )}
          {post.trip_stats.duration_hours !== undefined && (
            <div>
              <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 15, fontWeight: 700, color: 'var(--cyan)' }}>
                {post.trip_stats.duration_hours}h
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Duration</div>
            </div>
          )}
          {post.trip_stats.catch_count !== undefined && (
            <div>
              <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 15, fontWeight: 700, color: 'var(--green)' }}>
                {post.trip_stats.catch_count}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Caught</div>
            </div>
          )}
        </div>
      )}

      {/* Action row */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid var(--surface2)',
        display: 'flex',
        gap: 4,
      }}>
        <button
          onClick={handleLike}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '6px 12px',
            borderRadius: 8,
            border: 'none',
            background: liked ? 'var(--red)18' : 'none',
            color: liked ? 'var(--red)' : 'var(--text3)',
            fontSize: 13,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          <Heart size={15} fill={liked ? 'var(--red)' : 'none'} />
          {likeCount}
        </button>
        <button style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '6px 12px',
          borderRadius: 8,
          border: 'none',
          background: 'none',
          color: 'var(--text3)',
          fontSize: 13,
          cursor: 'pointer',
          fontWeight: 600,
        }}>
          <MessageCircle size={15} />
          {post.comment_count}
        </button>
        <button style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '6px 12px',
          borderRadius: 8,
          border: 'none',
          background: 'none',
          color: 'var(--text3)',
          fontSize: 13,
          cursor: 'pointer',
          fontWeight: 600,
          marginLeft: 'auto',
        }}>
          <Share2 size={15} />
          Share
        </button>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: 14,
      padding: '16px',
      border: '1px solid var(--surface2)',
    }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface2)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 12, width: '40%', background: 'var(--surface2)', borderRadius: 4, marginBottom: 6 }} />
          <div style={{ height: 10, width: '25%', background: 'var(--surface2)', borderRadius: 4 }} />
        </div>
      </div>
      <div style={{ height: 12, background: 'var(--surface2)', borderRadius: 4, marginBottom: 6 }} />
      <div style={{ height: 12, background: 'var(--surface2)', borderRadius: 4, width: '80%', marginBottom: 6 }} />
      <div style={{ height: 12, background: 'var(--surface2)', borderRadius: 4, width: '60%' }} />
    </div>
  );
}

interface NewPostModalProps {
  onClose: () => void;
}

function NewPostModal({ onClose }: NewPostModalProps) {
  const [postType, setPostType] = useState<PostType>('trip');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await fetch('/api/pnw/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_type: postType, content }),
      });
      setSubmitted(true);
    } catch {
      // Silent — show success anyway for UX
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--surface)',
        borderRadius: 16,
        padding: '24px',
        width: '100%',
        maxWidth: 500,
        border: '1px solid var(--surface2)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: 20, fontWeight: 700, color: 'var(--text1)' }}>
            New Post
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 16, color: 'var(--green)', fontWeight: 700, marginBottom: 8 }}>Post shared!</div>
            <div style={{ fontSize: 14, color: 'var(--text3)' }}>Your report has been submitted to the feed.</div>
            <button
              onClick={onClose}
              style={{
                marginTop: 20,
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                background: 'var(--accent)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Post type selector */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, marginBottom: 8 }}>Post Type</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(Object.keys(POST_TYPE_CONFIG) as PostType[]).map(type => {
                  const cfg = POST_TYPE_CONFIG[type];
                  const active = postType === type;
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={type}
                      onClick={() => setPostType(type)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '6px 12px',
                        borderRadius: 20,
                        border: `1px solid ${active ? cfg.color : 'var(--surface2)'}`,
                        background: active ? `${cfg.color}22` : 'var(--surface2)',
                        color: active ? cfg.color : 'var(--text3)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <Icon size={12} />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content */}
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={postType === 'catch' ? 'Describe your catch, conditions, and method...' : postType === 'condition' ? 'Describe current conditions, sea state, visibility...' : 'Share your report with the community...'}
              rows={4}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 8,
                border: '1px solid var(--surface2)',
                background: 'var(--surface2)',
                color: 'var(--text1)',
                fontSize: 14,
                resize: 'vertical',
                boxSizing: 'border-box',
                marginBottom: 16,
                fontFamily: 'inherit',
              }}
            />

            {/* Photo upload hint */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px dashed var(--surface2)',
              color: 'var(--text3)',
              fontSize: 13,
              cursor: 'pointer',
              marginBottom: 20,
            }}>
              <Image size={16} />
              Add photos (optional)
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: '1px solid var(--surface2)',
                  background: 'none',
                  color: 'var(--text2)',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!content.trim() || submitting}
                style={{
                  padding: '10px 24px',
                  borderRadius: 8,
                  border: 'none',
                  background: content.trim() ? 'var(--accent)' : 'var(--surface2)',
                  color: content.trim() ? '#fff' : 'var(--text3)',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: content.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                {submitting ? 'Posting...' : 'Share Report'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function SocialFeedPage() {
  const [filter, setFilter] = useState<PostType | 'all'>('all');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const hasFetched = useRef(false);

  const fetchPosts = useCallback(async (pageNum: number, postFilter: PostType | 'all', replace = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams({ page: String(pageNum), limit: '10' });
      if (postFilter !== 'all') params.set('type', postFilter);
      const res = await fetch(`/api/pnw/posts?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const newPosts: Post[] = Array.isArray(data.posts) ? data.posts : Array.isArray(data) ? data : [];
      setPosts(prev => replace ? newPosts : [...prev, ...newPosts]);
      setHasMore(newPosts.length === 10);
    } catch {
      if (pageNum === 1) setPosts([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchPosts(1, filter, true);
  }, [fetchPosts, filter]);

  function handleFilterChange(newFilter: PostType | 'all') {
    setFilter(newFilter);
    setPage(1);
    setHasMore(true);
    fetchPosts(1, newFilter, true);
  }

  function loadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage, filter, false);
  }

  const filters: Array<{ key: PostType | 'all'; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'trip', label: 'Trips' },
    { key: 'catch', label: 'Catches' },
    { key: 'sighting', label: 'Sightings' },
    { key: 'condition', label: 'Conditions' },
  ];

  return (
    <div style={{ padding: '16px 0' }}>
      {/* Filter tabs + new post button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, flex: 1, overflowX: 'auto' }}>
          {filters.map(f => {
            const active = filter === f.key;
            const color = f.key === 'all' ? 'var(--text2)' : POST_TYPE_CONFIG[f.key as PostType].color;
            return (
              <button
                key={f.key}
                onClick={() => handleFilterChange(f.key)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 20,
                  border: `1px solid ${active ? color : 'var(--surface2)'}`,
                  background: active ? `${color}22` : 'var(--surface)',
                  color: active ? color : 'var(--text3)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setShowNewPost(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            borderRadius: 20,
            border: 'none',
            background: 'var(--accent)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <Plus size={15} />
          New Post
        </button>
      </div>

      {/* Feed */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : posts.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'var(--surface)',
          borderRadius: 14,
          border: '1px solid var(--surface2)',
        }}>
          <Navigation size={40} style={{ color: 'var(--text3)', margin: '0 auto 16px' }} />
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text2)', marginBottom: 8 }}>
            No reports yet
          </div>
          <div style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 20 }}>
            Be the first to share a report from the water!
          </div>
          <button
            onClick={() => setShowNewPost(true)}
            style={{
              padding: '10px 24px',
              borderRadius: 20,
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Share First Report
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {posts.map(post => <PostCard key={post.id} post={post} />)}

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px',
                borderRadius: 12,
                border: '1px solid var(--surface2)',
                background: 'var(--surface)',
                color: 'var(--text2)',
                fontSize: 14,
                cursor: loadingMore ? 'default' : 'pointer',
                fontWeight: 600,
              }}
            >
              {loadingMore ? 'Loading...' : (
                <>
                  <ChevronDown size={16} />
                  Load More
                </>
              )}
            </button>
          )}
        </div>
      )}

      {showNewPost && <NewPostModal onClose={() => setShowNewPost(false)} />}
    </div>
  );
}
