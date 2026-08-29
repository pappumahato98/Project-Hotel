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

LuxeStay uses a **Digital Blue + Cyan Accent** token system with full light/dark
support, an optional iOS-material layer, and runtime-configurable typography,
radius, blur, and density (driven by the `ui_preferences` table via
`DesignSystemProvider`).

### Brand palette

| Role | Light | Dark |
|---|---|---|
| **Primary (Digital Blue)** | `#0033FF` (`hsl(215 100% 40%)`) | `#3366FF` (`hsl(215 100% 60%)`) |
| **Accent (Cyan)** | `#00B3E6` (`hsl(195 100% 45%)`) | `#4DE6FF` (`hsl(195 100% 60%)`) |
| **Background** | `#F2F7FF` (soft blue tint) | `#000914` (deep midnight) |
| **Foreground** | `#04101F` | `#E6EBF2` |
| **Destructive** | `#E54545` | `#D62727` |
| **Success** | `#1AAB6E` | `#22C98A` |
| **Warning** | `#F5A300` | `#F7AE13` |

Brand ramps (`tailwind.config.ts`):
`digital-blue` 50→950 (`#E5F0FF` → `#000E24`)
`cyan-accent` 50→950 (`#E0FBFF` → `#000A0D`)

### Typography

| Role | Family |
|---|---|
| Display / headings (h1–h3) | `Playfair Display` (serif), `letter-spacing: -0.01em` |
| Body | `Inter` (sans), OpenType `cv02 cv03 cv04 cv11`, antialiased |
| Nepali (locale= np) | `Noto Sans Devanagari` (overrides both body & display) |

Fonts are loaded from Google Fonts and can be overridden at runtime via
`ui_preferences.font_family_sans` / `font_family_display`.

### Layout primitives

- Base radius: `0.75rem` (12px); `lg/md/sm` derived from `--radius`.
- Spacing: 4px base, semantic tokens in `src/lib/spacing.ts` (`xs/sm/md/lg/xl/2xl/3xl/4xl`).
- Container: centered, `2rem` padding, `2xl` breakpoint at `1400px`.
- Standard utility classes in `src/index.css`: `.layout-container`, `.card-grid`,
  `.metric-grid`, `.form-grid`, `.flex-center`, `.space-section`, etc.
- Shadows: `--shadow-glow` / `--shadow-card` / `--shadow-elevated` / `--shadow-float`
  + `.shadow-3d` / `.shadow-3d-blue`.
- Gradients: `--gradient-blue` (135° blue), `--gradient-hero` (blue→cyan→light-blue),
  `--gradient-card`, `--gradient-sidebar`, `--gradient-subtle`.

### Theming & dark mode

- `darkMode: ["class"]` (Tailwind) + `next-themes` with `attribute="class"`,
  `defaultTheme="system"`, `enableSystem`.
- All semantic colors are HSL CSS variables in `src/index.css` (`:root` and `.dark`).
- iOS-material mode (translucent `backdrop-blur` + saturation) is toggled by
  `body.ios-enabled` when `ui_preferences.ios_materials` is on (auto-disabled on
  mobile if `disable_on_mobile` is set).

All styling uses semantic tokens. See `src/index.css` and `tailwind.config.ts`
for the canonical definitions, and `components/theme/DesignSystemProvider.tsx`
for the runtime-injection layer.

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
