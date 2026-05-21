# Agent Instructions for LuxeStay ERP

This project is configured with a full Supabase integration, including Database, Auth, Storage, and Realtime.

## Supabase MCP Setup

The project is "MCP-ready". To use the Supabase MCP server with this project:

1. Use the project ID: `rhajtijfptfnezeetcvx`
2. Configure the MCP host with your `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_DB_URL`.
3. The project includes a `mcp.json` configuration file in the root.

## Realtime Synchronization

Realtime is enabled for **ALL** tables in the `public` schema.
- The `supabase_realtime` publication has been updated to include all tables.
- Core hooks in `src/hooks/` (e.g., `useOTAChannels`, `useInventoryItems`, `useStaffSchedules`) include `useEffect` listeners that automatically invalidate TanStack Query caches on changes.

## Storage Buckets

The following storage buckets are configured:
- `avatars`: Publicly readable, owner-writable.
- `property-images`: Publicly readable, staff-writable.
- `lost-found-images`: Publicly readable, staff-writable.

## Authentication

- Standard Supabase Auth is used.
- Google OAuth is configured to use the direct Supabase implementation (not the lovable proxy).
- `AuthContext` includes an `uploadAvatar` helper.

## Channel Manager

The Channel Manager (`src/pages/ChannelManager.tsx`) is connected to the backend and supports realtime updates.
