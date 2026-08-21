# Supabase setup — do this once

Follow these steps in order. Everything else in the app assumes this is done.

## 1. Create the Supabase project
1. Go to https://supabase.com → **New project**.
2. Pick a region near India (Singapore `ap-southeast-1` or Mumbai if listed).
3. Set a strong DB password and save it.
4. Wait ~2 minutes for provisioning.

## 2. Copy your API keys into `.env.local`
Project → **Settings → API**:

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` (secret) → `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ Never expose the `service_role` key to the browser. It only runs on the server.

## 3. Run the SQL migrations
Project → **SQL Editor → New query**. Paste and Run each file **in order**:

1. `db/migrations/001_init.sql` — tables, indexes, triggers
2. `db/migrations/002_rls.sql` — row-level security policies
3. `db/migrations/003_storage.sql` — storage object policies (run **after** step 4 below creates the bucket)

## 4. Create the Storage bucket
Project → **Storage → New bucket**:

- Name: `property-media`
- **Public bucket:** ✅ ON (needed so shared listings can render photos without signed URLs)
- File size limit: `50 MB`
- Allowed MIME types: leave empty (we validate on upload)

Now go back and run `003_storage.sql` from step 3.

## 5. Create the owner user
Project → **Authentication → Users → Add user → Create new user**:

- Email: (dealer's email)
- Password: (set one)
- **Auto Confirm User:** ✅ ON

The `handle_new_user` trigger will auto-create a row in `public.profiles`.

Later you can flip email confirmation back on in **Authentication → Providers → Email**.

## 6. (Optional) Set the profile brand fields
In **Table Editor → profiles**, open the new row and set:
- `full_name`
- `phone`
- `brand_name` — shown on shared listings (e.g. "Bhagvan Realtors")
- `brand_phone` — the ONLY contact number that ever appears on shared links

## 7. Start the app
```bash
npm run dev
```
Visit http://localhost:3000 → log in with the email/password from step 5.

---

## Later: swap storage to Cloudflare R2
Everything file-related goes through `src/lib/storage/`. To switch:
1. Create an R2 bucket + API token.
2. Add `R2_*` env vars.
3. Implement `src/lib/storage/r2.ts` (mirrors `supabase.ts`).
4. Flip `STORAGE_PROVIDER=r2` in env. No other code changes.
