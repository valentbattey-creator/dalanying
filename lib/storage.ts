"use client";

import { supabase, hasSupabase } from "./supabase";

const BUCKET_NAME = "post-images";
const MAX_FILES = 9;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Upload a single file to Supabase Storage post-images bucket.
 * Returns the public URL on success.
 */
async function uploadFile(file: File): Promise<UploadResult> {
  if (!hasSupabase || !supabase) {
    // Fallback: create a local object URL (won't persist but works for preview)
    return { url: URL.createObjectURL(file), path: file.name };
  }

  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const filePath = `${fileName}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw new Error(`上传失败: ${error.message}`);

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return { url: urlData.publicUrl, path: filePath };
}

/**
 * Upload multiple files. Returns array of public URLs.
 */
export async function uploadImages(files: File[]): Promise<string[]> {
  if (files.length === 0) return [];
  if (files.length > MAX_FILES) throw new Error(`最多只能上传 ${MAX_FILES} 张图片`);

  const results: UploadResult[] = [];
  const errors: string[] = [];

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`${file.name} 超过 10MB 限制`);
      continue;
    }
    if (!file.type.startsWith("image/")) {
      errors.push(`${file.name} 不是图片文件`);
      continue;
    }
    try {
      const result = await uploadFile(file);
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

export { MAX_FILES, MAX_FILE_SIZE };
