---
Task ID: 1
Agent: Main Agent
Task: Implement header profile dropdown features, remove date/time, add Meridian Hotel branding, relocate property switcher, add auth page

Work Log:
- Read all existing files: header.tsx, app-shell.tsx, store.ts, sidebar-nav.tsx, page.tsx, schema.prisma, auth routes, login page
- Verified AuthUser model exists in schema with proper fields (email, password, role, department, position, etc.)
- Seeded auth users database with 6 demo accounts (admin@meridian.com, gm@meridian.com, ramesh@meridian.com, sunita@meridian.com, deepa@meridian.com, kamal@meridian.com) all using password123
- Updated Zustand store (src/lib/store.ts) with:
  - Auth persistence using zustand/persist (localStorage key: meridian-auth)
  - Property store with activeProperty state and property list (localStorage key: meridian-property)
  - User preferences store (localStorage key: meridian-preferences)
- Fixed page.tsx routing: renders LoginPage component inline when not authenticated (previously redirected to inaccessible /login route)
- Created src/components/auth/login-page.tsx as reusable component
- Updated src/app/login/page.tsx to re-export the shared component
- Rewrote header.tsx with fully functional profile dropdown:
  - Property switcher as DropdownMenuSub with state management
  - My Profile dialog (editable name fields, shows email/role/department)
  - My Preferences dialog (language, currency, timezone, date format, notifications, compact mode, theme)
  - My Shift dialog (shows current shift type, time, status, staff info)
  - Help & Support dialog (getting started, shortcuts, manual, IT contact, version info)
  - My Department navigates to HR module
  - Dark/Light mode toggle
  - Sign Out with toast notification
- Updated sidebar-nav.tsx:
  - Uses activeProperty from store (dynamic property name)
  - Fixed logout handler (removed broken router.push('/login'))
  - Added toast notifications for logout
- Added active property name display in header bar (left side)

Stage Summary:
- Login page is now accessible at the / route (renders inline when not authenticated)
- Auth persists across page refreshes via localStorage
- All profile dropdown options are now functional with proper dialogs
- Property switcher works and persists selection
- "Meridian Hotel" branding is throughout the project
- No date/time display in header (was already removed)
- Zero lint errors, auth API verified working
- Demo credentials: admin@meridian.com / password123 (and 5 other accounts)
