/**
 * Shared input validation helpers for API routes.
 * Keep validation close to the boundary (API routes) — internal code can trust validated data.
 */

/** E.164-ish phone validation: digits, optional leading +, 7–15 chars */
const PHONE_REGEX = /^\+?\d{7,15}$/;

/** RFC-5322-ish email check (stricter than the old single regex) */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/** US ZIP code: 5 digits or 5+4 */
const ZIP_REGEX = /^\d{5}(-\d{4})?$/;

/** US state abbreviation */
const STATE_REGEX = /^[A-Z]{2}$/;

export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-().]/g, '');
  return PHONE_REGEX.test(cleaned);
}

export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return EMAIL_REGEX.test(email);
}

export function isValidZip(zip: string): boolean {
  return ZIP_REGEX.test(zip);
}

export function isValidState(state: string): boolean {
  return STATE_REGEX.test(state);
}

/**
 * Sanitize a string for safe use: trim, enforce max length, strip control chars.
 * Does NOT escape HTML — use escapeStr() for output contexts.
 */
export function sanitizeString(val: unknown, maxLength = 500): string {
  // eslint-disable-next-line no-control-regex
  return String(val ?? '').trim().slice(0, maxLength).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

/**
 * Validate an object against a simple schema.
 * Returns an error message string or null if valid.
 */
export function validateRequired(data: Record<string, unknown>, fields: string[]): string | null {
  for (const f of fields) {
    const val = data[f];
    if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
      return `${f} is required`;
    }
  }
  return null;
}
