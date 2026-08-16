import { supabase, isSupabaseConfigured } from './supabase';
import { MessageType } from '../types';

export const CHAT_STORAGE_BUCKET = 'chat-attachments';
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_FILE_SIZE_MB = 50;

// Disallowed executable/dangerous extensions
export const DANGEROUS_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'vbs', 'msi', 'com', 'scr', 'pif', 'apk', 'jar', 'bin', 'dll', 'sys', 'iso'
]);

// Allowed Image Extensions & MIME Types
export const IMAGE_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'heic', 'tiff', 'ico'
]);

// Allowed Video Extensions & MIME Types
export const VIDEO_EXTENSIONS = new Set([
  'mp4', 'webm', 'ogg', 'mov', 'mkv', 'avi', 'm4v'
]);

// Allowed Document Extensions
export const DOCUMENT_EXTENSIONS = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'rtf', 'odt', 'ods', 'odp',
  'zip', 'rar', '7z', 'tar', 'gz', 'json', 'xml', 'md'
]);

/**
 * Format bytes into human readable string (e.g. "2.4 MB")
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Determine file category (image, video, pdf, document, file) from File object
 */
export function getFileCategory(file: File): MessageType {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const mime = (file.type || '').toLowerCase();

  if (mime.startsWith('image/') || IMAGE_EXTENSIONS.has(ext)) {
    return 'image';
  }
  if (mime.startsWith('video/') || VIDEO_EXTENSIONS.has(ext)) {
    return 'video';
  }
  if (mime === 'application/pdf' || ext === 'pdf') {
    return 'pdf';
  }
  if (
    DOCUMENT_EXTENSIONS.has(ext) ||
    mime.includes('word') ||
    mime.includes('excel') ||
    mime.includes('powerpoint') ||
    mime.includes('sheet') ||
    mime.includes('presentation') ||
    mime.includes('text') ||
    mime.includes('zip') ||
    mime.includes('compressed')
  ) {
    return 'document';
  }
  return 'file';
}

export interface FileValidationResult {
  valid: boolean;
  category: MessageType;
  humanSize: string;
  error?: string;
}

/**
 * Validate file before attempting upload
 */
export function validateMediaFile(file: File): FileValidationResult {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const humanSize = formatBytes(file.size);
  const category = getFileCategory(file);

  // 1. Check for executable/dangerous files
  if (DANGEROUS_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      category: 'file',
      humanSize,
      error: `Executable and script files (.${ext}) are not allowed for security reasons.`,
    };
  }

  // 2. Check maximum size (50 MB)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      category,
      humanSize,
      error: `File "${file.name}" is too large (${humanSize}). Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`,
    };
  }

  // 3. Check for empty files
  if (file.size === 0) {
    return {
      valid: false,
      category,
      humanSize,
      error: `File "${file.name}" is empty (0 bytes).`,
    };
  }

  return {
    valid: true,
    category,
    humanSize,
  };
}

