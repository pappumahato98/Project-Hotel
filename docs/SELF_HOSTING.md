# LuxeStay ERP - Self-Hosting Guide

This guide explains how to run LuxeStay ERP independently of Lovable Cloud using Docker Compose.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LuxeStay ERP                                  │
├─────────────────────────────────────────────────────────────────────┤
│  Frontend (React + Vite)                                             │
│  └── Connects to Supabase via configurable environment variables    │
├─────────────────────────────────────────────────────────────────────┤
│  Backend Options:                                                    │
│  ┌─────────────────────┐  ┌─────────────────────────────────────┐  │
│  │   Lovable Cloud     │  │       Self-Hosted (Docker)          │  │
│  │   (Default)         │  │                                      │  │
│  │   - Auto-managed    │  │   - PostgreSQL 15 + extensions      │  │
│  │   - Zero config     │  │   - GoTrue (Auth)                   │  │
│  │   - Auto-scaling    │  │   - PostgREST (REST API)            │  │
│  │                     │  │   - Realtime (WebSockets)           │  │
│  │                     │  │   - Storage (S3-compatible)         │  │
│  │                     │  │   - Edge Functions (Deno)           │  │
│  │                     │  │   - Kong (API Gateway)              │  │
│  │                     │  │   - Redis (Caching)                 │  │
│  └─────────────────────┘  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Docker & Docker Compose v2.0+
- Node.js 18+ and pnpm
- At least 4GB RAM available for Docker

## Quick Start

### 1. Clone and Setup

```bash
# Clone the repository (if using GitHub export from Lovable)
git clone https://github.com/your-org/luxestay-erp.git
cd luxestay-erp

# Copy environment template
cp .env.example .env.local

# Edit configuration
nano .env.local
```

### 2. Configure Environment

Edit `.env.local` with your settings:

```bash
# Required: Change these for production!
POSTGRES_PASSWORD="your-secure-password-here"
JWT_SECRET="minimum-32-character-secret-key-change-this"

# Frontend connection
VITE_SUPABASE_URL="http://localhost:8000"
VITE_SUPABASE_ANON_KEY="your-anon-key"
VITE_DEPLOYMENT_MODE="selfhosted"
```

### 3. Start Services

```bash
# Start all backend services
docker-compose up -d

# Wait for services to be healthy (about 30-60 seconds)
docker-compose ps

# Check logs if needed
docker-compose logs -f postgres
```

### 4. Run Database Migrations

```bash
# Apply migrations
docker-compose exec postgres psql -U postgres -d postgres -f /docker-entrypoint-initdb.d/001_initial_schema.sql
```

### 5. Start Frontend

```bash
# Install dependencies
pnpm install

# Start dev server (connects to local Supabase)
pnpm dev
```

## Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | React application |
| **API Gateway** | http://localhost:8000 | Kong (main Supabase endpoint) |
| **Supabase Studio** | http://localhost:3001 | Database GUI |
| **REST API** | http://localhost:3000 | PostgREST |
| **Auth** | http://localhost:9999 | GoTrue |
| **Realtime** | http://localhost:4000 | WebSocket server |
| **Storage** | http://localhost:5000 | File storage API |
| **Edge Functions** | http://localhost:5001 | Deno runtime |
| **Mail UI** | http://localhost:9000 | Inbucket (dev emails) |
| **PostgreSQL** | localhost:5432 | Direct database access |
| **Redis** | localhost:6379 | Cache |

## Production Deployment

### Option A: Single Server (Docker Compose)

1. **Server Requirements:**
   - 4+ CPU cores
   - 8GB+ RAM
   - 50GB+ SSD
   - Ubuntu 22.04 LTS recommended

2. **Setup TLS with Caddy (Included):**

The docker-compose stack now includes a pre-configured Caddy service for automatic Let's Encrypt certificates and TLS 1.2+ enforcement.

```bash
# 1. Edit the Caddyfile to set your domain
nano docker/caddy/Caddyfile
# Change {$DOMAIN:localhost} to your actual domain

# 2. Start the stack (Caddy is included)
docker-compose up -d

# Caddy will automatically provision certificates for your domain
# and enforce HTTPS with strict security headers (HSTS, CSP).
```

### Option B: External Reverse Proxy (Nginx/HAProxy)

If you already have a reverse proxy, you can point it to the Kong API Gateway (port 8000) and the Frontend (port 5173). Ensure you implement the security headers defined in our `Caddyfile`.

### Option B: Kubernetes

See `k8s/` directory for Helm charts (coming soon).

### Option C: Managed Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run migrations via Supabase dashboard
3. Update `.env.local` with your Supabase project URL and keys
4. Deploy frontend to Vercel/Netlify/Cloudflare Pages

## Database Backup & Restore

### Backup

```bash
# Full backup
docker-compose exec postgres pg_dump -U postgres postgres > backup_$(date +%Y%m%d).sql

# Data only (no schema)
docker-compose exec postgres pg_dump -U postgres --data-only postgres > data_backup.sql
```

### Restore

```bash
# Restore from backup
cat backup_20240101.sql | docker-compose exec -T postgres psql -U postgres postgres
```

## Monitoring

### Health Checks

```bash
# Check all services
docker-compose ps

# API health
curl http://localhost:8000/rest/v1/

# Auth health
curl http://localhost:8000/auth/v1/health
```

### Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f postgres
docker-compose logs -f auth
docker-compose logs -f rest
```

## Troubleshooting

### Common Issues

**1. Database connection refused**
```bash
# Wait for PostgreSQL to be ready
docker-compose logs postgres | grep "ready to accept connections"
```

**2. Auth not working**
```bash
# Check GoTrue logs
docker-compose logs auth

# Verify JWT_SECRET matches in all services
```

**3. Storage uploads failing**
```bash
# Check storage service
docker-compose logs storage

# Verify storage volume permissions
docker-compose exec storage ls -la /var/lib/storage
```

**4. Realtime not connecting**
```bash
# Check realtime logs
docker-compose logs realtime

# Ensure WebSocket ports are open
```

## Security Checklist

- [x] Change default `POSTGRES_PASSWORD`
- [x] Generate new `JWT_SECRET` (min 32 chars)
- [x] Generate new `ANON_KEY` and `SERVICE_ROLE_KEY`
- [x] Enable SSL/TLS for all public endpoints (via Caddy)
- [x] Configure firewall (only expose 80/443, block 8000/8443 externally)
- [ ] Set up automated backups
- [x] Enable rate limiting in Kong (configured in kong.yml)
- [ ] Configure SMTP for production emails
- [x] Review and tighten RLS policies
- [x] Setup certificate renewal monitoring (via SSL Security Dashboard)

## Switching Between Modes

### From Lovable Cloud to Self-Hosted

1. Export code via GitHub integration in Lovable
2. Clone repository locally
3. Follow Quick Start above
4. Export data from Lovable Cloud (Settings → Cloud → Database → Export)
5. Import data to self-hosted PostgreSQL

### From Self-Hosted to Lovable Cloud

1. Push code to GitHub
2. Create new Lovable project from GitHub
3. Run migrations in Lovable Cloud
4. Import data via Lovable Cloud UI

## Support

- **Lovable Cloud Issues:** [Lovable Discord](https://discord.com/channels/1119885301872070706)
- **Self-Hosted Issues:** Open a GitHub issue
- **Supabase Docs:** [supabase.com/docs](https://supabase.com/docs)
