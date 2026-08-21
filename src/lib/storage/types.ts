export type SignedUploadTarget = {
  /** Path inside bucket (we store this in property_media.storage_path). */
  path: string;
  /** Signed URL the browser will PUT the file to. */
  uploadUrl: string;
  /** Token or extra fields the browser must include. */
  token?: string;
  /** Public URL for reading the file after upload. */
  publicUrl: string;
};

export interface StorageProvider {
  /** Create a short-lived signed upload URL. */
  createSignedUpload(args: {
    userId: string;
    propertyId: string;
    filename: string;
    contentType: string;
  }): Promise<SignedUploadTarget>;

  /** Public URL for a stored path. */
  getPublicUrl(path: string): string;

  /** Remove a file. */
  remove(path: string): Promise<void>;

  /**
   * Remove every object under a folder prefix, recursively.
   * Property photos, thumbnails, videos and deal-document scans all live under
   * `{ownerId}/{propertyId}/`, so one sweep clears a listing completely.
   * Returns how many objects were deleted.
   */
  removePrefix(prefix: string): Promise<number>;
}
