'use client';

import { useState, useEffect } from 'react';
import { Images, Download, Loader2, AlertCircle, Clock } from 'lucide-react';

interface SharePack {
  id: string;
  token: string;
  photo_urls: string[];
  created_at: string;
  project: { title: string; vehicle_desc?: string } | null;
}

export default function SharePhotosClient({ token }: { token: string }) {
  const [pack, setPack] = useState<SharePack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const fetchPack = async () => {
      try {
        const res = await fetch(`/api/share-photos/${token}`);
        if (res.status === 410) {
          setExpired(true);
          return;
        }
        if (!res.ok) {
          setError('Share pack not found');
          return;
        }
        const data = await res.json();
        setPack(data);
      } catch {
        setError('Failed to load photos');
      } finally {
        setLoading(false);
      }
    };
    fetchPack();
  }, [token]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Loader2 size={36} style={{ color: '#4f7fff', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (expired) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 20 }}>
        <Clock size={48} style={{ color: '#f59e0b', marginBottom: 16 }} />
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e8eaed', marginBottom: 8 }}>Link Expired</h1>
        <p style={{ color: '#9299b5', fontSize: 14 }}>This photo share link has expired. Please request a new one.</p>
      </div>
    );
  }

  if (error || !pack) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 20 }}>
        <AlertCircle size={48} style={{ color: '#f25a5a', marginBottom: 16 }} />
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e8eaed', marginBottom: 8 }}>Not Found</h1>
        <p style={{ color: '#9299b5', fontSize: 14 }}>{error || 'This share link is invalid.'}</p>
      </div>
    );
  }

  const photos = pack.photo_urls as string[];
  const projectTitle = pack.project?.title || 'Project Photos';
  const vehicleDesc = pack.project?.vehicle_desc;

  return (
    <div style={{ padding: '40px 20px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Images size={28} style={{ color: '#4f7fff' }} />
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 28, fontWeight: 900, color: '#e8eaed' }}>
            USA WRAP CO
          </span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e8eaed', marginBottom: 6 }}>
          {projectTitle}
        </h1>
        {vehicleDesc && (
          <p style={{ color: '#9299b5', fontSize: 14 }}>{vehicleDesc}</p>
        )}
        <p style={{ color: '#5a6080', fontSize: 13, marginTop: 8 }}>
          {photos.length} photo{photos.length !== 1 ? 's' : ''} shared with you
        </p>
      </div>

      {/* Photo grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 16,
      }}>
        {photos.map((url, i) => (
          <div
            key={i}
            style={{
              position: 'relative',
              borderRadius: 12,
              overflow: 'hidden',
              border: '1px solid #1a1d27',
              background: '#13151c',
              aspectRatio: '1',
            }}
          >
            <img
              src={url}
              alt={`Photo ${i + 1}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            {/* Download overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              opacity: 0,
              transition: 'opacity 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
            >
              <a
                href={url}
                download
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#4f7fff',
                  color: '#fff',
                  padding: '10px 20px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <Download size={16} /> Download
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '40px 0 20px' }}>
        <p style={{ fontSize: 12, color: '#5a6080' }}>
          Shared by USA Wrap Co · Questions?{' '}
          <a href="mailto:info@usawrapco.com" style={{ color: '#4f7fff', textDecoration: 'none' }}>
            info@usawrapco.com
          </a>
        </p>
      </div>
    </div>
  );
}
