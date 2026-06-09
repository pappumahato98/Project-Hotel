import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Meridian Hotel — Property Management System",
  description:
    "Comprehensive Property Management System for Meridian Hotel",
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Meridian Hotel — Property Management System",
    description:
      "Comprehensive Property Management System for Meridian Hotel",
    siteName: "Meridian Hotel",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Meridian Hotel — Property Management System",
    description:
      "Comprehensive Property Management System for Meridian Hotel",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>{children}</Providers>
        </ThemeProvider>
        <Toaster />
        {/* ChunkLoadError auto-recovery: only reloads on actual webpack chunk loading failures */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var reloadCount = parseInt(sessionStorage.getItem('_chunkReload') || '0', 10);
                var lastReloadTime = parseInt(sessionStorage.getItem('_chunkReloadTime') || '0', 10);
                // Prevent reloads more than once every 10 seconds
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
                // Only catch SCRIPT tag errors — these are actual chunk loading failures.
                // Do NOT catch generic "Failed to fetch" from XHR/socket.io/network errors.
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
                // Only catch unhandled rejections that are ACTUALLY webpack chunk errors.
                // Exclude socket.io, fetch, and generic network errors.
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
                // Reset counter on successful load
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
