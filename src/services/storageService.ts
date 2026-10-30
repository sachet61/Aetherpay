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

/**
 * Converts a File or Blob into a base64 encoded string
 */
async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

class StorageService {
  private checkedBuckets = new Set<string>();

  /**
   * Verifies/creates storage bucket via client if permissions allow
   */
  private async ensureBucket(bucketName: string, isPublic: boolean = true): Promise<boolean> {
    if (this.checkedBuckets.has(bucketName)) return true;
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const exists = buckets?.some((b) => b.name === bucketName);
      if (!exists) {
        await supabase.storage.createBucket(bucketName, {
          public: isPublic,
          fileSizeLimit: 15728640,
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'],
        });
      }
      this.checkedBuckets.add(bucketName);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Secure fallback upload via Express / Vercel service-role endpoint.
   * Auto-provisions bucket with service-role permissions and uploads file safely.
   */
  private async uploadViaServerFallback(
    file: File | Blob,
    bucket: string,
    filePath: string,
    contentType: string = 'image/webp',
    userId?: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const base64Data = await fileToBase64(file);
      const res = await fetch('/api/storage/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bucket,
          path: filePath,
          fileBase64: base64Data,
          contentType,
          userId,
        }),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        return {
          success: false,
          error: errorJson.error || `Server storage upload failed with status ${res.status}`,
        };
      }

      const data = await res.json();
      return {
        success: true,
        url: data.url,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Server storage upload fallback connection failed',
      };
    }
  }

  /**
   * Uploads an image attachment for Customer or Admin chat
   * Auto-compresses to modern WebP format with automated server-side fallback
   */
  public async uploadChatAttachment(file: File, conversationId: string): Promise<StorageUploadResult> {
    try {
      // Pre-compress to WebP (max 1200px)
      const compressed = await compressImageToWebP(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.85,
      });

      const cleanFolder = conversationId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const fileName = `${cleanFolder}/${uniqueSuffix}.webp`;

      await this.ensureBucket('chat_attachments', true);

      // Attempt 1: Direct Client Upload
      const { data, error } = await supabase.storage
        .from('chat_attachments')
        .upload(fileName, compressed.file, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/webp',
        });

      if (!error && data?.path) {
        const { data: publicUrlData } = supabase.storage
          .from('chat_attachments')
          .getPublicUrl(data.path);

        return {
          success: true,
          url: publicUrlData.publicUrl,
          name: file.name,
          originalSize: compressed.originalSize,
          compressedSize: compressed.compressedSize,
        };
      }

      // Attempt 2: Server-side Fallback with Service Role auto-bucket creation
      console.warn('[StorageService] Client chat upload failed, activating server fallback:', error?.message);
      const fallbackResult = await this.uploadViaServerFallback(
        compressed.file,
        'chat_attachments',
        fileName,
        'image/webp'
      );

      if (fallbackResult.success && fallbackResult.url) {
        return {
          success: true,
          url: fallbackResult.url,
          name: file.name,
          originalSize: compressed.originalSize,
          compressedSize: compressed.compressedSize,
        };
      }

      return {
        success: false,
        error: fallbackResult.error || error?.message || 'Failed to upload chat attachment',
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
      const compressed = await compressImageToWebP(file, {
        maxWidth: 1400,
        maxHeight: 1400,
        quality: 0.88,
      });

      const cleanUserId = customerId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `receipts/${cleanUserId}_${Date.now()}.webp`;

      await this.ensureBucket('chat_attachments', true);

      // Attempt 1: Direct Client Upload
      const { data, error } = await supabase.storage
        .from('chat_attachments')
        .upload(fileName, compressed.file, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/webp',
        });

      if (!error && data?.path) {
        const { data: publicUrlData } = supabase.storage
          .from('chat_attachments')
          .getPublicUrl(data.path);

        return {
          success: true,
          url: publicUrlData.publicUrl,
          name: file.name,
          originalSize: compressed.originalSize,
          compressedSize: compressed.compressedSize,
        };
      }

      // Attempt 2: Server-side Fallback
      console.warn('[StorageService] Client receipt upload failed, activating server fallback:', error?.message);
      const fallbackResult = await this.uploadViaServerFallback(
        compressed.file,
        'chat_attachments',
        fileName,
        'image/webp',
        customerId
      );

      if (fallbackResult.success && fallbackResult.url) {
        return {
          success: true,
          url: fallbackResult.url,
          name: file.name,
          originalSize: compressed.originalSize,
          compressedSize: compressed.compressedSize,
        };
      }

      return { success: false, error: fallbackResult.error || error?.message || 'Receipt upload failed' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Receipt upload failed' };
    }
  }

  /**
   * Uploads profile picture with on-the-fly WebP compression and transformations
   * Features automatic fallback to service-role endpoint if avatars bucket is missing
   */
  public async uploadAvatar(file: File, userId: string): Promise<StorageUploadResult> {
    try {
      // Pre-compress to square WebP (400x400)
      const compressed = await compressImageToWebP(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.88,
      });

      const cleanUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `${cleanUserId}/avatar_${Date.now()}.webp`;

      await this.ensureBucket('avatars', true);

      let publicUrl: string | null = null;

      // Attempt 1: Direct Client Upload
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, compressed.file, {
          cacheControl: '86400',
          upsert: true,
          contentType: 'image/webp',
        });

      if (!error && data?.path) {
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(data.path);
        publicUrl = urlData.publicUrl;
      } else {
        // Attempt 2: Server-side Fallback with Service Role auto-provisioning
        console.warn('[StorageService] Client avatar upload failed ("Bucket not found" or RLS), activating server fallback:', error?.message);
        const fallbackResult = await this.uploadViaServerFallback(
          compressed.file,
          'avatars',
          fileName,
          'image/webp',
          userId
        );

        if (fallbackResult.success && fallbackResult.url) {
          publicUrl = fallbackResult.url;
        } else {
          return {
            success: false,
            error: fallbackResult.error || error?.message || 'Avatar upload failed',
          };
        }
      }

      return {
        success: true,
        url: publicUrl,
        name: file.name,
        originalSize: compressed.originalSize,
        compressedSize: compressed.compressedSize,
      };
    } catch (err: any) {
      console.error('[StorageService] Avatar upload error:', err);
      return { success: false, error: err?.message || 'Avatar upload failed' };
    }
  }
}

export const storageService = new StorageService();
