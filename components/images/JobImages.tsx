'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Camera, Palette, FileCheck, Star, Folder, Tag, Trash2, Images, Loader2, Upload,
  Lightbulb, Archive, Link, Check, ChevronDown, Send, ExternalLink, X,
  ChevronLeft, ChevronRight,
  type LucideIcon,
} from 'lucide-react';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const STORAGE_BUCKET = 'project-files';

/** Only trust image URLs that come from our own Supabase Storage */
function isValidStorageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
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
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const categoryInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [images, setImages] = useState<JobImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('before');
  const [showTagModal, setShowTagModal] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState('before');
  const [sharePacks, setSharePacks] = useState<SharePack[]>([]);
  const [packCopied, setPackCopied] = useState<string | null>(null);
  const [creatingPack, setCreatingPack] = useState(false);

  // Design / Media / Move state
  const [designProjects, setDesignProjects] = useState<{ id: string; description: string; status: string }[]>([]);
  const [mediaAdded, setMediaAdded] = useState<string | null>(null);
  const [movingImageId, setMovingImageId] = useState<string | null>(null);
  const [showSharePacks, setShowSharePacks] = useState(false);

  // Lightbox state
  const [lightboxImage, setLightboxImage] = useState<JobImage | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Drag & Drop state
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverTrash, setDragOverTrash] = useState(false);

  // ── Fetch images ──
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

  // ── Fetch share packs ──
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

  // ── Fetch design projects ──
  useEffect(() => {
    const fetchDesignProjects = async () => {
      const { data } = await supabase
        .from('design_projects')
        .select('id, description, status')
        .eq('project_id', projectId);
      if (data) setDesignProjects(data);
    };
    fetchDesignProjects();
  }, [projectId]);

  // ── Lightbox keyboard navigation ──
  useEffect(() => {
    if (!lightboxImage) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxImage(null);
        return;
      }

      // Find images in same category for arrow nav
      const categoryImages = images.filter((img) => img.category === lightboxImage.category);
      if (categoryImages.length <= 1) return;

      if (e.key === 'ArrowRight') {
        const next = (lightboxIndex + 1) % categoryImages.length;
        setLightboxIndex(next);
        setLightboxImage(categoryImages[next]);
      } else if (e.key === 'ArrowLeft') {
        const prev = (lightboxIndex - 1 + categoryImages.length) % categoryImages.length;
        setLightboxIndex(prev);
        setLightboxImage(categoryImages[prev]);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxImage, lightboxIndex, images]);

  // ── Upload ──
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, category?: string) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);

    const targetCategory = category || uploadCategory;

    for (const file of Array.from(files)) {
      const fileName = `${orgId}/${projectId}/${targetCategory}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload failed:', uploadError);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      if (!isValidStorageUrl(publicUrl)) {
        console.error('Generated URL is not a valid Supabase Storage URL:', publicUrl);
        continue;
      }

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
    Object.values(categoryInputRefs.current).forEach((ref) => {
      if (ref) ref.value = '';
    });
  };

  // ── Delete (no confirm when called from drag-to-trash) ──
  const deleteImage = async (imageId: string, imageUrl: string, skipConfirm = false) => {
    if (!skipConfirm && !confirm('Delete this image?')) return;

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

  // ── Tags ──
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

  // ── Multi-select helpers ──
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

  // ── Open in Design ──
  const openInDesign = useCallback(async () => {
    if (designProjects.length > 0) {
      router.push(`/design/${designProjects[0].id}`);
    } else {
      const { data, error } = await supabase.from('design_projects').insert({
        org_id: orgId,
        project_id: projectId,
        client_name: 'Job',
        design_type: 'Full Wrap',
        description: 'Design from photos',
        status: 'brief',
      }).select().single();
      if (!error && data) {
        setDesignProjects([data]);
        router.push(`/design/${data.id}`);
      }
    }
  }, [designProjects, orgId, projectId, router, supabase]);

  // ── Add to Media Library ──
  const addToMedia = useCallback(async (img: JobImage) => {
    const storagePrefix = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/`;
    const storagePath = img.image_url.startsWith(storagePrefix)
      ? decodeURIComponent(img.image_url.slice(storagePrefix.length))
      : '';

    await supabase.from('media_files').insert({
      storage_path: storagePath,
      public_url: img.image_url,
      filename: img.file_name,
      mime_type: 'image/*',
      file_size: 0,
      uploaded_by: currentUserId,
      source: 'job',
      folder: 'vehicle-photos',
      tags: img.tags || [],
    });
    setMediaAdded(img.id);
    setTimeout(() => setMediaAdded(null), 2000);
  }, [currentUserId, supabase]);

  // ── Move single image ──
  const moveImage = useCallback(async (imageId: string, category: string) => {
    await supabase.from('job_images').update({ category }).eq('id', imageId);
    setImages((prev) => prev.map((img) => (img.id === imageId ? { ...img, category } : img)));
    setMovingImageId(null);
  }, [supabase]);

  // ── Drag & Drop handlers ──
  const handleDragStart = useCallback((e: React.DragEvent, imageId: string) => {
    setDragId(imageId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', imageId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragId(null);
    setDragOverId(null);
    setDragOverTrash(false);
  }, []);

  const handleDragOverTile = useCallback((e: React.DragEvent, imageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(imageId);
  }, []);

  const handleDropOnTile = useCallback((e: React.DragEvent, targetId: string, category: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) {
      setDragOverId(null);
      return;
    }

    // Reorder within category: move source before target in local state
    setImages((prev) => {
      const sourceImg = prev.find((img) => img.id === sourceId);
      if (!sourceImg) return prev;

      // If different category, move to target's category
      if (sourceImg.category !== category) {
        const updated = prev.map((img) =>
          img.id === sourceId ? { ...img, category } : img
        );
        // Persist category change
        supabase.from('job_images').update({ category }).eq('id', sourceId);
        return updated;
      }

      // Same category: reorder
      const withoutSource = prev.filter((img) => img.id !== sourceId);
      const targetIndex = withoutSource.findIndex((img) => img.id === targetId);
      withoutSource.splice(targetIndex, 0, sourceImg);
      return withoutSource;
    });

    setDragOverId(null);
  }, [supabase]);

  const handleDragOverTrash = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTrash(true);
  }, []);

  const handleDragLeaveTrash = useCallback(() => {
    setDragOverTrash(false);
  }, []);

  const handleDropOnTrash = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const imageId = e.dataTransfer.getData('text/plain');
    if (!imageId) return;

    const img = images.find((i) => i.id === imageId);
    if (img) {
      deleteImage(img.id, img.image_url, true);
    }
    setDragOverTrash(false);
    setDragId(null);
  }, [images]);

  // ── Open lightbox ──
  const openLightbox = useCallback((img: JobImage) => {
    const categoryImages = images.filter((i) => i.category === img.category);
    const idx = categoryImages.findIndex((i) => i.id === img.id);
    setLightboxIndex(idx >= 0 ? idx : 0);
    setLightboxImage(img);
  }, [images]);

  const navigateLightbox = useCallback((direction: 1 | -1) => {
    if (!lightboxImage) return;
    const categoryImages = images.filter((i) => i.category === lightboxImage.category);
    if (categoryImages.length <= 1) return;
    const next = (lightboxIndex + direction + categoryImages.length) % categoryImages.length;
    setLightboxIndex(next);
    setLightboxImage(categoryImages[next]);
  }, [lightboxImage, lightboxIndex, images]);

  // ── Computed ──
  const groupedImages = CATEGORIES.map((cat) => ({
    ...cat,
    images: images.filter((img) => img.category === cat.key),
  }));

  const nonEmptyGroups = groupedImages.filter((g) => g.images.length > 0);
  const emptyCategories = CATEGORIES.filter((cat) => !images.some((img) => img.category === cat.key));

  const beforeImages = images.filter((img) => img.category === 'before');
  const afterImages = images.filter((img) => img.category === 'after');
  const hasBeforeAfter = beforeImages.length > 0 && afterImages.length > 0;

  return (
    <div>
      {/* ═══ Top toolbar ═══ */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 transition-colors"
        >
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />

        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setUploadCategory(cat.key)}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              uploadCategory === cat.key
                ? 'bg-purple-600/20 border-purple-500 text-purple-400'
                : 'bg-[#111827] border-[#1e2d4a] text-gray-500 hover:text-gray-300'
            }`}
          >
            <cat.Icon size={12} /> {cat.key}
          </button>
        ))}

        <div className="flex-1 min-w-0" />

        {selectedIds.size > 0 && (
          <button
            onClick={createSharePack}
            disabled={creatingPack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-cyan-600 text-white hover:bg-cyan-700 transition-colors disabled:opacity-50"
          >
            {creatingPack ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            Send ({selectedIds.size})
          </button>
        )}

        {sharePacks.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowSharePacks(!showSharePacks)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-[#1e2d4a] text-cyan-400 hover:bg-cyan-500/10 transition-colors"
            >
              <Send size={12} /> Packs ({sharePacks.length}) <ChevronDown size={11} />
            </button>
            {showSharePacks && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowSharePacks(false)} />
                <div
                  className="absolute right-0 top-full mt-1 z-40 border rounded-xl shadow-2xl p-2 min-w-[280px]"
                  style={{ background: '#13151c', borderColor: '#2a3f6a' }}
                >
                  {sharePacks.map((pack) => (
                    <div
                      key={pack.id}
                      className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-[#1a1d27]"
                    >
                      <div className="flex items-center gap-2">
                        <Images size={13} className="text-cyan-400" />
                        <span className="text-xs text-gray-200">{(pack.photo_urls as string[]).length} photos</span>
                        <span className="text-xs text-gray-500">
                          {new Date(pack.created_at).toLocaleDateString()} · {pack.view_count} views
                        </span>
                      </div>
                      <button
                        onClick={() => copyPackLink(pack.token)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-cyan-400 hover:bg-cyan-500/10"
                      >
                        {packCopied === pack.token ? (
                          <><Check size={11} /> Copied</>
                        ) : (
                          <><ExternalLink size={11} /> Copy</>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ═══ Before / After paired view ═══ */}
      {hasBeforeAfter && (
        <div className="mb-4 p-3 bg-gradient-to-r from-red-500/5 to-green-500/5 border border-[#1e2d4a] rounded-xl">
          <div className="text-xs font-bold text-green-400 uppercase tracking-[1px] mb-2 flex items-center gap-1.5">
            <Images size={13} /> Before & After
          </div>
          <div className="space-y-2">
            {Array.from({ length: Math.max(beforeImages.length, afterImages.length) }).map((_, i) => (
              <div key={i} className="grid grid-cols-2 gap-2">
                <div
                  className="relative aspect-[4/3] rounded-xl overflow-hidden border border-[#1e2d4a] bg-[#0d0f14] cursor-pointer"
                  onClick={() => beforeImages[i] && openLightbox(beforeImages[i])}
                >
                  {beforeImages[i] ? (
                    <img src={beforeImages[i].image_url} alt={beforeImages[i].file_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">No before</div>
                  )}
                  <span className="absolute top-1.5 left-1.5 text-xs font-bold uppercase tracking-wide bg-red-500/80 text-white px-2 py-0.5 rounded-lg">Before</span>
                </div>
                <div
                  className="relative aspect-[4/3] rounded-xl overflow-hidden border border-[#1e2d4a] bg-[#0d0f14] cursor-pointer"
                  onClick={() => afterImages[i] && openLightbox(afterImages[i])}
                >
                  {afterImages[i] ? (
                    <img src={afterImages[i].image_url} alt={afterImages[i].file_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">No after</div>
                  )}
                  <span className="absolute top-1.5 left-1.5 text-xs font-bold uppercase tracking-wide bg-green-500/80 text-white px-2 py-0.5 rounded-lg">After</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Categorized galleries (non-empty only) ═══ */}
      {nonEmptyGroups.map((group) => (
        <div key={group.key} className="mb-4">
          <div className="text-sm font-bold text-purple-400 uppercase tracking-[1px] mb-2 flex items-center gap-1.5">
            <group.Icon size={14} /> {group.label}
            <span className="text-gray-600 font-normal">({group.images.length})</span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1.5">
            {group.images.map((img) => {
              const isSelected = selectedIds.has(img.id);
              const isDragging = dragId === img.id;
              const isDragOver = dragOverId === img.id;
              return (
                <div
                  key={img.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, img.id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOverTile(e, img.id)}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={(e) => handleDropOnTile(e, img.id, group.key)}
                  onClick={() => openLightbox(img)}
                  className={`aspect-square rounded-xl overflow-hidden border relative group cursor-pointer transition-all ${
                    isDragging
                      ? 'opacity-40 scale-95'
                      : isDragOver
                        ? 'border-purple-400 ring-2 ring-purple-400/40 scale-[1.03]'
                        : isSelected
                          ? 'border-green-500 ring-2 ring-green-500/30 shadow-[0_0_12px_rgba(34,192,122,0.15)]'
                          : 'border-[#1e2d4a]/60 hover:border-purple-500/60 hover:shadow-[0_0_16px_rgba(79,127,255,0.1)] hover:scale-[1.02]'
                  }`}
                >
                  <img src={img.image_url} alt={img.file_name} className="w-full h-full object-cover" />

                  {/* Selection checkbox */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelect(img.id); }}
                    className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-md flex items-center justify-center transition-all z-10 ${
                      isSelected
                        ? 'bg-green-500 border-2 border-green-500'
                        : 'bg-black/40 border-2 border-white/30 opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {isSelected && <Check size={12} className="text-white" />}
                  </button>

                  {/* Media added feedback */}
                  {mediaAdded === img.id && (
                    <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center z-20 pointer-events-none">
                      <div className="bg-green-500 rounded-full p-2">
                        <Check size={20} className="text-white" />
                      </div>
                    </div>
                  )}

                  {/* Move category picker overlay */}
                  {movingImageId === img.id && (
                    <div
                      className="absolute inset-0 bg-black/85 z-20 flex flex-col items-center justify-center gap-0.5 p-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="text-xs text-gray-400 font-semibold mb-1">Move to:</div>
                      {CATEGORIES.filter((c) => c.key !== img.category).map((cat) => (
                        <button
                          key={cat.key}
                          onClick={(e) => { e.stopPropagation(); moveImage(img.id, cat.key); }}
                          className="flex items-center gap-1.5 w-full px-2 py-1 rounded text-xs text-gray-300 hover:bg-purple-600/30 hover:text-white transition-colors"
                        >
                          <cat.Icon size={12} /> {cat.label}
                        </button>
                      ))}
                      <button
                        onClick={(e) => { e.stopPropagation(); setMovingImageId(null); }}
                        className="text-xs text-gray-500 hover:text-gray-300 mt-1"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {/* Hover overlay with filename + action icons */}
                  {movingImageId !== img.id && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-1.5 pt-8">
                      <div className="text-xs text-white/80 truncate mb-1">{img.file_name}</div>
                      <div className="flex gap-1">
                        <button
                          title="Open in Design"
                          onClick={(e) => { e.stopPropagation(); openInDesign(); }}
                          className="w-7 h-7 rounded-lg bg-black/50 flex items-center justify-center text-purple-400 hover:bg-purple-600 hover:text-white transition-colors"
                        >
                          <Palette size={15} />
                        </button>
                        <button
                          title="Add to Media Library"
                          onClick={(e) => { e.stopPropagation(); addToMedia(img); }}
                          className="w-7 h-7 rounded-lg bg-black/50 flex items-center justify-center text-blue-400 hover:bg-blue-600 hover:text-white transition-colors"
                        >
                          <Images size={15} />
                        </button>
                        <button
                          title="Move to..."
                          onClick={(e) => { e.stopPropagation(); setMovingImageId(img.id); }}
                          className="w-7 h-7 rounded-lg bg-black/50 flex items-center justify-center text-amber-400 hover:bg-amber-600 hover:text-white transition-colors"
                        >
                          <Folder size={15} />
                        </button>
                        <button
                          title={copiedId === img.id ? 'Copied!' : 'Copy Link'}
                          onClick={(e) => { e.stopPropagation(); copyImageLink(img.image_url, img.id); }}
                          className="w-7 h-7 rounded-lg bg-black/50 flex items-center justify-center text-cyan-400 hover:bg-cyan-600 hover:text-white transition-colors"
                        >
                          {copiedId === img.id ? <Check size={15} /> : <Link size={15} />}
                        </button>
                        <button
                          title="Tag"
                          onClick={(e) => { e.stopPropagation(); setShowTagModal(img.id); }}
                          className="w-7 h-7 rounded-lg bg-black/50 flex items-center justify-center text-gray-300 hover:bg-purple-600 hover:text-white transition-colors"
                        >
                          <Tag size={15} />
                        </button>
                        <button
                          title="Delete"
                          onClick={(e) => { e.stopPropagation(); deleteImage(img.id, img.image_url); }}
                          className="w-7 h-7 rounded-lg bg-black/50 flex items-center justify-center text-red-400 hover:bg-red-600 hover:text-white transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* ═══ Drag-to-trash drop zone ═══ */}
      <AnimatePresence>
        {dragId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            onDragOver={handleDragOverTrash}
            onDragLeave={handleDragLeaveTrash}
            onDrop={handleDropOnTrash}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-8 py-4 rounded-2xl border-2 border-dashed transition-all ${
              dragOverTrash
                ? 'border-red-400 bg-red-500/20 shadow-[0_0_30px_rgba(242,90,90,0.3)] scale-110'
                : 'border-red-500/40 bg-red-500/10'
            }`}
          >
            <Trash2 size={20} className={`transition-colors ${dragOverTrash ? 'text-red-400' : 'text-red-500/60'}`} />
            <span className={`text-sm font-bold transition-colors ${dragOverTrash ? 'text-red-300' : 'text-red-500/60'}`}>
              Drop to delete
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Upload to empty categories ═══ */}
      {emptyCategories.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mt-2 mb-3">
          <span className="text-xs text-gray-600 font-semibold">Upload to:</span>
          {emptyCategories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => {
                const ref = categoryInputRefs.current[cat.key];
                if (ref) ref.click();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border border-dashed border-[#1e2d4a] text-gray-500 hover:border-purple-500/50 hover:text-purple-400 transition-all"
            >
              <cat.Icon size={12} /> {cat.key}
              <input
                ref={(el) => { categoryInputRefs.current[cat.key] = el; }}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUpload(e, cat.key)}
              />
            </button>
          ))}
        </div>
      )}

      {/* ═══ Tag modal ═══ */}
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

      {/* ═══ Floating action bar ═══ */}
      {selectedIds.size > 0 && !dragId && (
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
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-bold transition-colors bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-50"
          >
            {creatingPack ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Send size={13} />
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

      {/* ═══ Lightbox ═══ */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
            onClick={() => setLightboxImage(null)}
          >
            {/* Close button */}
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/80 transition-colors"
            >
              <X size={20} />
            </button>

            {/* Image info */}
            <div className="absolute top-4 left-4 z-10">
              <div className="text-sm font-bold text-white/90">{lightboxImage.file_name}</div>
              <div className="text-xs text-white/50 mt-0.5">
                {CATEGORIES.find((c) => c.key === lightboxImage.category)?.label}
                {' · '}
                {lightboxIndex + 1} / {images.filter((i) => i.category === lightboxImage.category).length}
              </div>
            </div>

            {/* Left arrow */}
            {images.filter((i) => i.category === lightboxImage.category).length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); navigateLightbox(-1); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-black/50 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); navigateLightbox(1); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-black/50 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition-colors"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}

            {/* Main image */}
            <motion.img
              key={lightboxImage.id}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              src={lightboxImage.image_url}
              alt={lightboxImage.file_name}
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
