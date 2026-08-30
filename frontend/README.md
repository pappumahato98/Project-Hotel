# LuxeStay ERP — Frontend

React + Vite + TypeScript SPA for the LuxeStay hospitality management system.

## Tech Stack

- **React 18** + TypeScript 5
- **Vite 5** with SWC (fast refresh)
- **Tailwind CSS 3** + shadcn/ui (Radix primitives)
- **TanStack Query 5** for server state
- **React Router 6** for routing
- **react-hook-form** + **zod** for forms/validation
- **Recharts** for charts
- **Framer Motion** for animations
- **i18next** for i18n (English + Nepali)
- **Sonner** for toasts
- **Supabase JS SDK** for backend

## Quick Start

```bash
# From the repo root:
cp .env.example frontend/.env.local
# Edit frontend/.env.local with your Supabase credentials

cd frontend
pnpm install
pnpm dev
```

Open http://localhost:8080.

## Available Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start dev server (http://localhost:8080) |
| `pnpm build` | Production build to `dist/` |
| `pnpm build:dev` | Development build (unminified) |
| `pnpm preview` | Preview the production build locally |
| `pnpm lint` | Run ESLint |
| `pnpm migrations:list` | List database migration status |
| `pnpm migrations:repair <name>` | Mark a migration as applied |
| `pnpm migrations:rollback <name>` | Roll back a migration |
| `pnpm vitest` | Run unit tests |
| `pnpm vitest run` | Run unit tests once (CI mode) |

## Structure

```
frontend/
├── src/
│   ├── components/          # React components (by domain)
│   │   ├── ui/              # shadcn/ui primitives (54 components)
│   │   ├── layout/          # App layout (header, sidebar, etc.)
│   │   ├── dashboard/       # Dashboard widgets
│   │   ├── finance/         # Finance module
│   │   ├── reservations/    # Booking components
│   │   ├── front-desk/      # Front desk operations
│   │   ├── pos/             # Point of sale
│   │   ├── inventory/       # Inventory management
│   │   └── ...              # Other domain folders
│   ├── hooks/               # Custom React hooks (by domain)
│   │   ├── finance/         # Finance view hooks (split pattern)
│   │   ├── inventory/       # Inventory service hooks
│   │   └── *.ts             # Domain hooks
│   ├── lib/                 # Pure utilities (no React)
│   │   ├── finance/         # Finance service modules (pure functions + tests)
│   │   ├── queryKeys.ts     # Central TanStack Query key factory
│   │   ├── utils.ts         # cn(), formatters, date utils
│   │   └── ...
│   ├── contexts/            # React contexts (Auth, Localization, etc.)
│   ├── pages/               # Route-level pages (30 pages)
│   ├── integrations/        # External integrations (Supabase)
│   ├── config/              # Navigation config
│   ├── locales/             # i18n translations (en, np)
│   ├── types/               # TypeScript type definitions
│   ├── test/                # Test setup
│   ├── __tests__/           # Regression tests
│   ├── App.tsx              # Root app (providers + routes)
│   ├── main.tsx             # React entry point
│   └── index.css            # Design tokens + Tailwind layers
├── public/                  # Static assets
├── scripts/                 # Migration tools + codemods
├── index.html               # HTML template
├── vite.config.ts           # Vite config
├── tailwind.config.ts       # Tailwind config
├── tsconfig.json            # TypeScript config
├── eslint.config.js         # ESLint config
└── package.json             # Dependencies + scripts
```

## Architecture Patterns

### Three-layer service split (finance module)

Finance components follow a strict three-layer pattern:

1. **Pure service** (`src/lib/finance/<domain>Service.ts`) — zero React imports, fully unit-tested
2. **Hook** (`src/hooks/finance/use<Domain>View.ts`) — state + data fetching, delegates to service
3. **Component** (`src/components/finance/.../*.tsx`) — presentation only, zero `useMemo`

See `../docs/FINANCE_SERVICE_SPLIT.md` for the RFC and worked examples.

### Central queryKeys factory

All TanStack Query keys are defined in `src/lib/queryKeys.ts`. Hooks use `queryKeys.family.member` instead of inline `["..."]` literals. A regression test at `src/__tests__/no-inline-query-keys.test.ts` enforces this.

### Sonner for toasts

The legacy Radix-based toast system was deleted. Use `import { toast } from "sonner"` directly. A regression test at `src/__tests__/no-legacy-toast.test.ts` prevents re-introduction.

## Design System

- **Primary:** Digital Blue (`#0033FF` light / `#3366FF` dark)
- **Accent:** Cyan (`#00B3E6` light / `#4DE6FF` dark)
- **Fonts:** Playfair Display (headings), Inter (body), Noto Sans Devanagari (Nepali)
- **Radius:** 0.75rem base
- **Dark mode:** via `next-themes` (class strategy)

See `../README.md` and `src/index.css` for the full token system.

## Environment Variables

Required in `frontend/.env.local`:

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL (https://your-project.supabase.co) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key (eyJ... JWT) |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID (optional, for edge function URLs) |
| `VITE_DEPLOYMENT_MODE` | `selfhosted` or `lovable` (legacy) |

See `../.env.example` for the full list.
