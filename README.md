# Bhagvan Realtors — Property Manager

A private "second brain" for a local property dealer in Bengaluru.
Next.js 16 · Supabase · Tailwind + shadcn/ui · deployed on Vercel.

---

## Quick start

```bash
# 1. Install (already done if you're reading this fresh)
npm install

# 2. Set up Supabase — full instructions in SUPABASE_SETUP.md
open SUPABASE_SETUP.md

# 3. Fill .env.local with the values from step 2
cp .env.example .env.local   # then edit

# 4. Run
npm run dev
```

Then open http://localhost:3000 → sign in with the owner user you created in Supabase.

---

## What's built (Phase 1)

- **Auth** — Supabase Auth email/password, middleware-gated app routes, public `/share/[token]` route reserved for Phase 3.
- **Owner scope** — every table has RLS; each dealer sees only their own data. Multi-user ready.
- **Catalogue** — `/properties` lists live properties with filters (deal, category, locality, search). `/properties/parked` archives everything closed.
- **Add Property wizard** — 5-step branching flow: deal type → category+type → typed details form → photos/video → done. Type-specific fields for flats, villas, plots, shops, warehouses, agri land, PG, etc.
- **Photos & video** — direct browser → Supabase Storage via signed URLs (no bytes through our API). Images auto-compressed to WebP; thumbnails generated in-browser; video capped at 40 MB / 60 s.
- **Property detail** — gallery, specs, private owner contact block, status changer (updates dashboard vs archive placement).
- **India-native** — ₹ Lakh/Crore formatting, sq.ft/guntha/cents/ankanam units, A/B/E-Khata fields for plots, Karnataka lease model support, Indian mobile validation.
- **PWA** — installable to home screen (`/manifest.webmanifest` + icons). Offline caching deferred.
- **Brand** — premium monochrome (black & white) light-mode theme. All colour, type and elevation tokens live in `src/app/globals.css`; change them there and the whole app follows.

## What's next

- **Phase 2 — Deal tracking:** sale pipeline (token → agreement → EC/khata/E-Khata → stamp+registration → mutation → brokerage) and rent/lease Live⇄Parked with `tenancy_history` + lease-end reminders.
- **Phase 3 — Location + Sharing:** Ola Maps reverse geocode, draggable pin, selective share composer, `/share/[token]` public page, WhatsApp card + watermark.
- **Phase 4 — AI + Polish:** Gemini title/description (EN/KN), duplicate-GPS warning, voice-to-text, empty-state polish.

---

## Project structure

```
db/migrations/            SQL files, run in Supabase SQL Editor
src/
  app/
    (auth)/login/         public login page
    (app)/                auth-gated app shell (TopBar + BottomNav)
      properties/         catalogue + wizard + detail + parked
      settings/
    api/                  route handlers (JSON only, no file bytes)
    share/[token]/        public share pages (Phase 3)
  components/
    ui/                   shadcn-style primitives (button, input, card, …)
    layout/               TopBar, BottomNav
    property/             PropertyCard, filters, StatusChanger
    wizard/               WizardShell, DetailsForm, MediaUpload
  lib/
    supabase/             browser + server + middleware clients
    storage/              provider abstraction (Supabase now, R2 later)
    media/                image compression + video validation
    format/               ₹ Lakh/Crore, area units, phone
    property/             enums, types shared across pages
    validation/           Zod schemas
  middleware.ts           auth + session refresh
```

## Storage discipline

- Files never touch a Next.js API route body (Vercel's 4.5 MB limit).
- Client compresses photos → asks `/api/upload/sign` → PUTs directly to Supabase Storage.
- `src/lib/storage/` is a small interface. Swap to Cloudflare R2 later by implementing `r2.ts` and flipping `STORAGE_PROVIDER=r2`.

## Archival rule

Every property lives forever in one `properties` table. Closing a deal only flips `status`. Dashboard and archive are two filtered views of the same table. Reactivating a rental just flips status back to `available`. See `db/migrations/001_init.sql` for the full schema.

## Deploy to Vercel

1. Push to a GitHub repo.
2. Import in Vercel → set the same env vars from `.env.local`.
3. Add the Vercel deployment URL to Supabase → Authentication → URL Configuration → Redirect URLs.

## Scripts

```bash
npm run dev     # start dev server
npm run build   # production build
npm run start   # run production build
npm run lint
```
