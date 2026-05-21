# LuxeStay ERP - Local Development Setup

> Guide for running the application locally with development database

---

## Prerequisites

- **Node.js** 18+ (recommend using [nvm](https://github.com/nvm-sh/nvm))
- **npm** or **bun** package manager
- **Git** for version control

---

## Quick Start

```bash
# 1. Clone the repository
git clone <YOUR_GIT_URL>
cd luxestay-erp

# 2. Install dependencies
npm install
# or
bun install

# 3. Start development server
npm run dev
# or
bun dev
```

The app will be available at `http://localhost:5173`

---

## Environment Configuration

The `.env` file is auto-generated and managed by Lovable Cloud. It contains:

```env
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
VITE_SUPABASE_PROJECT_ID=[project-id]
```

> ⚠️ **Note:** Do not commit `.env` to version control. It's already in `.gitignore`.

---

## Development Workflow

### Starting the Dev Server

```bash
npm run dev
```

Features:
- Hot Module Replacement (HMR)
- TypeScript type checking
- ESLint warnings in console
- Auto-refresh on file changes

### Building for Production

```bash
npm run build
```

Output goes to `/dist` folder.

### Preview Production Build

```bash
npm run preview
```

---

## Project Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

---

## Code Organization

### File Naming Conventions

```
PascalCase.tsx    # React components
camelCase.ts      # Utilities, hooks, types
kebab-case.tsx    # shadcn/ui components
UPPERCASE.md      # Documentation
```

### Import Aliases

The project uses path aliases configured in `vite.config.ts`:

```typescript
import { Button } from "@/components/ui/button";  // src/components/ui/button
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
```

---

## Database Development

### Accessing the Database

The database is managed through Lovable Cloud. To view/manage data:

1. Use the in-app Dev Panel (`/dev`) for debugging
2. Use the Lovable Cloud backend viewer

### Database Migrations

Migrations are stored in `supabase/migrations/` and are auto-managed.

To add a new table or modify schema:
1. Describe the changes to Lovable
2. A migration will be generated and applied
3. TypeScript types are auto-updated in `src/integrations/supabase/types.ts`

### Seeding Test Data

Use the Dev Panel (`/dev`) for:
- Role cleanup utilities
- Audit log viewing
- Debug information

---

## Mock Data for Development

For offline development or testing without backend:

### Create a Mock Data Provider

```typescript
// src/lib/mockData.ts
export const mockRooms = [
  { id: '1', room_number: '101', room_type: 'Standard', status: 'available', price_per_night: 150 },
  { id: '2', room_number: '102', room_type: 'Deluxe', status: 'occupied', price_per_night: 250 },
  // ...
];

export const mockGuests = [
  { id: '1', first_name: 'John', last_name: 'Doe', email: 'john@example.com', is_vip: false },
  // ...
];
```

### Feature Flag for Mock Mode

```typescript
// src/lib/config.ts
export const config = {
  useMockData: import.meta.env.VITE_USE_MOCK === 'true',
};
```

---

## Testing

### Unit Testing (Planned)

```bash
# Install Vitest
npm install -D vitest @testing-library/react @testing-library/jest-dom

# Run tests
npm run test
```

### E2E Testing (Planned)

```bash
# Install Playwright
npm install -D @playwright/test

# Run E2E tests
npm run test:e2e
```

---

## Debugging

### Browser DevTools

1. Open Chrome DevTools (F12)
2. React DevTools extension recommended
3. Network tab for API debugging

### Console Logging

```typescript
// Development-only logging
if (import.meta.env.DEV) {
  console.log('Debug info:', data);
}
```

### React Query DevTools

Already included in development mode. Look for the floating panel.

---

## Common Issues

### "Module not found" errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

### TypeScript errors after schema change

The types file is auto-generated. If you see stale types:
1. Wait for Lovable to regenerate types
2. Restart the dev server

### Authentication issues

1. Check that `.env` has correct Supabase credentials
2. Verify email auto-confirm is enabled
3. Check browser console for auth errors

### Styling not updating

```bash
# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

---

## IDE Setup

### VS Code (Recommended)

**Extensions:**
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Importer
- GitLens

**Settings (`.vscode/settings.json`):**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  }
}
```

---

## Deployment

### Via Lovable

1. Open the Lovable project
2. Click **Share** → **Publish**
3. App is deployed to Lovable's CDN

### Custom Domain

1. Go to **Project** → **Settings** → **Domains**
2. Click **Connect Domain**
3. Follow DNS configuration instructions

---

## Contributing Guidelines

### Code Style

1. Use TypeScript strictly (no `any` unless absolutely necessary)
2. Follow existing patterns in the codebase
3. Use semantic Tailwind tokens (not raw colors)
4. Keep components focused and small

### Commit Messages

```
feat: Add invoice generation
fix: Resolve room status update bug
refactor: Extract reservation hooks
docs: Update local setup guide
```

### Pull Request Process

1. Create feature branch from `main`
2. Make changes with clear commits
3. Test locally
4. Submit PR with description
5. Address review feedback

---

## Support

- **Documentation:** `/docs` folder
- **Issues:** GitHub Issues
- **Lovable Docs:** https://docs.lovable.dev

---

*Last Updated: 2026-01-03*
