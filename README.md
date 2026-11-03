# Dench

A Strong-style workout logger that installs to your iPhone home screen. Frosted glass panels sit over slow-moving gradient light, and the colour changes with the session type.

SvelteKit 3 · Svelte 5 · Tailwind 4 · Prisma 7 · Neon · Better Auth · Vercel · offline-first PWA

## Status

**Phase 1 (Foundation)** is built: the schema and migrations, an ~850-exercise library seed, email/Google/Apple sign-in, the app shell with a tab bar, the "Gradient glass" design tokens, the manifest and the service worker.

Phase 2 (core logging), Phase 3 (progress) and Phase 4 (polish) are still to come.

## Setup

1. **Link to Vercel and add Neon.** In the Vercel project, open _Storage → Connect Database → Neon_. This sets `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct) for every environment.
2. **Add the auth env vars** in Vercel: `BETTER_AUTH_SECRET` (`openssl rand -base64 32`) and `BETTER_AUTH_URL` (your production URL). Google and Apple credentials are optional. If you leave them out, their buttons are hidden.
3. **Develop locally:**
   ```sh
   vercel env pull .env   # or copy .env.example → .env and fill it in
   npm install            # also runs prisma generate
   npm run db:deploy      # apply migrations
   npm run db:seed        # load the exercise library (idempotent)
   npm run dev
   ```

On Vercel, `vercel-build` runs `prisma migrate deploy` and the seed before `vite build`, so each deploy migrates its own database branch.

## Scripts

| Script               | What it does                                      |
| -------------------- | ------------------------------------------------- |
| `npm run dev`        | Dev server                                        |
| `npm run check`      | Type-check                                        |
| `npm run lint`       | Prettier and ESLint                               |
| `npm run db:migrate` | Create a new migration after editing the schema   |
| `npm run db:deploy`  | Apply pending migrations                          |
| `npm run db:seed`    | Seed the global exercise library                  |
| `npm run db:studio`  | Prisma Studio                                     |

## Layout

```
prisma/
  schema.prisma          auth + profile, exercises, templates, workouts, PRs, measurements
  exercises.ts           exercise library data (movement × equipment)
  seed.ts
src/
  env.ts                 typed env vars ($app/env/private)
  hooks.server.ts        Better Auth handler + route guard
  service-worker/        app-shell precache, offline fallback, library cache
  lib/server/            db (Prisma + Neon adapter), auth, queries
  lib/components/        Mesh, TabBar, AuthForm, ScreenHeader
  routes/(auth)/         sign-in, sign-up
  routes/(app)/          Home, History, Exercises, Profile
  routes/api/exercises   library JSON (cached offline)
  routes/offline         prerendered offline fallback
```
