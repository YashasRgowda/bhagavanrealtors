/**
 * ⚠️  DESTRUCTIVE — deletes EVERY file in the property-media bucket.
 *
 * Photos, thumbnails, videos and deal document attachments all live in
 * Supabase Storage, not in Postgres. Emptying the database does NOT remove
 * them — they stay, keep costing storage, and stay reachable by URL because
 * the bucket is public. This script removes them properly through the Storage
 * API (deleting rows from `storage.objects` by hand does not reclaim the
 * underlying files, which is why we don't do it in SQL).
 *
 * USAGE — from the project root:
 *
 *     # 1. Dry run first. Lists what WOULD be deleted, deletes nothing.
 *     node --env-file=.env.local db/scripts/wipe-storage.mjs
 *
 *     # 2. Only when the list looks right:
 *     node --env-file=.env.local db/scripts/wipe-storage.mjs --yes
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in
 * .env.local. The service-role key bypasses RLS — never ship this to a
 * browser, and never commit the key.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || "property-media";
const CONFIRMED = process.argv.includes("--yes");

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "✗ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "  Run with:  node --env-file=.env.local db/scripts/wipe-storage.mjs",
  );
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

/** Walk the bucket depth-first and collect every file path. */
async function listAllFiles(prefix = "") {
  const files = [];
  const PAGE = 100;
  let offset = 0;

  for (;;) {
    const { data, error } = await sb.storage
      .from(BUCKET)
      .list(prefix, { limit: PAGE, offset, sortBy: { column: "name", order: "asc" } });

    if (error) throw new Error(`list("${prefix}") failed: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      // Supabase returns folders as entries with a null id and no metadata.
      if (entry.id === null) {
        files.push(...(await listAllFiles(path)));
      } else {
        files.push({ path, bytes: entry.metadata?.size ?? 0 });
      }
    }

    if (data.length < PAGE) break;
    offset += PAGE;
  }

  return files;
}

function humanBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 ** 2).toFixed(1)} MB`;
}

const host = new URL(SUPABASE_URL).host;
console.log(`\nProject : ${host}`);
console.log(`Bucket  : ${BUCKET}\n`);

const files = await listAllFiles();

if (files.length === 0) {
  console.log("Bucket is already empty. Nothing to do.\n");
  process.exit(0);
}

const total = files.reduce((sum, f) => sum + f.bytes, 0);
for (const f of files) console.log(`  ${f.path}  (${humanBytes(f.bytes)})`);
console.log(`\n${files.length} file(s), ${humanBytes(total)} total.`);

if (!CONFIRMED) {
  console.log(
    "\nDRY RUN — nothing was deleted.\n" +
      "Re-run with --yes to permanently delete every file listed above.\n",
  );
  process.exit(0);
}

// Delete in chunks; the API caps how many paths one call accepts.
const CHUNK = 100;
let deleted = 0;
for (let i = 0; i < files.length; i += CHUNK) {
  const batch = files.slice(i, i + CHUNK).map(f => f.path);
  const { error } = await sb.storage.from(BUCKET).remove(batch);
  if (error) {
    console.error(`\n✗ Failed deleting batch starting at ${i}: ${error.message}`);
    process.exit(1);
  }
  deleted += batch.length;
  console.log(`  deleted ${deleted}/${files.length}…`);
}

const leftover = await listAllFiles();
console.log(
  leftover.length === 0
    ? `\n✓ Done. Deleted ${deleted} file(s). Bucket is empty.\n`
    : `\n⚠ Deleted ${deleted}, but ${leftover.length} file(s) remain. Re-run to retry.\n`,
);
