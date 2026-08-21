"use client";

import imageCompression from "browser-image-compression";
import { MEDIA_LIMITS } from "./limits";

export async function compressImage(file: File): Promise<File> {
  if (!(MEDIA_LIMITS.image.accept as readonly string[]).includes(file.type)) {
    throw new Error(`Unsupported image type: ${file.type}`);
  }
  if (file.size > MEDIA_LIMITS.image.maxBytes) {
    throw new Error(`Image too large (max ${MEDIA_LIMITS.image.maxBytes / 1024 / 1024} MB)`);
  }
  const compressed = await imageCompression(file, {
    maxSizeMB: MEDIA_LIMITS.image.maxCompressedBytes / 1024 / 1024,
    maxWidthOrHeight: MEDIA_LIMITS.image.maxWidth,
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: 0.82,
  });
  return new File([compressed], swapExt(file.name, ".webp"), { type: "image/webp" });
}

export async function makeThumbnail(file: File): Promise<File> {
  const thumb = await imageCompression(file, {
    maxSizeMB: 0.08,
    maxWidthOrHeight: 480,
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: 0.7,
  });
  return new File([thumb], swapExt("thumb-" + file.name, ".webp"), { type: "image/webp" });
}

export async function validateVideo(file: File): Promise<void> {
  if (!(MEDIA_LIMITS.video.accept as readonly string[]).includes(file.type)) {
    throw new Error(`Unsupported video type: ${file.type}`);
  }
  if (file.size > MEDIA_LIMITS.video.maxBytes) {
    throw new Error(`Video too large. Max ${MEDIA_LIMITS.video.maxBytes / 1024 / 1024} MB.`);
  }
  const duration = await readVideoDuration(file);
  if (duration > MEDIA_LIMITS.video.maxDurationSec) {
    throw new Error(`Video too long. Max ${MEDIA_LIMITS.video.maxDurationSec} seconds.`);
  }
}

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(v.src);
      resolve(v.duration);
    };
    v.onerror = () => reject(new Error("Could not read video metadata"));
    v.src = URL.createObjectURL(file);
  });
}

function swapExt(name: string, ext: string) {
  return name.replace(/\.[^.]+$/, "") + ext;
}