export interface UploadOptions {
  conversationId: string;
  userId: string;
  file: File;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

export interface UploadResult {
  fileUrl: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  category: MessageType;
}

/**
 * Upload media file to Supabase Storage `chat-attachments` bucket.
 * If Supabase is offline/mock, creates a Blob URL with smooth progress simulation.
 */
export async function uploadMediaFile({
  conversationId,
  userId,
  file,
  onProgress,
  signal,
}: UploadOptions): Promise<UploadResult> {
  const validation = validateMediaFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid file');
  }

  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const cleanBaseName = file.name
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 40);
  const timestamp = Date.now();
  const storageFilePath = `${conversationId}/${userId}/${timestamp}_${cleanBaseName}.${ext}`;

  if (!isSupabaseConfigured()) {
    // Mock / Local Fallback with progress simulation
    for (let p = 10; p <= 100; p += 20) {
      if (signal?.aborted) {
        throw new DOMException('Upload was cancelled by user', 'AbortError');
      }
      onProgress?.(p);
      await new Promise((res) => setTimeout(res, 60));
    }

    const objectUrl = URL.createObjectURL(file);
    return {
      fileUrl: objectUrl,
      filePath: storageFilePath,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || `application/${ext}`,
      category: validation.category,
    };
  }

  try {
    // Check if aborted prior to start
    if (signal?.aborted) {
      throw new DOMException('Upload was cancelled by user', 'AbortError');
    }

    onProgress?.(15);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(CHAT_STORAGE_BUCKET)
      .upload(storageFilePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.warn('Supabase storage upload error:', uploadError.message);
      // If bucket does not exist or permissions error, throw a clear actionable error for the user
      if (uploadError.message.toLowerCase().includes('bucket not found')) {
        throw new Error(
          'Supabase storage bucket "chat-attachments" has not been created yet in your Supabase project. Please create the "chat-attachments" bucket in your Supabase Dashboard under Storage.'
        );
      }
      throw new Error(uploadError.message || 'Failed to upload file to storage');
    }

    onProgress?.(80);

    if (signal?.aborted) {
      // User aborted after upload started: clean up uploaded file from storage
      await supabase.storage.from(CHAT_STORAGE_BUCKET).remove([storageFilePath]).catch(() => {});
      throw new DOMException('Upload was cancelled by user', 'AbortError');
    }

    // Generate secure Signed URL with 1-year expiration (or public URL fallback)
    let finalUrl = '';
    const { data: signedData, error: signedError } = await supabase.storage
      .from(CHAT_STORAGE_BUCKET)
      .createSignedUrl(storageFilePath, 60 * 60 * 24 * 365); // 1 year signed URL

    if (!signedError && signedData?.signedUrl) {
      finalUrl = signedData.signedUrl;
    } else {
      const { data: publicData } = supabase.storage
        .from(CHAT_STORAGE_BUCKET)
        .getPublicUrl(storageFilePath);
      finalUrl = publicData?.publicUrl || URL.createObjectURL(file);
    }

    onProgress?.(100);

    return {
      fileUrl: finalUrl,
      filePath: uploadData?.path || storageFilePath,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || `application/${ext}`,
      category: validation.category,
    };
  } catch (err: any) {
    if (err.name === 'AbortError' || signal?.aborted) {
      throw new DOMException('Upload cancelled', 'AbortError');
    }
    console.error('Storage upload failed:', err);
    throw err;
  }
}

/**
 * Trigger browser download for a media file safely without breaking iframe context
 */
export async function downloadMediaFile(url: string, fileName: string): Promise<void> {
  try {
    // If it's a blob/object URL or data URL
    if (url.startsWith('blob:') || url.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // Try fetching as blob to enforce original filename
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error('Fetch failed');
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } catch {
    // Fallback: direct anchor with target="_blank"
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'download';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

/**
 * Upload a user profile picture to Supabase Storage and return its public URL
 */
export async function uploadAvatarFile(userId: string, file: File): Promise<string> {
  const validation = validateMediaFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid image file');
  }
  if (validation.category !== 'image') {
    throw new Error('Please select an image file (PNG, JPG, WebP, GIF, SVG)');
  }

  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const storageFilePath = `avatars/${userId}/avatar_${Date.now()}.${ext}`;

  if (!isSupabaseConfigured()) {
    return URL.createObjectURL(file);
  }

  const { error: uploadError } = await supabase.storage
    .from(CHAT_STORAGE_BUCKET)
    .upload(storageFilePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    console.warn('Avatar upload error:', uploadError.message);
    if (uploadError.message.toLowerCase().includes('bucket not found')) {
      throw new Error(
        'Supabase storage bucket "chat-attachments" does not exist yet. Please create it in Supabase Storage.'
      );
    }
    throw new Error(uploadError.message || 'Failed to upload profile picture');
  }

  const { data: publicData } = supabase.storage
    .from(CHAT_STORAGE_BUCKET)
    .getPublicUrl(storageFilePath);

  return publicData?.publicUrl || URL.createObjectURL(file);
}

