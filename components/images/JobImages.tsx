'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Camera, Palette, FileCheck, Star, Folder, Tag, Trash2, Images, Loader2, Upload,
  Lightbulb, Archive, Link, Check, ChevronDown, Send, ExternalLink, X,
  type LucideIcon,
} from 'lucide-react';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const STORAGE_BUCKET = 'project-files';

/** Only trust image URLs that come from our own Supabase Storage */
function isValidStorageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  // Accept URLs from our Supabase project storage (any bucket)
  return url.startsWith(`${SUPABASE_URL}/storage/v1/object/public/`);
}

interface JobImage {
  id: string;
  image_url: string;
  thumbnail_url?: string;
  file_name: string;
  category: string;
  vehicle_type?: string;
  wrap_scope?: string;
  description?: string;
  tags?: string[];
  created_at: string;
}

interface SharePack {
  id: string;
  token: string;
  photo_urls: string[];
  created_at: string;
  view_count: number;
}

interface JobImagesProps {
  projectId: string;
  orgId: string;
  currentUserId: string;
  vehicleType?: string;
  wrapScope?: string;
}

const CATEGORIES: { key: string; label: string; Icon: LucideIcon }[] = [
  { key: 'before', label: 'Before Photos', Icon: Camera },
  { key: 'design', label: 'Design Mockups', Icon: Palette },
  { key: 'proof', label: 'Proofs / Approvals', Icon: FileCheck },
  { key: 'after', label: 'After Photos', Icon: Star },
  { key: 'inspiration', label: 'Inspiration', Icon: Lightbulb },
  { key: 'archive', label: 'Archive', Icon: Archive },
  { key: 'general', label: 'Other Files', Icon: Folder },
];

