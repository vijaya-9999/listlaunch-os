# ListLaunch OS — Week 2

Shared pre-list board that sequences **repairs → clean → stage → photo → MLS QA → go-live**, so the photographer never shows up to a dirty house.

**Week 2 dogfood build** for Vijaya (realtor-founder). Runs fully offline with SQLite — no Stripe, Twilio, or email provider required. Free public deploy: **Vercel + Neon Postgres**.

## Quick start

```bash
cd /workspace/listlaunch-os
cp .env.example .env   # edit SESSION_SECRET if you like
npm install
npm run db:setup    # prisma db push + seed demo user + template + vendors + launch
npm run dev         # http://localhost:3000
```

**Demo login:** `vijaya@listlaunch.local` / `demo1234`

## Environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | yes | Local: `file:./prisma/dev.db`. Production: Neon Postgres connection string |
| `SESSION_SECRET` | yes in prod | HMAC cookie signing. Generate: `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | recommended | Public origin, no trailing slash (e.g. `https://your-app.vercel.app`) |

`VERCEL=1` is set automatically by Vercel. When present, seller photos are stored as data URLs on `Task.photoUrl` (max ~1.5MB) instead of writing under `public/uploads/` (ephemeral FS).

## Deploy (Vercel + Neon — free tier)

Docker is not required. Local keeps **SQLite** (`prisma/schema.prisma`). Production uses **`prisma/schema.postgres.prisma`**.

1. **Create a Neon free database**
   - https://console.neon.tech → New project
   - Copy the Postgres connection string (`postgresql://…?sslmode=require`)

2. **Push this repo to GitHub** (do not commit `.env`)

3. **Import on Vercel**
   - https://vercel.com/new → Import the GitHub repo
   - Framework: Next.js (auto-detected)
   - Build Command is set via `vercel.json` → `npm run build:vercel`  
     (runs `prisma generate` + `prisma db push` against the Postgres schema, then `next build`)

4. **Set environment variables** on the Vercel project (Settings → Environment Variables), for Production (and Preview if you want):

   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | Neon connection string |
   | `SESSION_SECRET` | output of `openssl rand -hex 32` |
   | `NEXT_PUBLIC_APP_URL` | `https://<your-vercel-domain>` |

5. **Deploy** — Vercel build will generate the Prisma client for Postgres and push the schema.

6. **Seed once** (optional demo data) from your machine:

   ```bash
   # Temporarily point at Neon and generate the Postgres client
   export DATABASE_URL="postgresql://…"   # Neon URL
   npm run db:generate:prod
   npm run db:seed
   # Restore local SQLite client afterward:
   npx prisma generate
   ```

7. Open the Vercel URL → log in with the seeded demo user, or register a new account.

### Local vs production database

| | Local | Production |
|--|-------|------------|
| Schema file | `prisma/schema.prisma` | `prisma/schema.postgres.prisma` |
| Provider | SQLite | PostgreSQL (Neon) |
| Push | `npm run db:push` | `npm run db:push:prod` (needs `DATABASE_URL` → Postgres) |
| Photos | `public/uploads/` | data URL on `Task.photoUrl` when `VERCEL=1` |

Keep both schema files in sync when you change models.

## What Week 2 adds (on top of Week 1 + SOP editor)

1. **Vendor directory** — `/vendors` CRUD (name, role, phone, email, notes). Roles: cleaner / stager / handyman / photographer / landscaper / other. Linked from nav. **Bulk import** via CSV / Excel (preview + skip duplicates); downloadable template on the page.
2. **Schedule job** — on a Launch board: pick vendor, datetime, access notes, optional link to a board task. Persists `VendorJob`. Jobs listed on the board.
3. **Confirm link** (no Twilio yet) — each job gets a public token URL (`/confirm/[token]`). Vendor taps **Confirm** or **Decline**; `confirm_status` is logged. Copyable URL in the UI for dogfood (console also logs the path).
4. **Seller portal** — magic-link token per Launch (`/seller/[token]`). Lists seller-owned tasks only; seller can mark **Done** and optionally upload a photo (local disk or data URL on Vercel). Agent can copy / regenerate the link from the board.
5. **Photo-day packet** — `/launches/[id]/photo-packet` printable page: address, access notes, scheduled photographer job, open Photo Day gate tasks.

