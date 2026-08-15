import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Fixoria — Hotel Management System",
  description: "Cloud-native, multi-tenant SaaS ERP for hotel operations management",
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Zero-hop Supabase Realtime config: injected server-side so the client
            can initialize WebSocket immediately without an /api/config/realtime round-trip.
            This saves ~100-200ms on every realtime initialization. */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <meta name="supabase-url" content={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        )}
        {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && (
          <meta name="supabase-anon-key" content={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY} />
        )}
        {/* Inline script to apply dark mode BEFORE React hydration to prevent flash.
            This runs synchronously before any paint, reading from localStorage. */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var theme = localStorage.getItem('fixoria-theme');
            if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.classList.add('dark');
            }
          } catch (e) {}
        ` }} />
      </head>
      <body
        className={`${inter.variable} antialiased bg-background text-foreground`}
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <Providers>{children}</Providers>
        <Toaster />
        {/* ChunkLoadError auto-recovery */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var reloadCount = parseInt(sessionStorage.getItem('_chunkReload') || '0', 10);
                var lastReloadTime = parseInt(sessionStorage.getItem('_chunkReloadTime') || '0', 10);
                var now = Date.now();
                if (lastReloadTime && (now - lastReloadTime) < 10000) return;

                function safeReload() {
                  if (reloadCount < 3) {
                    sessionStorage.setItem('_chunkReload', String(reloadCount + 1));
                    sessionStorage.setItem('_chunkReloadTime', String(Date.now()));
                    window.location.reload();
                  } else {
                    console.error('[ChunkLoadError] Max reload attempts reached (3). Giving up.');
                    sessionStorage.removeItem('_chunkReload');
                    sessionStorage.removeItem('_chunkReloadTime');
                  }
                }

                window.addEventListener('error', function(e) {
                  if (e.target && e.target.tagName === 'SCRIPT' && e.message && (
                    e.message.includes('Loading chunk') ||
                    e.message.includes('ChunkLoadError')
                  )) {
                    e.preventDefault();
                    console.warn('[ChunkLoadError] Auto-recovering (attempt ' + (reloadCount + 1) + '/3)...');
                    safeReload();
                  }
                }, true);

                window.addEventListener('unhandledrejection', function(e) {
                  var msg = e.reason && (e.reason.message || String(e.reason));
                  if (msg && (
                    msg.includes('Loading chunk') ||
                    msg.includes('ChunkLoadError')
                  ) && !msg.includes('socket.io')) {
                    e.preventDefault();
                    console.warn('[ChunkLoadError] Auto-recovering (attempt ' + (reloadCount + 1) + '/3)...');
                    safeReload();
                  }
                });

                window.addEventListener('load', function() {
                  sessionStorage.removeItem('_chunkReload');
                });
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}