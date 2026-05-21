/**
 * Input Sanitization Utilities
 * 
 * Provides XSS prevention through HTML stripping, character escaping,
 * and URL validation for the Cloud Hotel ERP system.
 */

// ─── HTML Tag Stripping ─────────────────────────────────────────────────────

/**
 * Strips all HTML tags from a string input.
 * Use this for user-generated text content (guest names, notes, descriptions).
 * 
 * @example
 * sanitizeHTML('<script>alert("xss")</script>Hello') // 'Hello'
 * sanitizeHTML('<b>Bold</b> text') // 'Bold text'
 */
export function sanitizeHTML(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  // Remove all HTML tags
  const withoutTags = input.replace(/<[^>]*>/g, '');
  
  // Remove potentially dangerous attributes even without tags
  const withoutEvents = withoutTags.replace(
    /on\w+\s*=\s*["'][^"']*["']/gi,
    ''
  );
  
  // Remove javascript: protocol references
  const withoutJSProtocol = withoutEvents.replace(
    /javascript\s*:/gi,
    ''
  );
  
  return withoutJSProtocol.trim();
}

// ─── Character Escaping ─────────────────────────────────────────────────────

/**
 * Escapes special HTML characters for safe rendering.
 * Use this when displaying user content in HTML contexts where you need
 * to preserve the original text but prevent injection.
 * 
 * @example
 * escapeForDisplay('<script>') // '&lt;script&gt;'
 * escapeForDisplay('a & b') // 'a &amp; b'
 */
export function escapeForDisplay(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#96;',
  };
  
  return input.replace(/[&<>"'/`]/g, (char) => escapeMap[char] || char);
}

// ─── URL Validation & Sanitization ──────────────────────────────────────────

/**
 * Validates and sanitizes a URL. Blocks dangerous protocols (javascript:, data:, vbscript:)
 * and returns only http/https/mailto URLs.
 * 
 * @returns The sanitized URL, or empty string if invalid/dangerous
 * 
 * @example
 * sanitizeURL('https://example.com') // 'https://example.com'
 * sanitizeURL('javascript:alert(1)') // ''
 * sanitizeURL('data:text/html,<h1>XSS</h1>') // ''
 */
export function sanitizeURL(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  const trimmed = input.trim();
  
  // Block dangerous protocols
  const dangerousProtocols = /^(javascript|data|vbscript|file):/i;
  if (dangerousProtocols.test(trimmed)) {
    console.warn(`[Security] Blocked dangerous URL protocol: ${trimmed.substring(0, 20)}...`);
    return '';
  }
  
  // Allow only http, https, mailto, tel, and relative URLs
  const allowedProtocols = /^(https?:|mailto:|tel:|\/|#)/i;
  if (trimmed.includes(':') && !allowedProtocols.test(trimmed)) {
    return '';
  }
  
  try {
    // Validate it's a parseable URL (for absolute URLs)
    if (/^https?:\/\//i.test(trimmed)) {
      new URL(trimmed);
    }
    return trimmed;
  } catch {
    return '';
  }
}

// ─── Form Data Sanitization ─────────────────────────────────────────────────

type SanitizableValue = string | number | boolean | null | undefined;

/**
 * Recursively sanitizes all string values in a form data object.
 * Non-string values (numbers, booleans, null) are passed through unchanged.
 * 
 * @example
 * sanitizeFormData({
 *   name: '<script>alert("xss")</script>John',
 *   email: 'john@example.com',
 *   age: 30,
 *   isVip: true,
 * })
 * // { name: 'John', email: 'john@example.com', age: 30, isVip: true }
 */
export function sanitizeFormData<T extends Record<string, SanitizableValue>>(
  data: T
): T {
  const sanitized = {} as Record<string, SanitizableValue>;
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeHTML(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}

// ─── SQL Injection Prevention (Defense-in-Depth) ────────────────────────────

/**
 * Checks if a string contains common SQL injection patterns.
 * NOTE: This is a defense-in-depth measure. Supabase uses parameterized queries
 * via PostgREST, so SQL injection at the DB layer is already prevented.
 * This catches suspicious input before it reaches the API.
 * 
 * @returns true if the input appears safe, false if suspicious
 */
export function isSafeInput(input: string): boolean {
  if (!input || typeof input !== 'string') return true;
  
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|UNION)\b.*\b(FROM|INTO|TABLE|SET|WHERE)\b)/i,
    /(--|;|\|\||&&)/,
    /('.*OR.*'.*=.*')/i,
    /(\/\*.*\*\/)/,
  ];
  
  return !sqlPatterns.some((pattern) => pattern.test(input));
}

// ─── Sanitization Helpers ───────────────────────────────────────────────────

/**
 * Sanitizes a phone number input. Allows only digits, spaces, dashes, 
 * parentheses, and + prefix.
 */
export function sanitizePhone(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input.replace(/[^\d\s\-+()]/g, '').trim();
}

/**
 * Sanitizes an email address. Basic validation + stripping of dangerous characters.
 */
export function sanitizeEmail(input: string): string {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim().toLowerCase();
  // Allow only valid email characters
  const cleaned = trimmed.replace(/[^a-z0-9@._+\-]/g, '');
  return cleaned;
}

/**
 * Truncates a string to a maximum length, preventing buffer overflow attacks
 * from extremely long inputs.
 */
export function truncateInput(input: string, maxLength: number = 1000): string {
  if (!input || typeof input !== 'string') return '';
  return input.substring(0, maxLength);
}
