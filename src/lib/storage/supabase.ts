import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { StorageProvider, SignedUploadTarget } from "./types";

const BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || "property-media";

export function createSupabaseStorage(): StorageProvider {
  return {
    async createSignedUpload({ userId, propertyId, filename, contentType }): Promise<SignedUploadTarget> {
      const sb = createSupabaseServiceClient();
      const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const stamp = Date.now();
      const path = `${userId}/${propertyId}/${stamp}-${safe}`;

      const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(path);
      if (error || !data) throw new Error(error?.message ?? "Failed to create signed upload URL");

      const publicUrl = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

      return {
        path,
        uploadUrl: data.signedUrl,
        token: data.token,
        publicUrl,
      };
    },

    getPublicUrl(path: string): string {
      const sb = createSupabaseServiceClient();
      return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    },

    async remove(path: string): Promise<void> {
      const sb = createSupabaseServiceClient();
      const { error } = await sb.storage.from(BUCKET).remove([path]);
      if (error) throw new Error(error.message);
    },

    async removePrefix(prefix: string): Promise<number> {
      const sb = createSupabaseServiceClient();
      const clean = prefix.replace(/\/+$/, "");

      // Supabase Storage has no recursive delete — walk the tree and collect
      // every object path first, then remove them in batches.
      const paths: string[] = [];
      const walk = async (dir: string): Promise<void> => {
        const PAGE = 100;
        let offset = 0;
        for (;;) {
          const { data, error } = await sb.storage
            .from(BUCKET)
            .list(dir, { limit: PAGE, offset });
          if (error) throw new Error(error.message);
          if (!data || data.length === 0) return;

          for (const entry of data) {
            const full = `${dir}/${entry.name}`;
            // Folders come back with a null id and no metadata.
            if (entry.id === null) await walk(full);
            else paths.push(full);
          }

          if (data.length < PAGE) return;
          offset += PAGE;
        }
      };
      await walk(clean);

      const CHUNK = 100;
      for (let i = 0; i < paths.length; i += CHUNK) {
        const { error } = await sb.storage.from(BUCKET).remove(paths.slice(i, i + CHUNK));
        if (error) throw new Error(error.message);
      }
      return paths.length;
    },
  };
}
