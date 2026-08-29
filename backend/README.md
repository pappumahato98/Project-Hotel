# LuxeStay ERP — Backend

Supabase backend: database migrations, edge functions, and self-hosted Docker stack.

## Structure

```
backend/
├── supabase/
│   ├── config.toml              # Supabase CLI config
│   ├── functions/               # Deno edge functions
│   └── migrations/              # 32 SQL migrations (timestamped, ordered)
│       ├── 20251221133958_*.sql # Initial schema
│       ├── 20260208180000_*.sql # POS tables
│       ├── 20260210000000_*.sql # Night audit
│       ├── 20260413000000_*.sql # Inventory extended
│       ├── ...
│       └── down/                # Rollback migrations (template + incrementally authored)
└── docker-compose.yml           # Self-hosted Supabase stack (11 services)

docker/
├── kong/kong.yml                # Kong API gateway declarative config
└── caddy/Caddyfile              # Caddy reverse proxy (TLS termination)
```

## Quick Start (Cloud Supabase)

1. Go to https://supabase.com/dashboard → your project
2. Click **SQL Editor** → **New query**
3. Paste the contents of each migration file in order (or use the combined file)
4. Click **Run** for each

## Self-Hosted (Docker)

```bash
cd backend
cp ../.env.example .env
# Edit .env with strong passwords and JWT secrets
docker compose up -d
```

This starts 11 services:
- PostgreSQL 15 (with RLS extensions)
- GoTrue (auth)
- PostgREST (auto REST API)
- Realtime (WebSocket subscriptions)
- Storage API (file storage)
- Kong (API gateway)
- Caddy (TLS reverse proxy)
- Edge Runtime (Deno functions)
- Inbucket (email testing)
- Redis (cache)
- imgproxy (image transformations)

## Services & Ports

| Service | Port | Purpose |
|---|---|---|
| Kong (API gateway) | 8000 | All Supabase API calls |
| Postgres | 5432 | Direct DB access |
| Studio | 3001 | Supabase dashboard GUI |
| Inbucket | 9000 | Email testing web UI |
| Storage | 5000 | File storage API |
| Edge Functions | 5001 | Deno functions |

## Migration Management

The frontend package includes migration tools:

```bash
cd ../frontend
pnpm migrations:list                    # List pending vs applied migrations
pnpm migrations:repair <name>           # Mark a migration as applied
pnpm migrations:rollback <name>         # Roll back a migration
```

See `../docs/MIGRATION_REPAIR.md` for the full workflow.

## Security

- **Row-Level Security (RLS)** on all tables — users can only see/modify their own data
- **RBAC** with 4 roles: admin, manager, staff, user
- **Audit logging** for sensitive operations
- **Secure settings** table for sensitive config
- **PKCE auth flow** with configurable session timeout

## Environment Variables (backend/.env)

Required for docker-compose:

| Variable | Description |
|---|---|
| `POSTGRES_PASSWORD` | Strong password for Postgres superuser |
| `JWT_SECRET` | At least 32 characters, used for auth tokens |
| `ANON_KEY` | Supabase anon key (matches JWT_SECRET) |
| `SERVICE_ROLE_KEY` | Supabase service role key (matches JWT_SECRET) |
| `SITE_URL` | Frontend URL (e.g. http://localhost:5173) |
| `API_EXTERNAL_URL` | Backend URL (e.g. http://localhost:8000) |

See `../.env.example` for the full list.
