/**
 * SSL/TLS & Transport Security Utilities
 * 
 * Provides HTTPS enforcement, TLS validation, and security header constants
 * for the Cloud Hotel ERP system.
 */

// ─── Security Header Constants ───────────────────────────────────────────────

export const SECURITY_HEADERS = {
  HSTS: {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
    description: 'Forces HTTPS for 1 year, including subdomains',
    riskLevel: 'critical' as const,
  },
  CSP: {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.supabase.co",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
    description: 'Restricts resource loading to trusted origins',
    riskLevel: 'critical' as const,
  },
  X_CONTENT_TYPE: {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
    description: 'Prevents MIME-type sniffing',
    riskLevel: 'high' as const,
  },
  X_FRAME: {
    key: 'X-Frame-Options',
    value: 'DENY',
    description: 'Prevents framing/clickjacking attacks',
    riskLevel: 'high' as const,
  },
  X_XSS: {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
    description: 'Legacy XSS filter for older browsers',
    riskLevel: 'low' as const,
  },
  REFERRER: {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
    description: 'Controls referrer information leakage',
    riskLevel: 'medium' as const,
  },
  PERMISSIONS: {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
    description: 'Restricts browser feature access',
    riskLevel: 'medium' as const,
  },
} as const;

export type SecurityHeaderKey = keyof typeof SECURITY_HEADERS;
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

// ─── HTTPS Enforcement ───────────────────────────────────────────────────────

/**
 * Determines if the current environment is a production deployment.
 * Returns false for localhost, 127.0.0.1, and [::1] (dev environments).
 */
export function isProductionEnvironment(): boolean {
  const hostname = window.location.hostname;
  const devHosts = ['localhost', '127.0.0.1', '[::1]', '0.0.0.0'];
  return !devHosts.includes(hostname) && !hostname.endsWith('.local');
}

/**
 * Enforces HTTPS by redirecting HTTP requests to HTTPS in production.
 * This should be called BEFORE React renders to prevent any content
 * from being displayed over an insecure connection.
 * 
 * In development (localhost), this is a no-op to allow local HTTP dev servers.
 */
export function enforceHTTPS(): void {
  if (!isProductionEnvironment()) {
    return;
  }

  if (window.location.protocol === 'http:') {
    const secureUrl = window.location.href.replace(/^http:/, 'https:');
    console.warn(
      '[Security] Insecure HTTP connection detected in production. Redirecting to HTTPS...'
    );
    window.location.replace(secureUrl);
  }
}

// ─── TLS Connection Validation ───────────────────────────────────────────────

export interface TLSStatus {
  isSecure: boolean;
  protocol: string;
  hostname: string;
  isProduction: boolean;
  timestamp: string;
}

/**
 * Returns the current TLS connection status.
 * Note: Detailed cipher suite / certificate info is not available from JavaScript
 * for security reasons. This checks the observable protocol-level properties.
 */
export function getTLSStatus(): TLSStatus {
  return {
    isSecure: window.location.protocol === 'https:',
    protocol: window.location.protocol.replace(':', ''),
    hostname: window.location.hostname,
    isProduction: isProductionEnvironment(),
    timestamp: new Date().toISOString(),
  };
}

// ─── Security Headers Audit ──────────────────────────────────────────────────

export interface HeaderAuditResult {
  header: string;
  expected: string;
  actual: string | null;
  passed: boolean;
  riskLevel: RiskLevel;
  description: string;
}

/**
 * Performs a self-referencing fetch to audit the HTTP security headers
 * returned by the server. Returns a detailed audit result for each header.
 * 
 * Note: Some headers (like HSTS) may not be visible via fetch due to
 * browser security restrictions. The audit will mark them as "unable to verify".
 */
export async function auditSecurityHeaders(): Promise<HeaderAuditResult[]> {
  const results: HeaderAuditResult[] = [];

  try {
    const response = await fetch(window.location.href, {
      method: 'HEAD',
      cache: 'no-store',
    });

    for (const [, headerDef] of Object.entries(SECURITY_HEADERS)) {
      const actual = response.headers.get(headerDef.key);
      results.push({
        header: headerDef.key,
        expected: headerDef.value,
        actual,
        passed: actual !== null,
        riskLevel: headerDef.riskLevel,
        description: headerDef.description,
      });
    }
  } catch {
    // If fetch fails, mark all headers as unable to verify
    for (const [, headerDef] of Object.entries(SECURITY_HEADERS)) {
      results.push({
        header: headerDef.key,
        expected: headerDef.value,
        actual: null,
        passed: false,
        riskLevel: headerDef.riskLevel,
        description: headerDef.description,
      });
    }
  }

  return results;
}

/**
 * Calculates a security score (0-100) based on header audit results
 * and TLS status.
 */
export function calculateSecurityScore(
  headers: HeaderAuditResult[],
  tlsStatus: TLSStatus
): number {
  let score = 0;
  const maxScore = 100;

  // TLS/HTTPS: 30 points
  if (tlsStatus.isSecure) {
    score += 30;
  }

  // Security headers: 70 points distributed by risk level
  const weights: Record<RiskLevel, number> = {
    critical: 15,
    high: 12,
    medium: 8,
    low: 5,
  };

  const totalHeaderWeight = headers.reduce(
    (sum, h) => sum + weights[h.riskLevel],
    0
  );

  for (const header of headers) {
    if (header.passed) {
      score += (weights[header.riskLevel] / totalHeaderWeight) * 70;
    }
  }

  return Math.min(Math.round(score), maxScore);
}

/**
 * Returns a human-readable grade based on the security score.
 */
export function getSecurityGrade(score: number): {
  grade: string;
  color: string;
  label: string;
} {
  if (score >= 90) return { grade: 'A+', color: 'text-emerald-500', label: 'Excellent' };
  if (score >= 80) return { grade: 'A', color: 'text-green-500', label: 'Good' };
  if (score >= 70) return { grade: 'B', color: 'text-yellow-500', label: 'Fair' };
  if (score >= 60) return { grade: 'C', color: 'text-orange-500', label: 'Needs Improvement' };
  if (score >= 40) return { grade: 'D', color: 'text-red-400', label: 'Poor' };
  return { grade: 'F', color: 'text-red-600', label: 'Critical' };
}
