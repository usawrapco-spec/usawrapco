'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Camera, Palette, FileCheck, Star, Folder, Tag, Trash2, Images, Loader2, Upload, type LucideIcon } from 'lucide-react';

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
      {/* Upload zone */}
      <div className="mb-5">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Upload to:</span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setUploadCategory(cat.key)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all flex items-center gap-1 ${
                uploadCategory === cat.key
                  ? 'bg-purple-600/20 border-purple-500 text-purple-400'
                  : 'bg-[#111827] border-[#1e2d4a] text-gray-500 hover:text-gray-300'
              }`}
            >
              <cat.Icon size={11} /> {cat.key}
            </button>
          ))}
        </div>

        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
            ${uploading
              ? 'border-purple-500 bg-purple-500/5'
              : 'border-[#2a3f6a] hover:border-purple-500 hover:bg-purple-500/5'
            }`}
        >
          <div className="mb-2 opacity-60 flex justify-center">{uploading ? <Loader2 size={36} className="animate-spin" /> : <Camera size={36} />}</div>
          <div className="text-sm font-semibold text-gray-400">
            {uploading ? 'Uploading...' : 'Drop images here or click to upload'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Supports JPG, PNG, HEIC — max 25MB per file
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

      {/* Before / After gallery */}
      {hasBeforeAfter && (
        <div className="mb-6 p-4 bg-gradient-to-r from-red-500/5 to-green-500/5 border border-[#1e2d4a] rounded-xl">
          <div className="text-xs font-bold text-green-400 uppercase tracking-[1px] mb-3 flex items-center gap-1.5">
            <Images size={13} /> Before & After Gallery
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] font-bold text-red-400 uppercase tracking-wide mb-2">Before</div>
              <div className="grid grid-cols-2 gap-2">
                {beforeImages.slice(0, 4).map((img) => (
                  <div key={img.id} className="aspect-square rounded-lg overflow-hidden border border-[#1e2d4a]">
                    <img src={img.image_url} alt={img.file_name} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-green-400 uppercase tracking-wide mb-2">After</div>
              <div className="grid grid-cols-2 gap-2">
                {afterImages.slice(0, 4).map((img) => (
                  <div key={img.id} className="aspect-square rounded-lg overflow-hidden border border-[#1e2d4a]">
                    <img src={img.image_url} alt={img.file_name} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
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
              {group.images.map((img) => (
                <div
                  key={img.id}
                  className="aspect-square rounded-lg overflow-hidden border border-[#1e2d4a]
                    relative group cursor-pointer hover:border-purple-500 transition-all hover:scale-[1.03]"
                >
                  <img src={img.image_url} alt={img.file_name} className="w-full h-full object-cover" />

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
              ))}
            </div>
          )}
        </div>
      ))}

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
    </div>
  );
}
