/**
 * Configuration Error Page.
 *
 * Shown when required environment variables (VITE_SUPABASE_URL,
 * VITE_SUPABASE_ANON_KEY) are missing. Without these, the app cannot
 * connect to Supabase and would otherwise hang on a blank loading screen.
 *
 * This page gives the user a clear, actionable error message instead.
 */

import { AlertTriangle, Settings, ExternalLink } from "lucide-react";

function isMissing(name: string): boolean {
  const value = import.meta.env[name];
  return !value || value === "";
}

export function ConfigErrorPage() {
  const missing: string[] = [];
  if (isMissing("VITE_SUPABASE_URL")) missing.push("VITE_SUPABASE_URL");
  if (isMissing("VITE_SUPABASE_ANON_KEY") && isMissing("VITE_SUPABASE_PUBLISHABLE_KEY")) {
    missing.push("VITE_SUPABASE_ANON_KEY");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-lg w-full space-y-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Configuration Required
            </h1>
            <p className="text-muted-foreground text-sm">
              The app cannot start because required environment variables are
              missing. Without a Supabase backend, the app would hang on a
              blank loading screen.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Settings className="h-4 w-4" />
            Missing Environment Variables
          </div>
          <ul className="space-y-1.5">
            {missing.map((name) => (
              <li
                key={name}
                className="text-sm font-mono text-destructive bg-destructive/5 px-3 py-1.5 rounded border border-destructive/20"
              >
                {name}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-border p-4 space-y-3">
          <h2 className="text-sm font-semibold">How to fix this</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground mb-1">
                Local Development
              </p>
              <p>
                Create a{" "}
                <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                  .env.local
                </code>{" "}
                file in the project root with:
              </p>
              <pre className="mt-2 text-xs font-mono bg-muted p-3 rounded overflow-x-auto">
{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here`}
              </pre>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">
                Vercel Deployment
              </p>
              <p>
                Go to your Vercel project → <strong>Settings</strong> →{" "}
                <strong>Environment Variables</strong> and add the same two
                variables. Then redeploy.
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">
                Self-Hosted (Docker)
              </p>
              <p>
                Copy{" "}
                <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                  .env.example
                </code>{" "}
                to{" "}
                <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                  .env
                </code>{" "}
                and fill in the values. See{" "}
                <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                  docs/SELF_HOSTING.md
                </code>
                .
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ExternalLink className="h-3 w-3" />
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground underline underline-offset-2"
          >
            Get your Supabase credentials →
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Check if the app has the required configuration to run.
 * Returns true if configuration is complete, false if missing.
 */
export function isConfigured(): boolean {
  return !isMissing("VITE_SUPABASE_URL") && !isMissing("VITE_SUPABASE_ANON_KEY");
}
