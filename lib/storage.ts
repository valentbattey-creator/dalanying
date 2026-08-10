"use client";

import { supabase, hasSupabase } from "./supabase";

const BUCKET_NAME = "post-images";
const MAX_FILES = 9;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Image compression settings
const COMPRESS_MAX_DIMENSION = 1920;  // max width or height in px
const COMPRESS_TARGET_SIZE = 500 * 1024;  // target ~500KB
const COMPRESS_QUALITY_START = 0.85;
const COMPRESS_QUALITY_MIN = 0.4;

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Upload a single file to Supabase Storage post-images bucket.
 * Returns the public URL on success.
 */
async function uploadFile(file: File): Promise<UploadResult> {
  // Use API route with service role key for reliable upload
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "posts");
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const data = await res.json();
  if (data.url) return { url: data.url, path: data.path || file.name };
  throw new Error(data.error || "上传失败");
}

/**
 * Upload multiple files. Returns array of public URLs.
 */
export async function uploadImages(files: File[]): Promise<string[]> {
  if (files.length === 0) return [];
  if (files.length > MAX_FILES) throw new Error(`最多只能上传 ${MAX_FILES} 张图片`);

  const results: UploadResult[] = [];
  const errors: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`${file.name} 超过 10MB 限制`);
      continue;
    }
    if (!file.type.startsWith("image/")) {
      errors.push(`${file.name} 不是图片文件`);
      continue;
    }
    try {
      // Compress before upload
      const compressed = await compressImage(file);
      const result = await uploadFile(compressed);
      results.push(result);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "未知错误";
      errors.push(`${file.name}: ${msg}`);
    }
  }

  if (errors.length > 0 && results.length === 0) {
    throw new Error(errors.join("; "));
  }

  return results.map((r) => r.url);
}

/**
 * Validate a file before upload: type + size check.
 */
export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "只支持图片文件";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "图片不能超过 10MB";
  }
  return null;
}


/**
 * Compress an image file using Canvas API.
 * - Resizes to max 1920px on longest side
 * - Iteratively reduces quality to hit ~500KB target
 * - Returns compressed File (or original if already small enough)
 */
export async function compressImage(file: File): Promise<File> {
  // Skip non-images and already-small files
  if (!file.type.startsWith("image/")) return file;
  if (file.size <= COMPRESS_TARGET_SIZE) return file;
  // Skip GIFs (animated)
  if (file.type === "image/gif") return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(url);

      // Calculate new dimensions
      let { width, height } = img;
      if (width > COMPRESS_MAX_DIMENSION || height > COMPRESS_MAX_DIMENSION) {
        const ratio = Math.min(COMPRESS_MAX_DIMENSION / width, COMPRESS_MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // Draw to canvas
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);

      // Determine output type: keep PNG for transparency, else JPEG for smaller size
      const useJpeg = file.type !== "image/png";
      const mimeType = useJpeg ? "image/jpeg" : "image/png";

      // Helper: canvas.toBlob as Promise
      const toBlobAsync = (q: number): Promise<Blob | null> =>
        new Promise((r) => canvas.toBlob(r, mimeType, q));

      let quality = COMPRESS_QUALITY_START;
      let blob: Blob | null = null;

      if (useJpeg) {
        // Iteratively reduce quality to hit target size
        while (quality >= COMPRESS_QUALITY_MIN) {
          blob = await toBlobAsync(quality);
          if (blob && blob.size <= COMPRESS_TARGET_SIZE) break;
          quality -= 0.1;
        }
      }

      // Final fallback blob
      if (!blob) {
        blob = await toBlobAsync(quality);
      }

      if (!blob || blob.size >= file.size) {
        resolve(file);
        return;
      }

      const ext = useJpeg ? "jpg" : "png";
      const compressed = new File([blob], file.name.replace(/\.[^.]+$/, `.${ext}`), {
        type: mimeType,
        lastModified: Date.now(),
      });
      resolve(compressed);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // fallback to original on error
    };

    img.src = url;
  });
}

export { MAX_FILES, MAX_FILE_SIZE };
