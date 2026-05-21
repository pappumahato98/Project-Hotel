# LuxeStay ERP

> Enterprise Property Management System for the Hospitality Industry

![Status](https://img.shields.io/badge/status-active-success)
![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/license-proprietary-red)

---

## Overview

LuxeStay is a comprehensive, self-contained ERP system designed for hotels, resorts, and hospitality businesses. It provides end-to-end management of reservations, guests, rooms, billing, housekeeping, and more.

### Key Features

- 🏨 **Reservation Management** - Full booking lifecycle with calendar view
- 👥 **Guest Management** - VIP tracking, profiles, visit history
- 🛏️ **Room Inventory** - Status tracking, types, pricing
- 💰 **Billing & POS** - Invoice generation, payments
- 🧹 **Housekeeping** - Task scheduling, room status
- 🔧 **Engineering** - Maintenance requests, work orders
- 📊 **Reports & Analytics** - Occupancy, revenue metrics
- 👔 **Staff & HR** - Employee records, role management
- 🔐 **Role-Based Access** - Admin, Manager, Staff, User levels

---

## Quick Start

```bash
# Clone and install
git clone <YOUR_GIT_URL>
cd luxestay-erp
pnpm install

# Start development server
pnpm run dev
```

Open `http://localhost:5173` in your browser.

---

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | Full technical architecture, database schema, API reference |
| [Roadmap](docs/ROADMAP.md) | Development phases, planned features, version history |
| [Local Setup](docs/LOCAL_SETUP.md) | Development environment, IDE setup, debugging |
| [Code Audit](docs/CODE_AUDIT.md) | Code quality assessment, refactoring recommendations |

---

## Technology Stack

### Frontend
- **React 18** + TypeScript
- **Vite** build tool
- **Tailwind CSS** + shadcn/ui
- **TanStack Query** for data fetching
- **React Router v6** for routing

### Backend (Lovable Cloud)
- **PostgreSQL** database
- **Row-Level Security** for access control
- **Edge Functions** for serverless logic
- **Realtime Subscriptions** for live updates

---

## Project Structure

```
luxestay-erp/
├── docs/                   # Documentation
├── public/                 # Static assets
├── src/
│   ├── components/         # React components
│   │   ├── dashboard/      # Dashboard widgets
│   │   ├── layout/         # Layout components
│   │   ├── reservations/   # Booking components
│   │   └── ui/             # shadcn/ui components
│   ├── contexts/           # React contexts
│   ├── hooks/              # Custom hooks
│   ├── integrations/       # External integrations
│   ├── lib/                # Utilities
│   └── pages/              # Route components
├── supabase/
│   ├── config.toml         # Backend config
│   ├── functions/          # Edge functions
│   └── migrations/         # Database migrations
└── tailwind.config.ts      # Tailwind config
```

---

## Role-Based Access

| Role | Dashboard | Reservations | Settings | Users |
|------|-----------|--------------|----------|-------|
| Admin | ✅ | ✅ | ✅ | ✅ |
| Manager | ✅ | ✅ | ✅ | ❌ |
| Staff | ✅ | ✅ | ❌ | ❌ |
| User | ✅ | ❌ | ❌ | ❌ |

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm run dev` | Start development server |
| `pnpm run build` | Build for production |
| `pnpm run preview` | Preview production build |
| `pnpm run lint` | Run ESLint |

---

## Environment Variables

The `.env` file is auto-managed by Lovable Cloud:

```env
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=[key]
VITE_SUPABASE_PROJECT_ID=[id]
```

---

## Design System

LuxeStay uses a dark navy theme with gold accents:

- **Primary:** Gold (`hsl(38, 92%, 55%)`)
- **Background:** Dark Navy (`hsl(222, 47%, 6%)`)
- **Fonts:** Playfair Display (headings), Inter (body)

All styling uses semantic tokens. See `src/index.css` for the full design system.

---

## Contributing

1. Follow the [Local Setup](docs/LOCAL_SETUP.md) guide
2. Create a feature branch
3. Make changes following existing patterns
4. Test locally
5. Submit a pull request

---

## Deployment

### Via Lovable
1. Open the project in Lovable
2. Click **Share** → **Publish**

### Custom Domain
1. Go to **Project** → **Settings** → **Domains**
2. Click **Connect Domain**
3. Configure DNS

---

## Support

- 📚 [Lovable Documentation](https://docs.lovable.dev)
- 💬 [Community Discord](https://discord.gg/lovable)

---

*Built with ❤️ using Lovable*
