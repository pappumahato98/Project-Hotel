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
        {/* ChunkLoadError auto-recovery: reloads page if a chunk fails to load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(e) {
                if (e.target && e.target.tagName === 'SCRIPT' && e.message && e.message.includes('Loading chunk')) {
                  e.preventDefault();
                  console.warn('[ChunkLoadError] Auto-recovering by reloading...');
                  window.location.reload();
                }
              }, true);
              // Also handle unhandled promise rejections from dynamic imports
              window.addEventListener('unhandledrejection', function(e) {
                if (e.reason && e.reason.message && e.reason.message.includes('Loading chunk')) {
                  e.preventDefault();
                  console.warn('[ChunkLoadError] Auto-recovering by reloading...');
                  window.location.reload();
                }
              });
            `,
          }}
        />
      </body>
    </html>
  );
}
