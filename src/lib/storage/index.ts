import type { StorageProvider } from "./types";
import { createSupabaseStorage } from "./supabase";

/**
 * Provider factory. To add R2 later: implement ./r2.ts and add a branch here.
 */
export function getStorage(): StorageProvider {
  const provider = (process.env.STORAGE_PROVIDER || "supabase").toLowerCase();
  switch (provider) {
    case "supabase":
      return createSupabaseStorage();
    // case "r2":
    //   return createR2Storage();
    default:
      throw new Error(`Unknown STORAGE_PROVIDER: ${provider}`);
  }
}

export type { StorageProvider, SignedUploadTarget } from "./types";