## What Week 1 still includes

- Auth (email/password + signed cookie), Launch CRUD, customizable SOP template, board UI, Photo Day / Live locks, Settings SOP editor, seed demo launch.

## How to dogfood Week 2

1. Log in as the demo user.
2. Open **Vendors** — seed includes Bright Clean Co., Lens & Light Photo, Austin Stage Studio, FixIt Frank. Add more one-by-one, or use **Import vendors** (download CSV template, upload `.csv` / `.xlsx`, preview, then commit). Duplicates (same name+phone) are skipped with a summary.
3. Open the demo launch board — a sample photographer job is already scheduled.
4. **Copy confirm URL** → open in a private window → Confirm or Decline.
5. **Copy seller portal link** → open → mark “Declutter / storage haul” done (optionally with a photo).
6. Open **Photo-day packet** from the board (or `/launches/<id>/photo-packet`) → Print / share.

Screenshots: `docs/screenshots/week2/`.

## What’s deferred

| Item | When |
|------|------|
| Twilio SMS confirm + day-before photo SMS | Week 3 |
| Email send (Resend/Postmark) for confirm / seller / overdue | Week 2–3 (console/log only for now) |
| Ready-for-MLS gate polish + go-live checklist | Week 3 |
| Stripe billing + coordinator invite | Week 4 |
| Object storage for large seller photos | Later (data URLs capped at ~1.5MB on Vercel) |
| “Apply template to open launches” | Optional later |

## Stack

| Layer | Choice |
|-------|--------|
| App | Next.js 15 App Router + TypeScript + Tailwind v4 |
| DB local | Prisma 5 + SQLite (`prisma/dev.db`) |
| DB prod | Prisma 5 + Neon Postgres (`schema.postgres.prisma`) |
| Auth | Local email/password + HMAC-signed cookie (`SESSION_SECRET`) |
| Uploads | Local files under `public/uploads/`; data URLs on Vercel |
| Hosting | Vercel (free) |

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server on :3000 |
| `npm run build` | `prisma generate` (SQLite) + `next build` |
| `npm run build:vercel` | Postgres generate + db push + `next build` (Vercel) |
| `npm run start` | Production server |
| `npm run db:push` | Sync SQLite schema |
| `npm run db:push:prod` | Sync Postgres schema (needs Postgres `DATABASE_URL`) |
| `npm run db:generate:prod` | Generate Prisma client from Postgres schema |
| `npm run db:seed` | Seed demo user + template + vendors + launch |
| `npm run db:setup` | push + seed (local SQLite) |
| `postinstall` | `prisma generate` (SQLite schema) |

## Project layout

```
src/lib/vendors.ts                 Role constants
src/lib/tokens.ts                  Public magic-link tokens
src/app/vendors/                   Vendor directory UI
src/app/confirm/[token]/          Public vendor Confirm / Decline
src/app/seller/[token]/           Public seller checklist portal
src/app/launches/[id]/photo-packet/  Printable photo-day packet
src/app/api/vendors/               Vendor CRUD
src/app/api/vendors/import/        Bulk import (JSON rows)
src/lib/vendor-import.ts           CSV/Excel parse + header aliases
src/components/VendorImport.tsx    Import UI (template, preview, summary)
public/vendor-import-template.csv  Sample CSV template
src/app/api/launches/[id]/jobs/   Schedule jobs
src/app/api/jobs/[id]/            Update / delete / regenerate confirm token
src/app/api/confirm/[token]/      Public confirm API
src/app/api/launches/[id]/seller-portal/  Get / regenerate portal token
src/app/api/seller/[token]/      Seller portal API + photo upload
src/components/LaunchJobsPanel.tsx Board jobs + seller link UI
prisma/schema.prisma               SQLite (local)
prisma/schema.postgres.prisma      PostgreSQL (Neon / Vercel)
vercel.json                        buildCommand → npm run build:vercel
```

## Blockers / notes

- None for Week 2 local dogfood.
- SMS and outbound email are intentionally not wired — copy URLs from the board.
- Set a strong `SESSION_SECRET` before any real deploy (never use the `.env.example` sample in production).
