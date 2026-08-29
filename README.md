# LuxeStay ERP — Hospitality Management System

> Enterprise Property Management System for hotels, resorts, and hospitality businesses.

## Project Structure

```
Project-Hotel/
├── frontend/          # React + Vite + TypeScript SPA
├── backend/           # Supabase migrations, Docker stack, edge functions
├── docs/              # Architecture, setup, and migration documentation
├── .env.example       # Template for environment variables
├── .gitignore
├── README.md          # This file
└── vercel.json        # Vercel deployment config (points to frontend/)
```

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm 9+
- A Supabase project (free at https://supabase.com/dashboard)

### 1. Set up the database (backend)

1. Go to https://supabase.com/dashboard → your project → **SQL Editor**
2. Click **New query**
3. Paste the contents of `backend/supabase/migrations/combined.sql` (or run each file in `backend/supabase/migrations/` in order)
4. Click **Run**

### 2. Configure environment variables

```bash
cp .env.example frontend/.env.local
```

Edit `frontend/.env.local` and fill in your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run the frontend

```bash
cd frontend
pnpm install
pnpm dev
```

Open http://localhost:8080 in your browser.

### 4. Self-hosted backend (optional)

If you want to run Supabase locally instead of using the cloud:

```bash
cd backend
cp ../.env.example .env
# Edit .env with strong passwords/secrets
docker compose up -d
```

The backend will be available at http://localhost:8000 (Kong gateway).

## Deployment

### Vercel (frontend)

1. Push this repo to GitHub
2. Go to https://vercel.com → New Project → import the repo
3. Vercel auto-detects the config from `vercel.json`:
   - **Build command:** `cd frontend && pnpm install && pnpm build`
   - **Output directory:** `frontend/dist`
4. Add environment variables (Settings → Environment Variables):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy

### Self-hosted (full stack)

See `docs/SELF_HOSTING.md` for the complete docker-compose setup.

## Tech Stack

### Frontend (`frontend/`)
- React 18 + TypeScript 5
- Vite 5 (SWC)
- Tailwind CSS 3 + shadcn/ui (Radix primitives)
- TanStack Query 5 (server state)
- React Router 6 (routing)
- react-hook-form + zod (forms/validation)
- Recharts (charts)
- Framer Motion (animations)
- i18next (i18n: English + Nepali)
- Sonner (toasts)
- Lucide (icons)

### Backend (`backend/`)
- Supabase (PostgreSQL + GoTrue + PostgREST + Realtime + Storage)
- 32 SQL migrations with RLS policies
- Edge Functions (Deno)
- Docker Compose for self-hosting (Kong, Caddy, Postgres, GoTrue, Realtime, Storage)

## Documentation

| Doc | Description |
|---|---|
| `docs/ARCHITECTURE.md` | Full technical architecture |
| `docs/LOCAL_SETUP.md` | Local development guide |
| `docs/SELF_HOSTING.md` | Self-hosted deployment guide |
| `docs/REMEDIATION_PLAYBOOK.md` | Code remediation plans |
| `docs/MIGRATION_PROGRESS.md` | Migration status tracker |
| `docs/FINANCE_SERVICE_SPLIT.md` | Finance module refactoring RFC |
| `docs/MIGRATION_REPAIR.md` | Database migration repair workflow |
| `docs/TOAST_MIGRATION.md` | Toast system migration guide |

## Security

- **CSP headers** in `vercel.json` and `index.html`
- **Row-Level Security** on all Supabase tables
- **PKCE auth flow** with 4-hour session timeout
- **Input sanitization** utilities
- **Audit logging** for sensitive operations
- **Security headers:** HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy

## Available Scripts

### Frontend (`cd frontend`)
| Script | Description |
|---|---|
| `pnpm dev` | Start dev server (http://localhost:8080) |
| `pnpm build` | Production build |
| `pnpm preview` | Preview production build |
| `pnpm lint` | Run ESLint |
| `pnpm migrations:list` | List database migrations |
| `pnpm migrations:repair <name>` | Mark a migration as applied |
| `pnpm migrations:rollback <name>` | Roll back a migration |

## License

Proprietary. All rights reserved.
