'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { avatarFileSchema } from '@/lib/validations/profile';
import { z } from 'zod';

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  onUploadComplete: (url: string) => void;
}

export function AvatarUpload({ userId, currentAvatarUrl, onUploadComplete }: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file
    try {
      avatarFileSchema.parse(file);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.issues[0].message);
        return;
      }
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Supabase Storage
    setUploading(true);
    try {
      // Get file extension
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/avatar.${fileExt}`;

      // Delete old avatar if exists (same path will overwrite but clean up metadata)
      if (currentAvatarUrl) {
        const oldPath = currentAvatarUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('avatars').remove([oldPath]);
      }

      // Upload new avatar
      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true, // Overwrite if exists
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      onUploadComplete(publicUrl);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload avatar');
      setPreview(currentAvatarUrl); // Revert preview
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!currentAvatarUrl) return;

    setUploading(true);
    try {
      const path = currentAvatarUrl.split('/').slice(-2).join('/');
      await supabase.storage.from('avatars').remove([path]);

      setPreview(null);
      onUploadComplete(''); // Empty string to clear DB
    } catch (err: any) {
      console.error('Remove error:', err);
      setError(err.message || 'Failed to remove avatar');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        {/* Avatar preview */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-char-700 flex items-center justify-center">
            {preview ? (
              <img
                src={preview}
                alt="Avatar preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-ash-500 text-3xl">👤</span>
            )}
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-char-900/80 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-flame-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Upload controls */}
        <div className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />

          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn-secondary text-sm"
            >
              {preview ? 'Change Avatar' : 'Upload Avatar'}
            </button>

            {preview && (
              <button
                onClick={handleRemoveAvatar}
                disabled={uploading}
                className="btn-ghost text-sm"
              >
                Remove
              </button>
            )}
          </div>

          <p className="text-xs text-ash-500 mt-2">
            JPG, PNG, GIF or WebP. Max 5MB.
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-danger/10 border border-danger/20 rounded-btn">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}
    </div>
  );
}
