// File storage on the data volume. Paths are always built from a generated
// stored_name (uuid), never from user input, to avoid path traversal.
import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import { basename, join } from "node:path";
import { config } from "../config.ts";

// Types we render inline in the browser; everything else is download-only.
const PREVIEW_SAFE = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "audio/webm",
  "audio/ogg",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
]);

export function isPreviewSafe(mime: string): boolean {
  return PREVIEW_SAFE.has(mime.split(";")[0]!.trim());
}

// Resolve a stored file to an absolute path inside UPLOAD_DIR. basename()
// strips any directory components so a malicious stored_name cannot escape.
export function resolveStoredPath(storedName: string): string {
  return join(config.UPLOAD_DIR, basename(storedName));
}

export interface SavedFile {
  storedName: string;
  size: number;
}

// Persist an uploaded blob/file to disk under a fresh uuid name.
export async function saveUpload(file: File): Promise<SavedFile> {
  const storedName = randomUUID();
  const path = resolveStoredPath(storedName);
  const bytes = await file.arrayBuffer();
  await Bun.write(path, bytes);
  return { storedName, size: bytes.byteLength };
}

export async function deleteStored(storedName: string): Promise<void> {
  try {
    await unlink(resolveStoredPath(storedName));
  } catch {
    // File already gone; nothing to do.
  }
}
