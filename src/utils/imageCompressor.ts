/**
 * Client-Side Canvas WebP Image Scaler & Compressor
 * Shrinks heavy mobile photos (5MB-15MB) to optimal WebP files (~30KB-90KB)
 * prior to uploading to Supabase Storage.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'image/webp' | 'image/jpeg' | 'image/png';
}

export async function compressImageToWebP(
  file: File,
  options: CompressionOptions = {}
): Promise<{ file: File; width: number; height: number; originalSize: number; compressedSize: number }> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.85,
    format = 'image/webp',
  } = options;

  // If the file is not an image or SVG/GIF, return as is
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return {
      file,
      width: 0,
      height: 0,
      originalSize: file.size,
      compressedSize: file.size,
    };
  }

  return new Promise((resolve) => {
    const originalSize = file.size;
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let targetWidth = img.width;
      let targetHeight = img.height;

      // Maintain aspect ratio while bounding within maxWidth / maxHeight
      if (targetWidth > maxWidth || targetHeight > maxHeight) {
        const ratio = Math.min(maxWidth / targetWidth, maxHeight / targetHeight);
        targetWidth = Math.round(targetWidth * ratio);
        targetHeight = Math.round(targetHeight * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve({ file, width: img.width, height: img.height, originalSize, compressedSize: originalSize });
        return;
      }

      // Smooth scaling interpolation
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // Check if browser supports WebP canvas export
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve({ file, width: targetWidth, height: targetHeight, originalSize, compressedSize: originalSize });
            return;
          }

          // Build clean filename with .webp extension
          const originalBaseName = file.name.replace(/\.[^/.]+$/, '');
          const newName = `${originalBaseName}.webp`;

          const compressedFile = new File([blob], newName, {
            type: format,
            lastModified: Date.now(),
          });

          resolve({
            file: compressedFile,
            width: targetWidth,
            height: targetHeight,
            originalSize,
            compressedSize: compressedFile.size,
          });
        },
        format,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ file, width: 0, height: 0, originalSize, compressedSize: originalSize });
    };

    img.src = objectUrl;
  });
}
