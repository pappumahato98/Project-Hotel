/**
 * OAuth integration — direct Supabase OAuth (replaces Lovable cloud-auth wrapper).
 *
 * Provides the same `lovable.auth.signInWithOAuth(provider, opts)` interface
 * that AuthContext.tsx expects, but delegates directly to Supabase's
 * signInWithOAuth instead of going through @lovable.dev/cloud-auth-js.
 */

import { supabase } from "../supabase/client";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

type OAuthProvider = "google" | "apple" | "github" | "azure";

type OAuthResult = {
  redirected: boolean;
  error: Error | null;
};

export const lovable = {
  auth: {
    /**
     * Sign in with an OAuth provider via Supabase.
     * Redirects the browser to the provider's consent screen.
     */
    signInWithOAuth: async (
      provider: OAuthProvider,
      opts?: SignInOptions
    ): Promise<OAuthResult> => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: opts?.redirect_uri || window.location.origin,
          queryParams: opts?.extraParams,
        },
      });

      if (error) {
        return { redirected: false, error };
      }

      // Supabase's signInWithOAuth redirects the browser automatically.
      return { redirected: true, error: null };
    },
  },
};
