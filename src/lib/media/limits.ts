export const MEDIA_LIMITS = {
  image: {
    maxBytes: 15 * 1024 * 1024,          // 15 MB before compression
    maxCompressedBytes: 2 * 1024 * 1024, // 2 MB after compression
    maxWidth: 1600,
    accept: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
  },
  video: {
    maxBytes: 40 * 1024 * 1024,          // 40 MB hard cap (per project brief)
    maxDurationSec: 60,                  // 60 s hard cap
    accept: ["video/mp4", "video/quicktime", "video/webm"],
  },
} as const;

export function humanBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