export default function JobImages({
  projectId,
  orgId,
  currentUserId,
  vehicleType = '',
  wrapScope = '',
}: JobImagesProps) {
  const [images, setImages] = useState<JobImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('before');
  const [showTagModal, setShowTagModal] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const categoryInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const supabase = createClient();

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState('before');
  const [sharePacks, setSharePacks] = useState<SharePack[]>([]);
  const [packCopied, setPackCopied] = useState<string | null>(null);
  const [creatingPack, setCreatingPack] = useState(false);

  // Fetch images — only keep rows with valid Supabase Storage URLs
  useEffect(() => {
    const fetchImages = async () => {
      const { data, error } = await supabase
        .from('job_images')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const valid = (data as JobImage[]).filter((img) => isValidStorageUrl(img.image_url));
        setImages(valid);
      }
    };
    fetchImages();
  }, [projectId]);

  // Fetch share packs
  useEffect(() => {
    const fetchPacks = async () => {
      const { data } = await supabase
        .from('share_photo_packs')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (data) setSharePacks(data as SharePack[]);
    };
    fetchPacks();
  }, [projectId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, category?: string) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);

    const targetCategory = category || uploadCategory;

    for (const file of Array.from(files)) {
      const fileName = `${orgId}/${projectId}/${targetCategory}/${Date.now()}_${file.name}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload failed:', uploadError);
        continue;
      }

      // Get the permanent public URL from Supabase Storage
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      // Verify the URL is a valid Supabase Storage URL before saving
      if (!isValidStorageUrl(publicUrl)) {
        console.error('Generated URL is not a valid Supabase Storage URL:', publicUrl);
        continue;
      }

      // Insert record with the permanent Supabase Storage URL
      const { data: imgRecord, error: insertError } = await supabase
        .from('job_images')
        .insert({
          org_id: orgId,
          project_id: projectId,
          user_id: currentUserId,
          category: targetCategory,
          image_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          vehicle_type: vehicleType,
          wrap_scope: wrapScope,
          tags: [vehicleType, wrapScope].filter(Boolean),
        })
        .select()
        .single();

      if (!insertError && imgRecord) {
        setImages((prev) => [imgRecord as JobImage, ...prev]);
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    // Also clear category-specific input
    Object.values(categoryInputRefs.current).forEach((ref) => {
      if (ref) ref.value = '';
    });
  };

  const deleteImage = async (imageId: string, imageUrl: string) => {
    if (!confirm('Delete this image?')) return;

    // Try to delete from storage too
    const storagePrefix = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/`;
    if (imageUrl.startsWith(storagePrefix)) {
      const storagePath = decodeURIComponent(imageUrl.slice(storagePrefix.length));
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    }

    await supabase.from('job_images').delete().eq('id', imageId);
    setImages((prev) => prev.filter((img) => img.id !== imageId));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(imageId);
      return next;
    });
  };

  const addTag = async (imageId: string) => {
    if (!tagInput.trim()) return;
    const image = images.find((img) => img.id === imageId);
    if (!image) return;

    const newTags = [...(image.tags || []), tagInput.trim()];

    await supabase
      .from('job_images')
      .update({ tags: newTags })
      .eq('id', imageId);

    setImages((prev) =>
      prev.map((img) => (img.id === imageId ? { ...img, tags: newTags } : img))
    );
    setTagInput('');
  };

  // Multi-select helpers
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const copyImageLink = useCallback(async (url: string, imageId: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(imageId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedId(imageId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }, []);

  const moveSelected = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;

    const { error } = await supabase
      .from('job_images')
      .update({ category: moveTarget })
      .in('id', ids);

    if (!error) {
      setImages((prev) =>
        prev.map((img) => (selectedIds.has(img.id) ? { ...img, category: moveTarget } : img))
      );
      setSelectedIds(new Set());
    }
  }, [selectedIds, moveTarget, supabase]);

  const createSharePack = useCallback(async () => {
    const selected = images.filter((img) => selectedIds.has(img.id));
    if (!selected.length) return;
    setCreatingPack(true);

    try {
      const res = await fetch('/api/share-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          photoUrls: selected.map((img) => img.image_url),
        }),
      });

      if (res.ok) {
        const pack = await res.json();
        const shareUrl = `${window.location.origin}/share/photos/${pack.token}`;
        await navigator.clipboard.writeText(shareUrl);
        setSharePacks((prev) => [pack, ...prev]);
        setSelectedIds(new Set());
        setPackCopied(pack.token);
        setTimeout(() => setPackCopied(null), 3000);
      }
    } catch (err) {
      console.error('Failed to create share pack:', err);
    } finally {
      setCreatingPack(false);
    }
  }, [images, selectedIds, projectId]);

  const copyPackLink = useCallback(async (token: string) => {
    const url = `${window.location.origin}/share/photos/${token}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setPackCopied(token);
    setTimeout(() => setPackCopied(null), 2000);
  }, []);

  const groupedImages = CATEGORIES.map((cat) => ({
    ...cat,
    images: images.filter((img) => img.category === cat.key),
  }));

  // Check for before/after pair
  const beforeImages = images.filter((img) => img.category === 'before');
  const afterImages = images.filter((img) => img.category === 'after');
  const hasBeforeAfter = beforeImages.length > 0 && afterImages.length > 0;

  return (
    <div>
      {/* Upload zone — compact */}
      <div className="mb-3">
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Upload to:</span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setUploadCategory(cat.key)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all flex items-center gap-1 ${
                uploadCategory === cat.key
                  ? 'bg-purple-600/20 border-purple-500 text-purple-400'
                  : 'bg-[#111827] border-[#1e2d4a] text-gray-500 hover:text-gray-300'
              }`}
            >
              <cat.Icon size={9} /> {cat.key}
            </button>
          ))}
        </div>

        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all
            ${uploading
              ? 'border-purple-500 bg-purple-500/5'
              : 'border-[#2a3f6a] hover:border-purple-500 hover:bg-purple-500/5'
            }`}
        >
          <div className="flex items-center justify-center gap-2">
            {uploading ? <Loader2 size={18} className="animate-spin opacity-60" /> : <Upload size={18} className="opacity-40" />}
            <span className="text-sm text-gray-400">
              {uploading ? 'Uploading...' : 'Drop images or click to upload'}
            </span>
            <span className="text-[10px] text-gray-600">JPG, PNG, HEIC</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      </div>

      {/* Before / After — paired side by side */}
      {hasBeforeAfter && (
        <div className="mb-4 p-3 bg-gradient-to-r from-red-500/5 to-green-500/5 border border-[#1e2d4a] rounded-xl">
          <div className="text-[10px] font-bold text-green-400 uppercase tracking-[1px] mb-2 flex items-center gap-1.5">
            <Images size={11} /> Before & After
          </div>
          <div className="space-y-2">
            {Array.from({ length: Math.max(beforeImages.length, afterImages.length) }).map((_, i) => (
              <div key={i} className="grid grid-cols-2 gap-2">
                <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-[#1e2d4a] bg-[#0d0f14]">
                  {beforeImages[i] ? (
                    <img src={beforeImages[i].image_url} alt={beforeImages[i].file_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">No before</div>
                  )}
                  <span className="absolute top-1 left-1 text-[9px] font-bold uppercase tracking-wide bg-red-500/80 text-white px-1.5 py-0.5 rounded">Before</span>
                </div>
                <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-[#1e2d4a] bg-[#0d0f14]">
                  {afterImages[i] ? (
                    <img src={afterImages[i].image_url} alt={afterImages[i].file_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">No after</div>
                  )}
                  <span className="absolute top-1 left-1 text-[9px] font-bold uppercase tracking-wide bg-green-500/80 text-white px-1.5 py-0.5 rounded">After</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categorized galleries */}
      {groupedImages.map((group) => (
        <div key={group.key} className="mb-5">
          <div className="text-xs font-bold text-purple-400 uppercase tracking-[1px] mb-2.5 flex items-center gap-1.5">
            <group.Icon size={12} /> {group.label}
          </div>

          {group.images.length === 0 ? (
            <div
              onClick={() => {
                const ref = categoryInputRefs.current[group.key];
                if (ref) ref.click();
              }}
              className="text-gray-500 text-sm py-6 text-center border border-dashed border-[#1e2d4a] rounded-lg
                cursor-pointer hover:border-purple-500/50 hover:bg-purple-500/5 transition-all"
            >
              <Upload size={18} className="mx-auto mb-1.5 opacity-50" />
              <span>No {group.key} photos yet — click to upload</span>
              <input
                ref={(el) => { categoryInputRefs.current[group.key] = el; }}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUpload(e, group.key)}
              />
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {group.images.map((img) => {
                const isSelected = selectedIds.has(img.id);
                return (
                  <div
                    key={img.id}
                    className={`aspect-square rounded-lg overflow-hidden border relative group cursor-pointer transition-all hover:scale-[1.03] ${
                      isSelected
                        ? 'border-green-500 ring-2 ring-green-500/40'
                        : 'border-[#1e2d4a] hover:border-purple-500'
                    }`}
                  >
                    <img src={img.image_url} alt={img.file_name} className="w-full h-full object-cover" />

                    {/* Selection checkbox */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(img.id);
                      }}
                      className={`absolute top-1.5 left-1.5 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all z-10 ${
                        isSelected
                          ? 'bg-green-500 border-green-500'
                          : 'bg-black/40 border-white/30 opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {isSelected && <Check size={14} className="text-white" />}
                    </button>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                      <div className="text-xs font-semibold text-white truncate">{img.file_name}</div>
                      {img.tags && img.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {img.tags.map((tag, i) => (
                            <span key={i} className="text-[9px] bg-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-1.5 mt-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyImageLink(img.image_url, img.id);
                          }}
                          className="text-[10px] bg-[#111827] text-cyan-400 px-2 py-0.5 rounded hover:bg-cyan-600 hover:text-white transition-colors flex items-center gap-1"
                        >
                          {copiedId === img.id ? (
                            <><Check size={9} /> Copied</>
                          ) : (
                            <><Link size={9} /> Link</>
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowTagModal(img.id);
                          }}
                          className="text-[10px] bg-[#111827] text-gray-300 px-2 py-0.5 rounded hover:bg-purple-600 transition-colors flex items-center gap-1"
                        >
                          <Tag size={9} /> Tag
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteImage(img.id, img.image_url);
                          }}
                          className="text-[10px] bg-[#111827] text-red-400 px-2 py-0.5 rounded hover:bg-red-600 hover:text-white transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={9} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Shared Packs list */}
      {sharePacks.length > 0 && (
        <div className="mb-5">
          <div className="text-xs font-bold text-cyan-400 uppercase tracking-[1px] mb-2.5 flex items-center gap-1.5">
            <Send size={12} /> Shared Photo Packs
          </div>
          <div className="space-y-2">
            {sharePacks.map((pack) => (
              <div
                key={pack.id}
                className="flex items-center justify-between bg-[#111827] border border-[#1e2d4a] rounded-lg px-4 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <Images size={16} className="text-cyan-400" />
                  <div>
                    <div className="text-sm font-semibold text-gray-200">
                      {(pack.photo_urls as string[]).length} photos
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(pack.created_at).toLocaleDateString()} · {pack.view_count} view{pack.view_count !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => copyPackLink(pack.token)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                >
                  {packCopied === pack.token ? (
                    <><Check size={12} /> Copied</>
                  ) : (
                    <><ExternalLink size={12} /> Copy Link</>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tag modal */}
      {showTagModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowTagModal(null)}>
          <div className="bg-[#0c1222] border border-[#2a3f6a] rounded-xl p-6 w-80" onClick={(e) => e.stopPropagation()}>
            <div className="text-sm font-bold text-gray-200 mb-3 flex items-center gap-2"><Tag size={14} /> Add Tags</div>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTag(showTagModal)}
                placeholder="e.g. van, full wrap, 3M..."
                className="flex-1 bg-[#111827] border border-[#1e2d4a] rounded-lg px-3 py-2 text-sm text-gray-200
                  placeholder-gray-500 outline-none focus:border-purple-500"
              />
              <button
                onClick={() => addTag(showTagModal)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {images.find((img) => img.id === showTagModal)?.tags?.map((tag, i) => (
                <span key={i} className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
            <button
              onClick={() => setShowTagModal(null)}
              className="mt-4 w-full py-2 text-sm text-gray-400 border border-[#1e2d4a] rounded-lg hover:text-gray-200"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Floating action bar */}
      {selectedIds.size > 0 && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-2xl border shadow-2xl"
          style={{
            background: '#13151c',
            borderColor: '#2a3f6a',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          <span className="text-sm font-bold text-gray-200">
            {selectedIds.size} selected
          </span>

          <div className="w-px h-6 bg-[#2a3f6a]" />

          {/* Move controls */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Move to:</span>
            <div className="relative">
              <select
                value={moveTarget}
                onChange={(e) => setMoveTarget(e.target.value)}
                className="appearance-none bg-[#111827] border border-[#1e2d4a] rounded-lg pl-2.5 pr-7 py-1.5 text-xs text-gray-300 outline-none focus:border-purple-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.key} value={cat.key}>{cat.label}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
            <button
              onClick={moveSelected}
              className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-colors"
            >
              Move
            </button>
          </div>

          <div className="w-px h-6 bg-[#2a3f6a]" />

          {/* Share button */}
          <button
            onClick={createSharePack}
            disabled={creatingPack}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-50"
          >
            {creatingPack ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Send size={12} />
            )}
            Send Selected ({selectedIds.size})
          </button>

          {/* Clear */}
          <button
            onClick={() => setSelectedIds(new Set())}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-[#1a1d27] transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
