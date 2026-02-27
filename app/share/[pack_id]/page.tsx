import { getSupabaseAdmin } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'

interface MediaFileRow {
  id: string
  filename: string | null
  public_url: string | null
  mime_type: string | null
  file_size: number | null
  category: string | null
  ai_description: string | null
  tags: string[] | null
}

interface PackRow {
  id: string
  name: string
  description: string | null
  created_at: string
  view_count: number
}

export const dynamic = 'force-dynamic'

function fmt(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

export default async function SharePackPage({ params }: { params: { pack_id: string } }) {
  const admin = getSupabaseAdmin()

  const { data: pack, error } = await admin
    .from('media_packs')
    .select('id, name, description, created_at, view_count, media_file_ids, photo_urls')
    .eq('id', params.pack_id)
    .single()

  if (error || !pack) notFound()

  const typedPack = pack as PackRow & { media_file_ids: string[]; photo_urls: string[] }

  let files: MediaFileRow[] = []
  const ids: string[] = Array.isArray(typedPack.media_file_ids) ? typedPack.media_file_ids : []
  if (ids.length > 0) {
    const { data: mediaFiles } = await admin
      .from('media_files')
      .select('id, filename, public_url, mime_type, file_size, category, ai_description, tags')
      .in('id', ids)
    files = (mediaFiles ?? []) as MediaFileRow[]
  }

  // Fallback: if media_file_ids empty but photo_urls exist
  if (files.length === 0 && typedPack.photo_urls.length > 0) {
    files = typedPack.photo_urls.map((url, i) => ({
      id: String(i),
      filename: null,
      public_url: url,
      mime_type: 'image/jpeg',
      file_size: null,
      category: null,
      ai_description: null,
      tags: null,
    }))
  }

  const imageFiles = files.filter(f => f.mime_type?.startsWith('image/'))
  const otherFiles = files.filter(f => !f.mime_type?.startsWith('image/'))

  return (
    <html lang="en">
      <head>
        <title>{typedPack.name} — USA Wrap Co</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={typedPack.description ?? `Photo pack from USA Wrap Co`} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700;900&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #0d0f14; color: #e8eaed; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; min-height: 100vh; }
          .hf { font-family: 'Barlow Condensed', sans-serif; }
          .mf { font-family: 'JetBrains Mono', monospace; }
          a { color: inherit; text-decoration: none; }
          img { display: block; }
        `}</style>
      </head>
      <body>
        {/* Header */}
        <div style={{ background: '#13151c', borderBottom: '1px solid #1a1d27', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: '#9299b5', marginBottom: 4 }}>USA WRAP CO</div>
            <h1 className="hf" style={{ fontSize: 26, fontWeight: 900, color: '#e8eaed', textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1 }}>
              {typedPack.name}
            </h1>
            {typedPack.description && (
              <p style={{ fontSize: 13, color: '#9299b5', marginTop: 6, maxWidth: 600 }}>{typedPack.description}</p>
            )}
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div className="mf" style={{ fontSize: 11, color: '#5a6080' }}>{files.length} files</div>
            <div className="mf" style={{ fontSize: 11, color: '#5a6080', marginTop: 2 }}>
              {new Date(typedPack.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
          {files.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: '#5a6080' }}>
              <div style={{ fontSize: 18, marginBottom: 8 }}>No photos in this pack</div>
              <div style={{ fontSize: 13 }}>This pack may have expired or been deleted.</div>
            </div>
          ) : (
            <>
              {/* Image grid */}
              {imageFiles.length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: 16,
                  marginBottom: otherFiles.length > 0 ? 40 : 0,
                }}>
                  {imageFiles.map((f, i) => (
                    <a
                      key={f.id}
                      href={f.public_url ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: '#13151c',
                        borderRadius: 12,
                        overflow: 'hidden',
                        border: '1px solid #1a1d27',
                        display: 'block',
                        transition: 'transform 0.15s, border-color 0.15s',
                      }}
                    >
                      <div style={{ position: 'relative', paddingTop: '66%', background: '#1a1d27' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={f.public_url ?? ''}
                          alt={f.filename ?? `Photo ${i + 1}`}
                          loading="lazy"
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      {(f.filename || f.ai_description || (f.tags && f.tags.length > 0)) && (
                        <div style={{ padding: '10px 12px' }}>
                          {f.filename && (
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#e8eaed', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
                              {f.filename}
                            </div>
                          )}
                          {f.ai_description && (
                            <div style={{ fontSize: 11, color: '#9299b5', lineHeight: 1.4, marginBottom: 6 }}>{f.ai_description}</div>
                          )}
                          {f.tags && f.tags.length > 0 && (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {f.tags.slice(0, 4).map(t => (
                                <span key={t} style={{ padding: '1px 6px', background: 'rgba(79,127,255,0.12)', color: '#4f7fff', borderRadius: 4, fontSize: 10 }}>{t}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              )}

              {/* Non-image files */}
              {otherFiles.length > 0 && (
                <div>
                  <h2 className="hf" style={{ fontSize: 18, fontWeight: 700, color: '#9299b5', marginBottom: 12, textTransform: 'uppercase' }}>Documents & Files</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {otherFiles.map(f => (
                      <a
                        key={f.id}
                        href={f.public_url ?? '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#13151c', border: '1px solid #1a1d27', borderRadius: 10 }}
                      >
                        <div style={{ width: 36, height: 36, background: '#1a1d27', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9299b5" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#e8eaed', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.filename ?? 'File'}
                          </div>
                          <div className="mf" style={{ fontSize: 10, color: '#5a6080', marginTop: 2 }}>
                            {f.mime_type} {f.file_size ? '· ' + fmt(f.file_size) : ''}
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: '#4f7fff' }}>Download</div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #1a1d27', padding: '20px 24px', textAlign: 'center', marginTop: 40 }}>
          <div style={{ fontSize: 12, color: '#5a6080' }}>
            Shared by <strong style={{ color: '#9299b5' }}>USA Wrap Co</strong> · Powered by their internal media library
          </div>
        </div>
      </body>
    </html>
  )
}
