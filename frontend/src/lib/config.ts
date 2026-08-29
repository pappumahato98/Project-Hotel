/**
 * Application Configuration
 * 
 * Provides a unified configuration layer that works with both:
 * - Lovable Cloud (auto-configured)
 * - Self-hosted deployments (docker-compose)
 */

interface AppConfig {
  /** Deployment mode: 'lovable' | 'selfhosted' */
  deploymentMode: 'lovable' | 'selfhosted';
  
  /** Supabase project URL */
  supabaseUrl: string;
  
  /** Supabase anonymous/public key */
  supabaseAnonKey: string;
  
  /** Supabase project ID */
  supabaseProjectId: string;
  
  /** Whether debug logging is enabled */
  debug: boolean;
  
  /** Whether analytics is enabled */
  analyticsEnabled: boolean;
  
  /** Sentry DSN for error tracking */
  sentryDsn: string | null;
}

/**
 * Validates required environment variables
 */
function validateEnv(): void {
  const required = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
  ];
  
  // Fallback check for the old variable name
  const missing = required.filter(key => {
    if (key === 'VITE_SUPABASE_ANON_KEY') {
      return !import.meta.env.VITE_SUPABASE_ANON_KEY && !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    }
    return !import.meta.env[key];
  });
  
  if (missing.length > 0) {
    const errorMsg = `Critical: Missing required environment variables: ${missing.join(', ')}. The application may not function correctly.`;
    console.error(errorMsg);
    if (!import.meta.env.DEV) {
      // In production, we might want to alert the user or show a more prominent error UI
      // For now, logging to console is standard for these variables
    }
  }
}

/**
 * Get application configuration
 */
export function getConfig(): AppConfig {
  validateEnv();
  
  return {
    deploymentMode: (import.meta.env.VITE_DEPLOYMENT_MODE as 'lovable' | 'selfhosted') || 'lovable',
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
    supabaseProjectId: import.meta.env.VITE_SUPABASE_PROJECT_ID || '',
    debug: import.meta.env.VITE_DEBUG === 'true',
    analyticsEnabled: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    sentryDsn: import.meta.env.VITE_SENTRY_DSN || null,
  };
}

/**
 * Check if running in Lovable Cloud
 */
export function isLovableCloud(): boolean {
  return getConfig().deploymentMode === 'lovable';
}

/**
 * Check if running self-hosted
 */
export function isSelfHosted(): boolean {
  return getConfig().deploymentMode === 'selfhosted';
}

/**
 * Get the edge function URL for a given function name
 */
export function getEdgeFunctionUrl(functionName: string): string {
  const config = getConfig();
  
  if (isLovableCloud()) {
    return `${config.supabaseUrl}/functions/v1/${functionName}`;
  }
  
  // Self-hosted: use the configured URL
  return `${config.supabaseUrl}/functions/v1/${functionName}`;
}

/**
 * Get storage bucket URL
 */
export function getStorageUrl(bucket: string, path: string): string {
  const config = getConfig();
  return `${config.supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

export const config = getConfig();
