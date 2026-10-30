import { supabase } from './supabaseClient';
import { compressImageToWebP } from '../utils/imageCompressor';

export interface StorageUploadResult {
  success: boolean;
  url?: string;
  name?: string;
  error?: string;
  originalSize?: number;
  compressedSize?: number;
}

class StorageService {
  private checkedBuckets = new Set<string>();

  /**
   * Automatically verifies/creates storage bucket if needed
   */
  private async ensureBucket(bucketName: string, isPublic: boolean = true): Promise<boolean> {
    if (this.checkedBuckets.has(bucketName)) return true;
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const exists = buckets?.some((b) => b.name === bucketName);
      if (!exists) {
        await supabase.storage.createBucket(bucketName, {
          public: isPublic,
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'],
        });
      }
      this.checkedBuckets.add(bucketName);
      return true;
    } catch {
      // Bucket check is non-blocking
      return false;
    }
  }

  /**
   * Uploads an image attachment for Customer or Admin chat
   * Auto-compresses to modern WebP format
   */
  public async uploadChatAttachment(file: File, conversationId: string): Promise<StorageUploadResult> {
    try {
      await this.ensureBucket('chat_attachments', true);

      // Pre-compress to WebP (max 1200px)
      const compressed = await compressImageToWebP(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.85,
      });

      const cleanFolder = conversationId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const fileName = `${cleanFolder}/${uniqueSuffix}.webp`;

      const { data, error } = await supabase.storage
        .from('chat_attachments')
        .upload(fileName, compressed.file, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/webp',
        });

      if (error) {
        // Fallback: If bucket upload fails with permission, attempt direct upload
        console.warn('[StorageService] Chat upload notice:', error.message);
        return {
          success: false,
          error: error.message || 'Storage upload error',
        };
      }

      const { data: publicUrlData } = supabase.storage
        .from('chat_attachments')
        .getPublicUrl(data?.path || fileName);

      return {
        success: true,
        url: publicUrlData.publicUrl,
        name: file.name,
        originalSize: compressed.originalSize,
        compressedSize: compressed.compressedSize,
      };
    } catch (err: any) {
      console.warn('[StorageService] Chat attachment error:', err);
      return {
        success: false,
        error: err?.message || 'Failed to upload chat image attachment',
      };
    }
  }

  /**
   * Uploads player payment screenshot for Top-Up verification
   */
  public async uploadPaymentProof(file: File, customerId: string): Promise<StorageUploadResult> {
    try {
      await this.ensureBucket('chat_attachments', true);

      const compressed = await compressImageToWebP(file, {
        maxWidth: 1400,
        maxHeight: 1400,
        quality: 0.88,
      });

      const cleanUserId = customerId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `receipts/${cleanUserId}_${Date.now()}.webp`;

      const { data, error } = await supabase.storage
        .from('chat_attachments')
        .upload(fileName, compressed.file, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/webp',
        });

      if (error) {
        return { success: false, error: error.message };
      }

      const { data: publicUrlData } = supabase.storage
        .from('chat_attachments')
        .getPublicUrl(data?.path || fileName);

      return {
        success: true,
        url: publicUrlData.publicUrl,
        name: file.name,
        originalSize: compressed.originalSize,
        compressedSize: compressed.compressedSize,
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Receipt upload failed' };
    }
  }

  /**
   * Uploads profile picture with on-the-fly WebP compression and transformations
   */
  public async uploadAvatar(file: File, userId: string): Promise<StorageUploadResult> {
    try {
      await this.ensureBucket('avatars', true);

      // Pre-compress to square WebP (400x400)
      const compressed = await compressImageToWebP(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.88,
      });

      const cleanUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `${cleanUserId}/avatar_${Date.now()}.webp`;

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, compressed.file, {
          cacheControl: '86400',
          upsert: true,
          contentType: 'image/webp',
        });

      if (error) {
        return { success: false, error: error.message };
      }

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(data?.path || fileName);

      // Attach Supabase on-the-fly image transformation parameters
      const transformedUrl = `${urlData.publicUrl}?width=160&height=160&format=webp&quality=80`;

      return {
        success: true,
        url: transformedUrl,
        name: file.name,
        originalSize: compressed.originalSize,
        compressedSize: compressed.compressedSize,
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Avatar upload failed' };
    }
  }
}

export const storageService = new StorageService();
