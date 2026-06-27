# ACW Spikeball Turnier-App

Roundnet/Spikeball tournament manager — Nuxt 4 + Tailwind CSS 4 + PostgreSQL (Drizzle ORM).

## Features

- Random 2-player team draw (Fisher-Yates) with odd-player handling (3-player team or substitute)
- Group phase (Round Robin pools) with live standings
- Single-elimination KO bracket with seeding/byes and auto-advancement
- 3rd place match, final standings + victory ceremony
- Public read-only `/live` page (auto-polls every 15s)
- Mobile-first, Spikeball yellow/black theme

## Tech Stack

| | |
|---|---|
| Framework | Nuxt 4 (TypeScript, `<script setup>`) |
| Styling | Tailwind CSS 4 (CSS-first, `@tailwindcss/vite`) |
| Database | PostgreSQL (Drizzle ORM + drizzle-kit) |
| API | Nitro Server Routes |
| Deploy | Railway |

## Local Development

```bash
# Install dependencies
npm install

# Copy and fill in env vars
cp .env.example .env
# Set DATABASE_URL=postgresql://...

# Generate/run migrations
npm run db:generate
npm run db:migrate

# Start dev server
npm run dev
```

## Deploy on Railway

1. Create a new Railway project and add a **PostgreSQL plugin** — this provides `DATABASE_URL` automatically.
2. Push this repo to GitHub and connect it to Railway.
3. Railway uses `nixpacks.toml` for the build. The start command in `railway.json` runs migrations then starts the server:
   ```
   npm run db:migrate && node .output/server/index.mjs
   ```
4. Optional env vars:
   - `DATABASE_URL` — auto-set by Railway Postgres plugin
   - `NUXT_ADMIN_PASSWORD` — optional admin password gate

## Pages

| Route | Purpose |
|---|---|
| `/` | Tournament list |
| `/tournament/new` | Create tournament |
| `/t/[id]` | Tournament dashboard |
| `/t/[id]/players` | Player entry + draw |
| `/t/[id]/groups` | Group phase |
| `/t/[id]/bracket` | KO bracket |
| `/t/[id]/results` | Final standings |
| `/t/[id]/live` | Public read-only live view |

## Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Start production server (after build)
npm run db:generate  # Generate Drizzle migration
npm run db:migrate   # Run pending migrations
npm run db:studio    # Drizzle Studio (DB GUI)
```
