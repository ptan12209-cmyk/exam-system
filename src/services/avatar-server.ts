import { SupabaseClient } from '@supabase/supabase-js';
import { fileTypeFromBuffer } from 'file-type';
import { ApiError } from '@/lib/api-utils';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export class AvatarServerService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Upload a new avatar for the given user.
   * Validates file type (magic bytes), extension match, and size.
   * Deletes the old avatar if one exists.
   */
  async uploadAvatar(userId: string, file: File): Promise<{ url: string; message: string }> {
    // Validate file type using magic bytes
    let buf: Buffer;
    try {
      if (typeof file.arrayBuffer === 'function') {
        buf = Buffer.from(await file.arrayBuffer());
      } else {
        throw new Error('arrayBuffer not available');
      }
    } catch {
      buf = await new Promise<Buffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            if (!reader.result) {
              reject(new Error('FileReader returned no data'));
              return;
            }
            resolve(Buffer.from(reader.result as ArrayBuffer));
          } catch {
            reject(new Error('FileReader returned unusable result'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
      });
    }

    const mimeType = await fileTypeFromBuffer(buf);

    if (!mimeType) {
      throw new ApiError(
        'INVALID_FILE_TYPE',
        'Cannot determine file type. File may be corrupted or unsupported.',
        400
      );
    }

    if (!ALLOWED_TYPES.includes(mimeType.mime)) {
      throw new ApiError(
        'FILE_TYPE_NOT_ALLOWED',
        `File type ${mimeType.mime} not allowed. Allowed: ${ALLOWED_TYPES.join(', ')}`,
        400
      );
    }

    // Secondary check: extension must match detected MIME type
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const mimeExtMap: Record<string, string[]> = {
      'image/png': ['png'],
      'image/jpeg': ['jpg', 'jpeg'],
      'image/webp': ['webp'],
    };
    const expectedExts = mimeExtMap[mimeType.mime];
    if (expectedExts && ext && !expectedExts.includes(ext)) {
      throw new ApiError(
        'EXTENSION_MISMATCH',
        `File extension ".${ext}" does not match detected type ${mimeType.mime}`,
        400
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new ApiError('FILE_TOO_LARGE', 'File too large. Maximum size is 2MB.', 400);
    }

    // Get current avatar to delete later
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single();

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = fileName;

    // Upload to Supabase Storage
    const { error: uploadError } = await this.supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new ApiError('UPLOAD_FAILED', 'Failed to upload file', 500);
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = this.supabase.storage.from('avatars').getPublicUrl(filePath);

    // Update profile with new avatar URL
    const { error: updateError } = await this.supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', userId);

    if (updateError) {
      console.error('Profile update error:', updateError);
      // Try to delete uploaded file if profile update fails
      await this.supabase.storage.from('avatars').remove([filePath]);
      throw new ApiError('UPDATE_FAILED', 'Failed to update profile', 500);
    }

    // Delete old avatar if exists
    if (profile?.avatar_url) {
      try {
        const urlParts = profile.avatar_url.split('/');
        const oldFileName = urlParts[urlParts.length - 1];
        await this.supabase.storage.from('avatars').remove([oldFileName]);
      } catch (e) {
        console.error('Failed to delete old avatar:', e);
        // Non-critical, continue
      }
    }

    return {
      url: publicUrl,
      message: 'Avatar uploaded successfully',
    };
  }

  /**
   * Remove the avatar for the given user.
   * Deletes from storage and sets avatar_url to null in profiles.
   */
  async removeAvatar(userId: string): Promise<{ message: string }> {
    // Get current avatar
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single();

    if (profile?.avatar_url) {
      // Delete from storage - extract filename from URL
      const urlParts = profile.avatar_url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      await this.supabase.storage.from('avatars').remove([fileName]);

      // Update profile
      await this.supabase.from('profiles').update({ avatar_url: null }).eq('id', userId);
    }

    return { message: 'Avatar removed successfully' };
  }
}
